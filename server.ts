import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
// AI Studio requires listening on port 3000
const portArgIndex = process.argv.indexOf('--port');
const port = portArgIndex !== -1 && process.argv[portArgIndex + 1]
  ? parseInt(process.argv[portArgIndex + 1], 10)
  : 3000;

// Increase JSON body limit to support base64-encoded PDF uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Helper to get Gemini AI Client instance dynamically
function getGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/* ========================================================================== */
/* ENDPOINT 1: EXTRACT CV FROM PDF (OR RAW TEXT) VIA GEMINI AI                */
/* ========================================================================== */
app.post('/api/gemini/extract-cv', async (req: Request, res: Response) => {
  try {
    const { pdfBase64, mimeType = 'application/pdf', rawText } = req.body;

    if (!pdfBase64 && !rawText) {
      return res.status(400).json({
        error: 'Either pdfBase64 or rawText is required for CV extraction.',
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error:
          'GEMINI_API_KEY is not configured on the server. Please check your AI Studio Secrets configuration.',
      });
    }

    const extractionPrompt = `You are a world-class academic and professional CV information extraction engine.
Carefully analyze the provided resume / CV document and extract ALL real, factual information into the JSON format specified below.

CRITICAL EXTRACTION RULES:
1. Extract ALL factual details exactly as they appear in the document: names, degrees, institutions, companies, locations, dates, titles, citations, and bullet points.
2. DO NOT invent, hallucinate, or fabricate missing details or numbers. If an item or section is not in the CV, leave it as an empty array or empty string.
3. Categorize information cleanly into these 14 sections:
   - personalInfo: fullName, jobTitle, email, phone, streetAddress, city, state, postalCode, country, website, linkedin, github, orcid, nationality, dateOfBirth, otherProfiles (e.g. Google Scholar, ResearchGate)
   - objective: career objective or professional summary paragraph
   - academicInterests: string (research or academic focus areas if stated)
   - careerGoals: string (career aspirations if stated)
   - education: array of { institution, degree, department, specialization, startDate, endDate, current, grade, thesisTitle, dissertationDetails, honors, achievements, location }
   - coursework: string[] (relevant university courses if listed)
   - experience: array of { company, position, location, employmentType, startDate, endDate, current, highlights: string[] }
   - researchExperience: array of { title, institution, supervisor, role, domain, startDate, endDate, current, objectives, methodology, technologies: string[], findings, outcomes, publications }
   - publications: array of { type ('journal' | 'conference' | 'book' | 'research_paper' | 'patent' | 'manuscript' | 'thesis'), title, authors, journalOrConference, publisher, year, volume, issue, pages, doi, patentNumber, location }
   - projects: array of { title, description, startDate, endDate, technologies: string[], link, githubUrl, highlights: string[] }
   - skills: array of { category, skills: string[] } (organize into standard categories like 'Languages', 'Developer Tools', 'Technologies/Frameworks', or 'Programming Languages', 'Web Technologies', 'Cloud & DevOps')
   - achievements: array of { title, issuer, date, category, description } (honors, awards, scholarships, fellowships)
   - leadership: array of { role, organization, startDate, endDate, current, location, highlights: string[] }
   - volunteer: array of { role, organization, startDate, endDate, current, location, highlights: string[] }
   - memberships: array of { organization, membershipType, membershipId, startDate, endDate, current }
   - certifications: array of { name, issuer, issueDate, expirationDate, credentialId, link }
   - languages: array of { language, proficiency }
   - interests: string
   - references: array of { fullName, jobTitle, department, organization, email, phone, relationship }
4. In 'extractionNotes', list:
   - Successfully identified sections
   - Any sections that were completely absent from the uploaded document
   - Any low-confidence, unextracted, or unclassified items that the user should review
5. Return ONLY a valid JSON object matching this structure, with no markdown code fences or backticks.`;

    let contents: any;
    if (pdfBase64) {
      // Strip data URL header if included
      const cleanedBase64 = pdfBase64.replace(/^data:[^;]+;base64,/, '');
      contents = [
        {
          inlineData: {
            mimeType: mimeType || 'application/pdf',
            data: cleanedBase64,
          },
        },
        {
          text: extractionPrompt,
        },
      ];
    } else {
      contents = [
        {
          text: `DOCUMENT CONTENT:\n${rawText}\n\n${extractionPrompt}`,
        },
      ];
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const rawJson = (response.text || '{}').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch (parseErr) {
      // Clean possible markdown wrapper if present
      const stripped = rawJson.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      parsed = JSON.parse(stripped);
    }

    return res.json({
      success: true,
      extractedData: parsed,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/extract-cv:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to extract CV information using Gemini AI.',
    });
  }
});

/* ========================================================================== */
/* ENDPOINT 2: AI WRITING ASSISTANCE ("AI IMPROVE")                           */
/* ========================================================================== */
app.post('/api/gemini/improve-text', async (req: Request, res: Response) => {
  try {
    const { text, sectionType = 'general', context = '', template = 'academic-cv' } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text to improve is required.' });
    }

    const isJakesTemplate = template === 'jakes-resume';
    const isClassicTemplate = template === 'classic-professional';
    const isTwoColumnTemplate = template === 'two-column-professional';
    const isSoftwareDevTemplate = template === 'software-developer';
    const isHarvardTemplate = template === 'harvard-style';
    const isElegantSerifTemplate = template === 'elegant-serif';
    const isModernCorporateTemplate = template === 'modern-corporate';
    const isFresherResumeTemplate = template === 'fresher-resume';
    const isInternshipResumeTemplate = template === 'internship-resume';
    const roleLabel = isJakesTemplate
      ? "technical software engineering resume editor (ATS & Jake's Resume LaTeX specialist)"
      : isSoftwareDevTemplate
      ? 'senior software engineering hiring editor (systems impact, crisp action-led technical bullets specialist)'
      : isHarvardTemplate
      ? 'Harvard Office of Career Services resume editor (traditional action-verb, achievement-oriented bullet specialist)'
      : isElegantSerifTemplate
      ? 'distinguished editorial academic and professional CV editor (Overleaf Modern Simple CV specialist)'
      : isModernCorporateTemplate
      ? 'senior executive & corporate resume editor (Overleaf ModernCV Classic / Banking & Consulting ATS specialist)'
      : isFresherResumeTemplate
      ? 'university career advisor & Overleaf fresher resume editor (students, fresh graduates, and entry-level ATS specialist)'
      : isInternshipResumeTemplate
      ? 'university internship & research career advisor (concise student & entry-level internship resume editor)'
      : isClassicTemplate
      ? 'traditional European/Classic Professional CV editor (clear, crisp, structured career advisor)'
      : isTwoColumnTemplate
      ? 'modern two-column executive and academic CV editor (AltaCV & clarity specialist)'
      : 'academic editor and career communication specialist';
    const defaultContext = isJakesTemplate
      ? "Jake's Resume Technical Software Developer Resume"
      : isSoftwareDevTemplate
      ? 'Software Developer Single-Column Resume'
      : isHarvardTemplate
      ? 'Harvard Style Traditional Single-Column Resume'
      : isElegantSerifTemplate
      ? 'Elegant Serif Academic & Professional Curriculum Vitae'
      : isModernCorporateTemplate
      ? 'Modern Corporate Resume (Overleaf ModernCV Classic)'
      : isFresherResumeTemplate
      ? 'Fresher Resume (Overleaf Students & Fresh Graduates ATS Resume)'
      : isInternshipResumeTemplate
      ? 'Internship Resume (Two-Column Student & Internship Application CV)'
      : isClassicTemplate
      ? 'Classic Professional Multi-Page CV'
      : isTwoColumnTemplate
      ? 'Two Column Professional Multi-Page CV'
      : 'Formal Academic Curriculum Vitae';

    const prompt = `You are a distinguished ${roleLabel}.
Improve the following CV / resume content for section "${sectionType}".

CONTEXT / ROLE:
${context || defaultContext}

ORIGINAL TEXT:
"${text}"

REQUIREMENTS:
1. ${
      isJakesTemplate || isSoftwareDevTemplate
        ? 'Make each bullet crisp, high-impact, action-verb-led, and ATS-friendly (ideal 1-2 lines).'
        : isHarvardTemplate
        ? 'Follow Harvard resume bullet conventions: begin every bullet with a strong action verb, omit first-person pronouns ("I", "my"), describe concrete scope and results clearly, and maintain a formal, traditional single-column resume tone.'
        : isElegantSerifTemplate
        ? 'Use refined editorial, scholarly, and precise professional phrasing appropriate for a classic serif academic/executive CV; keep bullets concise and factual without marketing fluff.'
        : isModernCorporateTemplate
        ? 'Use authoritative corporate, consulting, and ATS-friendly phrasing: concise 1–2 line executive bullets leading with strong action verbs and crisp operational scope without fluff or invented metrics.'
        : isFresherResumeTemplate
        ? 'Use clear, honest, ATS-friendly entry-level and academic phrasing tailored for students and fresh graduates: lead with concrete action verbs, keep lines crisp (1–2 lines), and highlight real tools, coursework, or deliverables without exaggerating or fabricating numbers.'
        : isInternshipResumeTemplate
        ? 'Use crisp, honest, student-appropriate phrasing tailored for internship applications: concise action-verb bullets suitable for compact two-column cards without exaggerating scope or fabricating metrics, ranks, coursework, or outcomes.'
        : isClassicTemplate
        ? 'Keep phrasing crisp, clear, factual, and professional—ideal for a classic structured CV.'
        : isTwoColumnTemplate
        ? 'Keep phrasing sharp, scannable, achievement-oriented, and concise for clean two-column layout readability.'
        : 'Elevate the tone to be formal, scholarly, precise, and impactful.'
    }
2. Use strong action verbs (e.g., "Developed", "Engineered", "Implemented", "Architected", "Investigated", "Orchestrated").
3. Eliminate passive voice, vague wording, repetition, and filler words.
4. ABSOLUTE RULE: DO NOT FABRICATE OR INVENT any metrics, numbers, technologies, qualifications, dates, or results that were not in the original text. Preserve 100% of the underlying facts.
5. Provide:
   - "improved": the best primary refined version.
   - "alternative": a second stylistic variation (e.g. more concise or more results-focused).
   - "explanation": a concise 1-2 sentence explanation of what was improved (grammar, impact, conciseness).

Return a valid JSON object matching:
{
  "improved": "...",
  "alternative": "...",
  "explanation": "..."
}`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const rawJson = (response.text || '{}').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      const stripped = rawJson.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      parsed = JSON.parse(stripped);
    }

    return res.json({
      success: true,
      original: text,
      improved: parsed.improved || text,
      alternative: parsed.alternative || '',
      explanation: parsed.explanation || 'Refined clarity, strong action verbs, and academic phrasing.',
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/improve-text:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to improve text with Gemini AI.',
    });
  }
});

/* ========================================================================== */
/* ENDPOINT 3: "BUILD MY CV WITH AI" CONVERSATIONAL INTERVIEW                 */
/* ========================================================================== */
app.post('/api/gemini/interview-step', async (req: Request, res: Response) => {
  try {
    const {
      conversationHistory = [],
      currentResume = {},
      activeSection = 'personalInfo',
      userMessage,
    } = req.body;

    const isJakesTemplate = currentResume?.template === 'jakes-resume';
    const isClassicTemplate = currentResume?.template === 'classic-professional';
    const isTwoColumnTemplate = currentResume?.template === 'two-column-professional';
    const isSoftwareDevTemplate = currentResume?.template === 'software-developer';
    const isHarvardTemplate = currentResume?.template === 'harvard-style';
    const isElegantSerifTemplate = currentResume?.template === 'elegant-serif';
    const isModernCorporateTemplate = currentResume?.template === 'modern-corporate';
    const isFresherResumeTemplate = currentResume?.template === 'fresher-resume';
    const isInternshipResumeTemplate = currentResume?.template === 'internship-resume';
    const advisorName = isJakesTemplate
      ? 'Technical Resume Advisor'
      : isSoftwareDevTemplate
      ? 'Software Developer Resume Advisor'
      : isHarvardTemplate
      ? 'Harvard Style Resume Advisor'
      : isElegantSerifTemplate
      ? 'Elegant Serif CV Advisor'
      : isModernCorporateTemplate
      ? 'Modern Corporate CV Advisor'
      : isFresherResumeTemplate
      ? 'Fresher Resume Advisor'
      : isInternshipResumeTemplate
      ? 'Internship Resume Advisor'
      : isClassicTemplate
      ? 'Classic Professional CV Advisor'
      : isTwoColumnTemplate
      ? 'Two Column Professional CV Advisor'
      : 'Academic CV Advisor';
    const templateLabel = isJakesTemplate
      ? "Jake's Resume"
      : isSoftwareDevTemplate
      ? 'Software Developer Resume'
      : isHarvardTemplate
      ? 'Harvard Style Resume'
      : isElegantSerifTemplate
      ? 'Elegant Serif CV (Modern Simple CV)'
      : isModernCorporateTemplate
      ? 'Modern Corporate CV (Overleaf ModernCV Classic)'
      : isFresherResumeTemplate
      ? 'Fresher Resume (Overleaf Students & Graduates)'
      : isInternshipResumeTemplate
      ? 'Internship Resume (Two-Column Student Application CV)'
      : isClassicTemplate
      ? 'Classic Professional CV'
      : isTwoColumnTemplate
      ? 'Two Column Professional CV'
      : 'Academic CV';
    const templateIdStr = isJakesTemplate
      ? 'jakes-resume'
      : isSoftwareDevTemplate
      ? 'software-developer'
      : isHarvardTemplate
      ? 'harvard-style'
      : isElegantSerifTemplate
      ? 'elegant-serif'
      : isModernCorporateTemplate
      ? 'modern-corporate'
      : isFresherResumeTemplate
      ? 'fresher-resume'
      : isInternshipResumeTemplate
      ? 'internship-resume'
      : isClassicTemplate
      ? 'classic-professional'
      : isTwoColumnTemplate
      ? 'two-column-professional'
      : 'academic-cv';

    const systemPrompt = `You are "${advisorName}", a warm, encouraging, and deeply knowledgeable career consultant helping the user build their complete ${templateLabel} step-by-step.

ACTIVE TEMPLATE: "${templateIdStr}"
CURRENT SECTION BEING INTERVIEWED: "${activeSection}"

USER'S CURRENT RESUME STATE SUMMARY:
${JSON.stringify({
  targetBackground: currentResume.targetBackground,
  fresherTrack: currentResume.fresherTrack,
  internshipTrack: currentResume.internshipTrack,
  harvardLeadershipFirst: currentResume.harvardLeadershipFirst,
  personalInfo: currentResume.personalInfo,
  personalQuote: currentResume.personalQuote ? 'Present' : 'Empty',
  objective: currentResume.objective ? 'Present' : 'Empty',
  educationCount: currentResume.education?.length || 0,
  studyAbroadCount: currentResume.studyAbroad?.length || 0,
  highSchoolCount: currentResume.highSchool?.length || 0,
  thesis: currentResume.thesis?.title ? 'Present' : 'Empty',
  courseworkCount: currentResume.coursework?.length || 0,
  experienceCount: currentResume.experience?.length || 0,
  researchExperienceCount: currentResume.researchExperience?.length || 0,
  projectsCount: currentResume.projects?.length || 0,
  learningActivitiesCount: currentResume.learningActivities?.length || 0,
  careerInterestsCount: currentResume.careerInterests?.length || 0,
  internshipPreferencesPresent: Boolean(
    currentResume.internshipPreferences?.targetRole ||
      currentResume.internshipPreferences?.preferredIndustry ||
      currentResume.internshipPreferences?.duration ||
      currentResume.internshipPreferences?.workArrangement ||
      currentResume.internshipPreferences?.availabilityDate
  ),
  dailyActivitiesCount: currentResume.dailyActivities?.length || 0,
  publicationsCount: currentResume.publications?.length || 0,
  skillsCategories: (currentResume.skills || []).map((s: any) => s.category),
  labSkillsCount: currentResume.labSkills?.length || 0,
  skillMatrixCount: currentResume.skillMatrix?.length || 0,
  strengthsCount: currentResume.strengths?.length || 0,
  awardsCount: currentResume.achievements?.length || 0,
  leadershipCount: currentResume.leadership?.length || 0,
  volunteerCount: currentResume.volunteer?.length || 0,
  membershipsCount: currentResume.memberships?.length || 0,
  certificationsCount: currentResume.certifications?.length || 0,
  languagesCount: currentResume.languages?.length || 0,
  interestsCount: currentResume.interestItems?.length || (currentResume.interests ? 1 : 0),
  customSectionsCount: currentResume.customSections?.length || 0,
  referencesDisplayMode: currentResume.referencesDisplayMode,
  referencesCount: currentResume.references?.length || 0,
})}

INTERVIEW GUIDELINES:
1. Conduct a friendly, structured interview. Ask one or two focused questions at a time—do not overwhelm the user with a huge list of questions.
2. Probe for DEPTH and specificity matching the active template:
   - For Internship Resume ("internship-resume"): Ask ONE focused question at a time. Determine \`internshipTrack\` ('cs' | 'cybersecurity' | 'ece' | 'research' | 'non-technical') early based on the student's field. Collect:
     * Header (\`personalInfo\`: \`fullName\`, \`jobTitle\` target internship role, \`phone\`, \`email\`, \`linkedin\`, \`github\`, \`website\`, \`city\`, \`country\`) + optional short \`objective\` / \`internshipPreferences\` (\`targetRole\`, \`preferredIndustry\`, \`duration\`, \`workArrangement\`, \`availabilityDate\`, \`preferredTechnologies\`).
     * Education (\`education\` + optional \`highSchool\` items \`{ id, schoolName, board, location, graduationDate, percentage, gpa, coursework, honors }\`).
     * Learning Activities (\`learningActivities: [{ id, title, activityType, subject, provider, instructor, completionDate, certificateId, credentialUrl, skillsAcquired, description }]\`, optional). STRICT ISOLATION: NEVER store \`learningActivities\` inside \`certifications\`.
     * Interests (\`interestItems\` / \`interests\`, optional) vs Career Interests (\`careerInterests: string[]\`, optional). STRICT ISOLATION: NEVER copy \`careerInterests\` into \`skills\`.
     * Research Work & Academic/Capstone Projects (\`researchExperience\` and/or \`projects\`, optional).
     * Co-Curriculars & Awards (\`achievements: [{ id, title, issuer, date, participationType, teamType, role, responsibilities, outcome, rank, url, description }]\`, optional).
     * Skills (\`skills: [{ id, category, skills: string[], proficiency: number | null }]\`). STRICT ANTI-FABRICATION: set \`proficiency\` ONLY to \`1..5\` if the user explicitly states a dot rating; otherwise leave \`proficiency: null\` (which hides dots cleanly). Never auto-assign dots, metrics, coursework, ranks, or interests.
     * Prior Internships / Work Experience (\`experience\`, ALWAYS optional for first-time interns—accept skipping without penalty), plus optional \`certifications\`, \`languages\`, and \`customSections\`.
   - For Fresher Resume ("fresher-resume"): Determine \`fresherTrack\` ('engineering' | 'cs' | 'cybersecurity' | 'non-technical' | 'graduate') early. Prioritize 3-column header contact details (\`personalInfo\`: \`fullName\`, \`jobTitle\` target role, \`phone\`, \`email\`, \`linkedin\`, \`github\`, \`website\`), optional 3–4 short keyword highlights (\`strengths\`) + 1–2 line Impact summary (\`objective\`), Education (optional \`board\`, \`gradingScale\`, \`grade\`, \`coursework\`), Projects (or internships/coursework if non-technical), OPTIONAL Internships / Work Experience (\`skillsLearned\`, \`technologies\` — never penalize if the student has none), Categorized Skills tailored to their \`fresherTrack\`, optional Publications, year-rail Awards (\`rank\`, \`url\`), Certifications (\`skillsCovered\`), Leadership, Volunteer, Languages (never invent unconfirmed proficiency), and Interests. Never fabricate metrics, skills, ranks, or coursework.
   - For Modern Corporate ("modern-corporate"): Determine \`targetBackground\` ('corporate' | 'experienced' | 'student' | 'fresher' | 'technical') early. Collect clean executive summary (\`objective\`), optional opening \`personalQuote\`, categorized work experience (\`company\`, \`position\`, \`department\`, \`category\`, \`location\`, \`startDate\`, \`endDate\`, \`description\`, \`results\`, \`highlights\`, \`technologies\`), user-defined \`strengths\` (Core Competencies — never auto-assigned), 2-column \`skills\`, \`languages\` (never invent unconfirmed proficiency), \`certifications\`, \`achievements\`, \`leadership\`, \`memberships\`, \`interests\`, and \`referencesDisplayMode\`.
   - For Elegant Serif ("elegant-serif"): Determine \`targetBackground\` ('student' | 'fresher' | 'experienced' | 'researcher') early. Support optional \`academicInterests\` and \`careerGoals\` alongside \`objective\`, plus \`researchExperience: [{ id, title, institution, supervisor, role, domain, startDate, endDate, current, objectives, methodology, technologies, findings, outcomes, publications }]\`, \`department\` / \`dissertationDetails\` in Education, and optional \`nationality\` / \`dateOfBirth\` / \`orcid\` in Personal Info. Never invent star ratings, skill bars, or unconfirmed language levels.
   - For Harvard Style ("harvard-style"): Determine \`targetBackground\` ('student' | 'fresher' | 'experienced') early. Do NOT require High School for university upperclassmen or experienced professionals. Support optional \`studyAbroad: [{ id, institution, cityCountry, coursework, startDate, endDate }]\`, optional \`highSchool: [{ id, schoolName, location, graduationDate, gpa, testScores, honors }]\`, optional \`labSkills: string[]\`, and per-degree \`thesisTitle\`, \`coursework: string[]\`, \`honors\`. Encourage strong action verbs in \`experience\` and \`leadership\` bullets without inventing metrics. If user prefers Leadership above Experience, set \`harvardLeadershipFirst: true\`.
   - For Personal Info: name, professional headline/tagline (\`jobTitle\`), street/city/state/ZIP/country address, email, phone, LinkedIn, GitHub, website (plus optional twitter, orcid, gitlab, mastodon for Two Column Professional, or secondaryPhone / dateOfBirth for Classic Professional).
   - For Objective / Summary: professional summary paragraph (\`objective\`) and optional opening personal quote (\`personalQuote\`).
   - For Education: institution name, degree & specialization, start/graduation dates, location, GPA/grade, optional \`thesisTitle\`, optional \`coursework\`, optional \`honors\`, and optional short description (\`description\`).
   - For Master's Thesis ("thesis", Classic Professional optional): \`thesis: { title, supervisors, institution, year, description }\`.
   - For Coursework ("coursework"): relevant university courses as string array \`coursework: string[]\`.
   - For Work Experience: organization/company name, job title, optional \`category\` ('Vocational' | 'Professional' | 'Other'), location, start/end dates, optional short role \`description\`, bullet \`highlights\`, and optional nested \`subHighlights: [{ id, parentIndex, items }]\`.
   - For Projects: project name, optional \`projectType\` ('Personal' | 'Academic' | 'Open Source' | 'Work' | 'Hackathon'), \`institution\` / funding agency, technologies used (\`technologies: string[]\`), optional \`frameworks\`, \`database\`, \`tools\`, \`keyFeatures\`, \`technicalChallenges\`, date, GitHub or live URL (\`githubUrl\`, \`link\`), and technical implementation bullets (\`highlights\`).
   - For A Day of My Life ("daily-life", Two Column Professional optional): \`dailyActivities: [{ id, activity, hours }]\`. Total hours MUST NOT exceed 24 hours; if the user's numbers exceed 24h, politely ask them to adjust; NEVER invent or estimate hours. Accept skipping cleanly.
   - For Publications ("publications"): categorize by \`type\` ('book' | 'journal' | 'conference' | 'research_paper' | 'patent' | 'other'), \`title\`, \`authors\`, \`year\`, \`journalOrConference\` or \`publisher\`, \`doi\`, optional \`url\`.
   - For My Life Philosophy ("philosophy", Two Column Professional optional): \`personalQuote\`.
   - For Most Proud Of / Achievements ("achievements", optional): \`achievements: [{ id, title, issuer, date, description, icon ('trophy'|'heart'|'award'|'star') }]\`.
   - For Certifications ("certifications", optional): \`certifications: [{ id, name, issuer, issueDate, credentialId, link }]\`.
   - For Strengths ("strengths", Two Column Professional): \`strengths: string[]\` — extract ONLY strengths explicitly named by the user; NEVER auto-assign or fabricate strengths.
   - For Languages ("languages"): \`[{ id, language, proficiency, comment }]\` — set \`proficiency\` ONLY if explicitly stated by the user (use \`""\` if unconfirmed; NEVER invent language dot ratings or proficiency labels).
   - For Skills: organize into clear categories (Jake's: \`Languages\`, \`Developer Tools\`, \`Technologies/Frameworks\`; Software Developer: \`Programming Languages\`, \`Developer Tools\`, \`Technologies & Frameworks\`; Harvard Style: \`Technical & Quantitative\`, \`Programming & Data\`, \`Software & Tools\`; Classic Professional: \`Programming Languages\`, \`Operating Systems\`, \`Frameworks\`, \`Databases\`, \`Developer Tools\`).
   - For Laboratory & Research Skills ("lab-skills", Harvard Style optional): \`labSkills: string[]\`.
   - For Skill Matrix ("skill-matrix", Classic Professional): \`skillMatrix: [{ id, category, skill, level, yearsOfExperience, comment }]\` where \`level\` is 1–5 ONLY IF explicitly stated by the user; NEVER invent or auto-assign a 1–5 rating if the user didn't give one (use \`null\` and ask the user to choose 1–5).
   - For Interests ("interests"): \`interestItems: [{ id, name, description }]\` and/or \`interests\` string.
   - For Additional Info / Custom Sections ("custom-sections"): \`customSections: [{ id, title, bullets: string[] }]\`.
   - For References / Referees ("references"): either \`referencesDisplayMode: 'on-request' | 'hidden' | 'detailed'\` and/or \`references: [{ id, fullName, jobTitle, organization, email, phone, address, relationship }]\`.
   - For Leadership / Extracurricular: organization name, role, location, dates, and impact bullets.
3. If the user indicates they want to skip a question, section, or doesn't have experience in that area (e.g. "skip" or "none"), gracefully accept it and transition to the next logical section.
4. NEVER invent or hallucinate metrics, dates, skills, strengths, daily activity hours, language ratings, or titles. Extract ONLY factual details the user provided.
5. In your response JSON, return:
   - "reply": The friendly conversational message to display to the user, with your follow-up question or transition.
   - "structuredUpdates": Any new or updated fields to merge into the resume based on the user's latest answer. Use the matching Resume schema properties.
   - "isSectionCompleted": boolean indicating if enough details for the current section have been collected.
   - "nextSection": string indicating the next section to focus on (or same section if more details needed).
   - "suggestedChips": array of 2 to 4 quick button options.

Return ONLY a valid JSON object.`;

    const formattedMessages = [
      ...conversationHistory.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      {
        role: 'user',
        parts: [{ text: userMessage || 'Hello, please help me build my resume step by step.' }],
      },
    ];

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: formattedMessages,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    const rawJson = (response.text || '{}').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      const stripped = rawJson.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      parsed = JSON.parse(stripped);
    }

    return res.json({
      success: true,
      reply: parsed.reply || 'Could you tell me more about your background?',
      structuredUpdates: parsed.structuredUpdates || {},
      isSectionCompleted: !!parsed.isSectionCompleted,
      nextSection: parsed.nextSection || activeSection,
      suggestedChips: parsed.suggestedChips || ['Skip to next section', 'Add more details'],
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/interview-step:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to process interview step with Gemini AI.',
    });
  }
});

/* ========================================================================== */
/* ENDPOINT 4: INTELLIGENT MISSING INFORMATION & COMPLETENESS AUDIT           */
/* ========================================================================== */
app.post('/api/gemini/analyze-completeness', async (req: Request, res: Response) => {
  try {
    const { resume } = req.body;

    if (!resume) {
      return res.status(400).json({ error: 'Resume data is required for analysis.' });
    }

    const isJakesTemplate = resume?.template === 'jakes-resume';
    const isClassicTemplate = resume?.template === 'classic-professional';
    const isTwoColumnTemplate = resume?.template === 'two-column-professional';
    const isSoftwareDevTemplate = resume?.template === 'software-developer';
    const isHarvardTemplate = resume?.template === 'harvard-style';
    const isElegantSerifTemplate = resume?.template === 'elegant-serif';
    const isModernCorporateTemplate = resume?.template === 'modern-corporate';
    const isFresherResumeTemplate = resume?.template === 'fresher-resume';
    const isInternshipResumeTemplate = resume?.template === 'internship-resume';
    const auditPrompt = isInternshipResumeTemplate
      ? `You are a university internship & career advisor reviewing a Two-Column Internship Resume.
Analyze this Internship Resume across its 10 guided steps:
(header, education, learning [optional Learning Activities], interests [optional Personal/Subject Interests], research [Research Work & Academic Projects], career-interests [optional Career Interests & Target Roles], achievements [optional Co-Curricular & Awards], skills, experience [optional Prior Internships], custom-sections [optional Certifications, Languages & Custom Info]).

INTERNSHIP TRACK: ${resume.internshipTrack || 'cs'}

RESUME DATA:
${JSON.stringify(resume)}

AUDIT CRITERIA:
1. Use exact sectionId values: 'header', 'education', 'learning', 'interests', 'research', 'career-interests', 'achievements', 'skills', 'experience', 'custom-sections'.
2. Evaluate each section status: 'complete' | 'needs_details' | 'optional_empty' | 'needs_review'.
3. NEVER penalize empty optional sections ('learning', 'interests', 'career-interests', 'achievements', 'experience' for first-time interns, or 'custom-sections') or skills with proficiency === null (hidden dots are intentional and valid).
4. Never suggest fabricated metrics, auto-assigned skill dots, invented ranks, invented coursework, or copying careerInterests into skills.
5. Calculate overallScore (0 to 100) and top 3-4 concise, factual recommendations.

Return ONLY a valid JSON object matching:
{
  "overallScore": number,
  "overallStatus": "excellent" | "good" | "in_progress" | "needs_work",
  "topRecommendations": string[],
  "sections": [
    {
      "sectionId": string,
      "name": string,
      "status": "complete" | "needs_details" | "optional_empty" | "needs_review",
      "statusLabel": string,
      "score": number,
      "isOptional": boolean,
      "issues": string[],
      "suggestions": string[]
    }
  ]
}`
      : isFresherResumeTemplate
      ? `You are a university career advisor reviewing an Overleaf-style Fresher Resume (Students & Fresh Graduates).
Analyze this Fresher Resume across its 14 sections:
(header, objective [Highlights & Impact Summary, optional], education, projects [optional for non-technical/graduate], experience [Internships/Work, always optional for freshers], coursework [optional], skills, publications [optional], achievements [Awards & Honors, optional], certifications [optional], leadership [optional], volunteer [optional], languages [optional], additional [Interests, optional]).

FRESHER TRACK: ${resume.fresherTrack || 'cs'}

RESUME DATA:
${JSON.stringify(resume)}

AUDIT CRITERIA:
1. Use exact sectionId values: 'header', 'objective', 'education', 'projects', 'experience', 'coursework', 'skills', 'publications', 'achievements', 'certifications', 'leadership', 'volunteer', 'languages', 'additional'.
2. Evaluate each section status: 'complete' | 'needs_details' | 'optional_empty' | 'needs_review'.
3. NEVER penalize empty 'experience' (internships are optional for freshers) or empty optional sections ('objective', 'coursework', 'publications', 'achievements', 'certifications', 'leadership', 'volunteer', 'languages', 'additional', or 'projects' when fresherTrack is 'non-technical' or 'graduate').
4. Never suggest fabricated metrics, skill bars, proficiency ratings, unconfirmed language levels, or invented ranks/coursework.
5. Calculate overallScore (0 to 100) and top 3-4 concise, factual recommendations.

Return ONLY a valid JSON object matching:
{
  "overallScore": number,
  "overallStatus": "excellent" | "good" | "in_progress" | "needs_work",
  "topRecommendations": string[],
  "sections": [
    {
      "sectionId": string,
      "name": string,
      "status": "complete" | "needs_details" | "optional_empty" | "needs_review",
      "statusLabel": string,
      "score": number,
      "isOptional": boolean,
      "issues": string[],
      "suggestions": string[]
    }
  ]
}`
      : isModernCorporateTemplate
      ? `You are a senior corporate & executive recruiter reviewing a Modern Corporate CV (Overleaf ModernCV Classic style).
Analyze this Modern Corporate CV across its 14 sections:
(header, objective [optional], experience [optional for students/freshers], strengths [Core Competencies, optional], education, skills [optional], projects [optional], certifications [optional], achievements [optional], languages [optional], leadership [optional], memberships [optional], interests [optional], references [optional]).

TARGET BACKGROUND: ${resume.targetBackground || 'corporate'}

RESUME DATA:
${JSON.stringify({ ...resume, personalInfo: { ...resume.personalInfo, photoUrl: resume.personalInfo?.photoUrl ? '[uploaded]' : '' } })}

AUDIT CRITERIA:
1. Use exact sectionId values: 'header', 'objective', 'experience', 'strengths', 'education', 'skills', 'projects', 'certifications', 'achievements', 'languages', 'leadership', 'memberships', 'interests', 'references'.
2. Evaluate each section status: 'complete' | 'needs_details' | 'optional_empty' | 'needs_review'.
3. Do NOT penalize empty optional sections ('objective', 'strengths', 'skills', 'projects', 'certifications', 'achievements', 'languages', 'leadership', 'memberships', 'interests', 'references', or 'experience' when targetBackground is 'student' or 'fresher').
4. Never suggest fabricated metrics, skill bars, proficiency dots, or unconfirmed language levels.
5. Calculate overallScore (0 to 100) and top 3-4 concise, factual recommendations.

Return ONLY a valid JSON object matching:
{
  "overallScore": number,
  "overallStatus": "excellent" | "good" | "in_progress" | "needs_work",
  "topRecommendations": string[],
  "sections": [
    {
      "sectionId": string,
      "name": string,
      "status": "complete" | "needs_details" | "optional_empty" | "needs_review",
      "statusLabel": string,
      "score": number,
      "isOptional": boolean,
      "issues": string[],
      "suggestions": string[]
    }
  ]
}`
      : isElegantSerifTemplate
      ? `You are a distinguished academic and editorial CV reviewer evaluating an Elegant Serif CV (Modern Simple CV style).
Analyze this Elegant Serif CV across its 15 sections:
(header, objective [optional], education, experience [optional for students/freshers], research [optional], projects [optional], publications [optional], achievements [optional], skills, languages [optional], certifications [optional], leadership [optional], memberships [optional], interests [optional], references [optional]).

TARGET BACKGROUND: ${resume.targetBackground || 'researcher'}

RESUME DATA:
${JSON.stringify({ ...resume, personalInfo: { ...resume.personalInfo, photoUrl: resume.personalInfo?.photoUrl ? '[uploaded]' : '' } })}

AUDIT CRITERIA:
1. Use exact sectionId values: 'header', 'objective', 'education', 'experience', 'research', 'projects', 'publications', 'achievements', 'skills', 'languages', 'certifications', 'leadership', 'memberships', 'interests', 'references'.
2. Evaluate each section status: 'complete' | 'needs_details' | 'optional_empty' | 'needs_review'.
3. Do NOT penalize empty optional sections ('objective', 'research', 'projects', 'publications', 'achievements', 'languages', 'certifications', 'leadership', 'memberships', 'interests', 'references', or 'experience' unless targetBackground === 'experienced').
4. Never suggest fabricated metrics, skill bars, star ratings, or unconfirmed language proficiencies.
5. Calculate overallScore (0 to 100) and top 3-4 concise, factual recommendations.

Return ONLY a valid JSON object matching:
{
  "overallScore": number,
  "overallStatus": "excellent" | "good" | "in_progress" | "needs_work",
  "topRecommendations": string[],
  "sections": [
    {
      "sectionId": string,
      "name": string,
      "status": "complete" | "needs_details" | "optional_empty" | "needs_review",
      "statusLabel": string,
      "score": number,
      "isOptional": boolean,
      "issues": string[],
      "suggestions": string[]
    }
  ]
}`
      : isHarvardTemplate
      ? `You are a Harvard Office of Career Services advisor reviewing a Harvard Style Resume.
Analyze this Harvard Style Resume across its 11 sections:
(header, education, study-abroad [optional], high-school [optional], experience [optional for students/freshers], leadership [optional], skills, languages [optional], lab-skills [optional], interests [optional], custom-sections [optional additional info]).

TARGET BACKGROUND: ${resume.targetBackground || 'student'}

RESUME DATA:
${JSON.stringify(resume)}

AUDIT CRITERIA:
1. Use the exact sectionId values: 'header', 'education', 'study-abroad', 'high-school', 'experience', 'leadership', 'skills', 'languages', 'lab-skills', 'interests', 'custom-sections'.
2. Evaluate each section status: 'complete' | 'needs_details' | 'optional_empty' | 'needs_review'.
3. Do NOT penalize empty optional sections ('study-abroad', 'high-school', 'lab-skills', 'interests', 'custom-sections', or 'experience' when targetBackground is 'student' or 'fresher').
4. Verify bullets start with strong action verbs and avoid fabricated metrics.
5. Calculate overallScore (0 to 100) and top 3-4 concise, factual recommendations.

Return ONLY a valid JSON object matching:
{
  "overallScore": number,
  "overallStatus": "excellent" | "good" | "in_progress" | "needs_work",
  "topRecommendations": string[],
  "sections": [
    {
      "sectionId": string,
      "name": string,
      "status": "complete" | "needs_details" | "optional_empty" | "needs_review",
      "statusLabel": string,
      "score": number,
      "isOptional": boolean,
      "issues": string[],
      "suggestions": string[]
    }
  ]
}`
      : isJakesTemplate
      ? `You are a senior software engineering hiring manager and technical resume reviewer.
Analyze this Jake's Resume layout for thoroughness, clarity, and completeness across its sections:
(personalInfo, education, coursework [optional], experience, projects [optional], skills, leadership [optional]).

RESUME DATA:
${JSON.stringify(resume)}

AUDIT CRITERIA:
1. Evaluate each section status: 'complete' | 'needs_details' | 'optional_empty' | 'needs_review'.
2. Mark optional sections (coursework, projects, leadership) as 'optional_empty' if unprovided, rather than penalizing the overall score.
3. Calculate overallScore (0 to 100) and top 3-4 concrete, non-fabricated recommendations.

Return ONLY a valid JSON object matching:
{
  "overallScore": number,
  "overallStatus": "excellent" | "good" | "in_progress" | "needs_work",
  "topRecommendations": string[],
  "sections": [
    {
      "sectionId": string,
      "name": string,
      "status": "complete" | "needs_details" | "optional_empty" | "needs_review",
      "statusLabel": string,
      "score": number,
      "isOptional": boolean,
      "issues": string[],
      "suggestions": string[]
    }
  ]
}`
      : isSoftwareDevTemplate
      ? `You are a senior staff software engineer and technical resume evaluator reviewing a Software Developer Resume.
Analyze this Software Developer Resume across its sections:
(header, education, experience [optional for students], projects [optional], coursework [optional], programming-languages [optional], developer-tools [optional], technologies-frameworks [optional], leadership [optional], certifications [optional], awards [optional]).

RESUME DATA:
${JSON.stringify(resume)}

AUDIT CRITERIA:
1. Use the exact sectionId values: 'header', 'education', 'experience', 'projects', 'coursework', 'programming-languages', 'developer-tools', 'technologies-frameworks', 'leadership', 'certifications', 'awards'.
2. Evaluate each section status: 'complete' | 'needs_details' | 'optional_empty' | 'needs_review'.
3. Do NOT penalize empty optional sections (coursework, leadership, certifications, awards, or experience for students with projects). Empty ADDITIONAL subsections are omitted cleanly from the resume.
4. Check technical clarity, concrete implementation details in Projects/Experience, and valid contact links without fabricating metrics.
5. Calculate overallScore (0 to 100) and top 3-4 concise recommendations.

Return ONLY a valid JSON object matching:
{
  "overallScore": number,
  "overallStatus": "excellent" | "good" | "in_progress" | "needs_work",
  "topRecommendations": string[],
  "sections": [
    {
      "sectionId": string,
      "name": string,
      "status": "complete" | "needs_details" | "optional_empty" | "needs_review",
      "statusLabel": string,
      "score": number,
      "isOptional": boolean,
      "issues": string[],
      "suggestions": string[]
    }
  ]
}`
      : isTwoColumnTemplate
      ? `You are a senior executive & academic career advisor reviewing a Two Column Professional CV (AltaCV style).
Analyze this Two Column Professional CV across its 12 sections:
(header, experience [optional], projects [optional], daily-life [optional], publications [optional], philosophy [optional], achievements [optional], strengths [optional], languages [optional], education, references [optional], custom-sections [optional]).

RESUME DATA:
${JSON.stringify({ ...resume, personalInfo: { ...resume.personalInfo, photoUrl: resume.personalInfo?.photoUrl ? '[uploaded]' : '' } })}

AUDIT CRITERIA:
1. Use the exact sectionId values: 'header', 'experience', 'projects', 'daily-life', 'publications', 'philosophy', 'achievements', 'strengths', 'languages', 'education', 'references', 'custom-sections'.
2. Evaluate each section status: 'complete' | 'needs_details' | 'optional_empty' | 'needs_review'.
3. Do NOT penalize empty optional sections (experience for students/freshers, daily-life, philosophy, achievements, publications, references, custom-sections).
4. If dailyActivities sums to more than 24 hours, flag 'daily-life' as 'needs_review'.
5. Calculate overallScore (0 to 100) and top 3-4 non-fabricated recommendations.

Return ONLY a valid JSON object matching:
{
  "overallScore": number,
  "overallStatus": "excellent" | "good" | "in_progress" | "needs_work",
  "topRecommendations": string[],
  "sections": [
    {
      "sectionId": string,
      "name": string,
      "status": "complete" | "needs_details" | "optional_empty" | "needs_review",
      "statusLabel": string,
      "score": number,
      "isOptional": boolean,
      "issues": string[],
      "suggestions": string[]
    }
  ]
}`
      : isClassicTemplate
      ? `You are a senior international career consultant and Classic Professional CV reviewer.
Analyze this Classic Professional CV across its 11 sections:
(header, objective, education, thesis [optional], experience [optional], languages [optional], skills, skill-matrix [optional], interests [optional], custom-sections [optional], references [optional]).

RESUME DATA:
${JSON.stringify({ ...resume, personalInfo: { ...resume.personalInfo, photoUrl: resume.personalInfo?.photoUrl ? '[uploaded]' : '' } })}

AUDIT CRITERIA:
1. Use the exact sectionId values: 'header', 'objective', 'education', 'thesis', 'experience', 'languages', 'skills', 'skill-matrix', 'interests', 'custom-sections', 'references'.
2. Evaluate each section status: 'complete' | 'needs_details' | 'optional_empty' | 'needs_review'.
3. Do NOT penalize empty optional sections (thesis, experience for freshers, skill-matrix, interests, custom-sections, references).
4. If skillMatrix has rows with level === null, flag as 'needs_details' asking the user to pick a 1-5 rating manually.
5. Calculate overallScore (0 to 100) and top 3-4 concrete recommendations.

Return ONLY a valid JSON object matching:
{
  "overallScore": number,
  "overallStatus": "excellent" | "good" | "in_progress" | "needs_work",
  "topRecommendations": string[],
  "sections": [
    {
      "sectionId": string,
      "name": string,
      "status": "complete" | "needs_details" | "optional_empty" | "needs_review",
      "statusLabel": string,
      "score": number,
      "isOptional": boolean,
      "issues": string[],
      "suggestions": string[]
    }
  ]
}`
      : `You are a senior academic hiring committee chair and CV evaluator.
Analyze this academic CV for thoroughness, completeness, and missing high-value details across all 14 sections.

RESUME DATA:
${JSON.stringify(resume)}

AUDIT CRITERIA:
1. For each of the 14 sections (personalInfo, objective, education, experience, publications, projects, skills, achievements, leadership, volunteer, memberships, certifications, languages, references):
   - Evaluate status: 'complete' | 'needs_details' | 'optional_empty' | 'needs_review'
   - Mark academic-optional sections (e.g. patents/publications for a student, volunteer service, references) as 'optional_empty' if unprovided, rather than penalizing the overall CV score.
   - List specific missing elements (e.g. "Missing GPA or honors in degree", "Experience entry missing quantifiable achievements or technologies used", "Publications missing DOI or year").
   - Provide concrete, actionable advice.
2. Calculate an overall completeness score (0 to 100) and identify the top 3-4 most impactful recommendations.

Return a valid JSON object matching:
{
  "overallScore": number,
  "overallStatus": "excellent" | "good" | "in_progress" | "needs_work",
  "topRecommendations": string[],
  "sections": [
    {
      "sectionId": string,
      "name": string,
      "status": "complete" | "needs_details" | "optional_empty" | "needs_review",
      "statusLabel": string,
      "score": number,
      "isOptional": boolean,
      "issues": string[],
      "suggestions": string[]
    }
  ]
}`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: auditPrompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const rawJson = (response.text || '{}').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      const stripped = rawJson.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      parsed = JSON.parse(stripped);
    }

    return res.json({
      success: true,
      report: parsed,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/analyze-completeness:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to analyze completeness with Gemini AI.',
    });
  }
});

/* ========================================================================== */
/* VITE MIDDLEWARE & STATIC ASSET SERVING                                      */
/* ========================================================================== */
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
