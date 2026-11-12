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
   - personalInfo: fullName, jobTitle, email, phone, city, state, postalCode, country, website, linkedin, github, otherProfiles (e.g. ORCID, Google Scholar, ResearchGate)
   - objective: career objective or professional summary paragraph
   - education: array of { institution, degree, specialization, startDate, endDate, current, grade, achievements, location }
   - experience: array of { company, position, location, employmentType, startDate, endDate, current, highlights: string[] }
   - publications: array of { type ('journal' | 'conference' | 'patent' | 'manuscript' | 'thesis'), title, authors, journalOrConference, publisher, year, volume, issue, pages, doi, patentNumber, location }
   - projects: array of { title, description, startDate, endDate, technologies: string[], link, highlights: string[] }
   - skills: array of { category, skills: string[] } (organize into standard categories like 'Programming Languages', 'Web Technologies', 'Database Systems', 'Data Science & Machine Learning', 'Cloud & DevOps', 'Research & Tools')
   - achievements: array of { title, issuer, date, description } (honors, awards, scholarships, fellowships)
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
      model: 'gemini-3.8-flash',
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
    const { text, sectionType = 'general', context = '' } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text to improve is required.' });
    }

    const prompt = `You are a distinguished academic editor and career communication specialist.
Improve the following CV / resume content for section "${sectionType}".

CONTEXT / ROLE:
${context || 'Formal Academic Curriculum Vitae'}

ORIGINAL TEXT:
"${text}"

REQUIREMENTS:
1. Elevate the tone to be formal, scholarly, precise, and impactful.
2. Use strong action verbs (e.g., "Engineered", "Investigated", "Pioneered", "Synthesized", "Orchestrated", "Published").
3. Eliminate passive voice, vague wording, repetition, and filler words.
4. ABSOLUTE RULE: DO NOT FABRICATE OR INVENT any metrics, numbers, technologies, qualifications, dates, or results that were not in the original text. Preserve 100% of the underlying facts.
5. Provide:
   - "improved": the best primary refined version.
   - "alternative": a second stylistic variation (e.g. more concise or more research-focused).
   - "explanation": a concise 1-2 sentence explanation of what was improved (grammar, impact, conciseness).

Return a valid JSON object matching:
{
  "improved": "...",
  "alternative": "...",
  "explanation": "..."
}`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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

    const systemPrompt = `You are "Academic CV Advisor", a warm, encouraging, and deeply knowledgeable career consultant helping the user build their complete Academic CV step-by-step.

CURRENT SECTION BEING INTERVIEWED: "${activeSection}"

USER'S CURRENT RESUME STATE SUMMARY:
${JSON.stringify({
  personalInfo: currentResume.personalInfo,
  objective: currentResume.objective ? 'Present' : 'Empty',
  educationCount: currentResume.education?.length || 0,
  experienceCount: currentResume.experience?.length || 0,
  projectsCount: currentResume.projects?.length || 0,
  publicationsCount: currentResume.publications?.length || 0,
  skillsCategories: (currentResume.skills || []).map((s: any) => s.category),
  awardsCount: currentResume.achievements?.length || 0,
  leadershipCount: currentResume.leadership?.length || 0,
  volunteerCount: currentResume.volunteer?.length || 0,
  membershipsCount: currentResume.memberships?.length || 0,
  certificationsCount: currentResume.certifications?.length || 0,
  languagesCount: currentResume.languages?.length || 0,
  referencesCount: currentResume.references?.length || 0,
})}

INTERVIEW GUIDELINES:
1. Conduct a friendly, structured interview. Ask one or two focused questions at a time—do not overwhelm the user with a huge list of questions.
2. Probe for DEPTH and academic specificity:
   - For Work Experience: ask for organization name, job title, start/end dates, specific duties, technologies/tools used, key challenges, quantifiable results, or recognitions.
   - For Projects: ask for project name, purpose/problem solved, technologies used, individual contributions, outcomes, and GitHub or demo links.
   - For Education: ask for institution name, degree & specialization, duration/graduation year, CGPA/percentage, thesis title, advisors, and honors.
   - For Publications: ask for authors, publication title, journal/conference name, year, volume/issue, and DOI.
   - For Skills: organize into categories (Programming, Tools, ML/Data, Cloud, Research).
3. If the user indicates they want to skip a question, section, or doesn't have experience in that area (e.g. "I don't have publications" or "skip"), gracefully accept it, acknowledge it, and seamlessly transition to the next logical section.
4. NEVER invent or hallucinate metrics, dates, or titles. Extract only what the user has provided.
5. In your response JSON, return:
   - "reply": The friendly conversational message to display to the user, with your follow-up question or transition.
   - "structuredUpdates": Any new or updated fields to merge into the resume based on the user's latest answer. Use the matching Resume schema properties.
   - "isSectionCompleted": boolean indicating if enough details for the current section have been collected.
   - "nextSection": string indicating the next section to focus on (or same section if more details needed).
   - "suggestedChips": array of 2 to 4 quick button options (e.g. ["Skip this section", "Add another project", "Next: Education", "That is all"]).

Return ONLY a valid JSON object.`;

    const formattedMessages = [
      ...conversationHistory.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      {
        role: 'user',
        parts: [{ text: userMessage || 'Hello, please help me build my CV step by step.' }],
      },
    ];

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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

    const auditPrompt = `You are a senior academic hiring committee chair and CV evaluator.
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
      model: 'gemini-3.8-flash',
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
