import test from 'node:test';
import assert from 'node:assert/strict';
import { paginateResume } from './cvPaginator.ts';
import {
  estimateInternshipHeaderHeightPt,
  paginateEditorialPdfColumns,
} from './editorialPdfPaginator.ts';
import {
  INTERNSHIP_LEFT_ORDER,
  INTERNSHIP_RIGHT_ORDER,
  getTemplateById,
  getTypographyScale,
} from '../data/templates.ts';
import { SAMPLE_INTERNSHIP_RESUME_CV } from '../data/sampleResumes.ts';
import type { Resume } from '../types/resume';

const minimalResume: Resume = {
  id: 'res-1',
  userId: 'user-1',
  title: 'Brief CV',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  personalInfo: {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1 234 567 8900',
  },
  objective: 'Passionate student seeking summer internship.',
  education: [
    {
      id: 'e1',
      institution: 'State University',
      degree: 'B.S. Computer Science',
      startDate: '2022',
      endDate: '2026',
      current: false,
    },
  ],
  skills: [
    {
      id: 's1',
      category: 'Languages',
      skills: ['Python', 'TypeScript', 'Java'],
    },
  ],
  experience: [],
  projects: [],
  achievements: [],
  certifications: [],
};

const fullAcademicResume: Resume = {
  id: 'res-2',
  userId: 'user-1',
  title: 'Dr. Eleanor V. Chen Academic CV',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  personalInfo: {
    fullName: 'Dr. Eleanor V. Chen',
    jobTitle: 'Research Scientist in Machine Learning & Computational Biology',
    email: 'eleanor.chen@stanford.edu',
    phone: '+1 (650) 723-2300',
    city: 'Stanford',
    state: 'CA',
    postalCode: '94305',
    country: 'United States',
    website: 'https://eleanorchen.lab.stanford.edu',
    linkedin: 'linkedin.com/in/eleanor-v-chen',
    github: 'github.com/eleanor-chen-lab',
    otherProfiles: 'Google Scholar: citations?user=EVCHEN99 | ORCID: 0000-0002-1825-0097',
  },
  objective:
    'Dedicated computational biologist and machine learning researcher with 7+ years of experience developing geometric deep learning architectures for macromolecular structure prediction and drug discovery.',
  education: [
    {
      id: 'e1',
      institution: 'Stanford University',
      degree: 'Ph.D. in Computer Science',
      specialization: 'Artificial Intelligence & Computational Biology',
      startDate: '2019',
      endDate: '2024',
      current: false,
      grade: 'GPA: 3.96 / 4.0',
      achievements: 'Dissertation: Equivariant Graph Neural Networks for Protein Dynamics',
    },
    {
      id: 'e2',
      institution: 'Massachusetts Institute of Technology',
      degree: 'B.S. in Electrical Engineering and Computer Science',
      startDate: '2015',
      endDate: '2019',
      current: false,
      grade: 'GPA: 4.9 / 5.0 (Summa Cum Laude)',
    },
  ],
  experience: [
    {
      id: 'exp1',
      company: 'Stanford AI Lab',
      position: 'Postdoctoral Research Fellow',
      startDate: '2024',
      endDate: 'Present',
      current: true,
      highlights: [
        'Lead investigator on an NIH R01 grant exploring diffusion models.',
        'Supervise 4 doctoral candidates and 2 undergraduate researchers.',
        'Authored and deployed open-source library BioEquivariance (1,800+ GitHub stars).',
      ],
    },
    {
      id: 'exp2',
      company: 'DeepMind Technologies',
      position: 'Research Scientist Intern',
      startDate: 'Jun 2022',
      endDate: 'Dec 2022',
      current: false,
      highlights: [
        'Collaborated with AlphaFold core science team on conformational flexibility modeling.',
        'Engineered GPU-accelerated invariant coordinate transforms in JAX, accelerating runtime by 3.2x.',
      ],
    },
  ],
  publications: [
    {
      id: 'pub1',
      type: 'journal',
      title: 'SE(3)-Equivariant Flow Matching for Flexible Protein-Small Molecule Binding',
      authors: 'Chen, E. V., Vance, M., Thorne, S. R., and Alvarez, J.',
      journalOrConference: 'Nature Machine Intelligence',
      year: '2024',
      volume: '6',
      issue: '3',
      pages: '284–296',
      doi: '10.1038/s42256-024-00812-4',
    },
    {
      id: 'pub2',
      type: 'conference',
      title: 'Geometric Diffusion Models for Multi-State Allosteric Protein Prediction',
      authors: 'Chen, E. V., and Vance, M.',
      journalOrConference: 'Thirty-seventh Conference on Neural Information Processing Systems (NeurIPS 2023, Oral)',
      year: '2023',
    },
    {
      id: 'pub3',
      title: 'Methods and Systems for Generative Deep Learning Prediction of Protein-Ligand Complex Conformations',
      authors: 'Chen, E. V., and Vance, M.',
      type: 'patent',
      patentNumber: 'US Patent 11,948,302 B2',
      year: '2024',
    },
  ],
  projects: [
    {
      id: 'p1',
      title: 'BioEquivariance Toolkit',
      startDate: '2022',
      current: true,
      technologies: ['Python', 'PyTorch', 'CUDA'],
      link: 'https://github.com/eleanor-chen-lab/bioequivariance',
      highlights: [
        'Maintained active open-source ecosystem with over 35,000 monthly downloads.',
        'Integrated with PyMOL and ChimeraX plugins.',
      ],
    },
  ],
  skills: [
    {
      id: 's1',
      category: 'Research Foundations',
      skills: ['Geometric Deep Learning', 'Equivariant Neural Networks', 'Diffusion Models'],
    },
    {
      id: 's2',
      category: 'Programming Languages',
      skills: ['Python', 'C/C++', 'CUDA', 'JAX', 'PyTorch'],
    },
  ],
  achievements: [
    {
      id: 'a1',
      title: 'NSF Graduate Research Fellowship (NSF GRFP)',
      issuer: 'National Science Foundation',
      date: '2019 – 2024',
    },
  ],
  leadership: [
    {
      id: 'l1',
      role: 'Workshop Co-Organizer',
      organization: 'ICLR Workshop on ML in Drug Discovery',
      startDate: '2023',
      endDate: '2024',
      highlights: ['Curated technical program reviewing 90+ manuscript submissions.'],
    },
  ],
  references: [
    {
      id: 'r1',
      fullName: 'Prof. Marcus Vance, Ph.D.',
      jobTitle: 'Professor of Computer Science & Genetics',
      organization: 'Stanford University',
      email: 'm.vance@stanford.edu',
    },
  ],
  certifications: [],
};

test('paginateResume correctly leaves short CV on 1 page', () => {
  const pages = paginateResume(minimalResume);
  assert.equal(pages.length, 1);
  assert.equal(pages[0].pageNumber, 1);
  assert(pages[0].blocks.length > 0);
});

test('paginateResume divides rich multi-section academic CV into multiple pages', () => {
  const pages = paginateResume(fullAcademicResume);
  assert(pages.length >= 2, `Expected at least 2 pages, got ${pages.length}`);
  pages.forEach((p, idx) => {
    assert.equal(p.pageNumber, idx + 1);
    assert(p.blocks.length > 0);
  });
});

test('paginateResume never leaves a section header alone at the bottom without its first item', () => {
  const pages = paginateResume(fullAcademicResume);
  pages.forEach((page) => {
    const lastBlock = page.blocks[page.blocks.length - 1];
    assert.equal(
      lastBlock.type.endsWith('_header'),
      false,
      `Page ${page.pageNumber} ends with an orphaned section header: ${lastBlock.type}`
    );
  });
});

test('paginateEditorialPdfColumns packs Template 10 Internship Resume cleanly across 1 and multiple A4 pages', () => {
  const internshipTpl = getTemplateById('internship-resume');
  const scale = getTypographyScale(internshipTpl.defaultCustomization, 'internship-resume');
  const headerHeightPt = estimateInternshipHeaderHeightPt(5, scale);

  const singlePagePlan = paginateEditorialPdfColumns({
    leftSections: INTERNSHIP_LEFT_ORDER,
    rightSections: INTERNSHIP_RIGHT_ORDER,
    resume: SAMPLE_INTERNSHIP_RESUME_CV,
    scale,
    headerHeightPt,
    mode: 'internship',
  });
  assert.equal(singlePagePlan.length, 1);
  assert.ok(singlePagePlan[0].left.some((s) => s.sectionKey === 'education'));
  assert.ok(singlePagePlan[0].left.some((s) => s.sectionKey === 'skills'));
  assert.ok(singlePagePlan[0].right.some((s) => s.sectionKey === 'learning'));
  assert.ok(singlePagePlan[0].right.some((s) => s.sectionKey === 'research'));

  // Overflow scenario: add extensive research/project items and co-curricular items to verify 2+ page A4 flow
  const longInternshipResume: Resume = {
    ...SAMPLE_INTERNSHIP_RESUME_CV,
    researchExperience: Array.from({ length: 8 }, (_, idx) => ({
      id: `re-over-${idx}`,
      title: `Distributed Systems & Applied ML Study #${idx + 1}`,
      institution: 'Institute of Technology',
      role: 'Undergraduate Researcher',
      startDate: 'Jan 2024',
      endDate: 'Dec 2024',
      objectives:
        'Designed and benchmarked multi-node consensus protocols and fault-tolerant telemetry pipelines under simulated packet loss and heterogeneous workloads.',
      findings:
        'Documented latency tradeoffs across asynchronous batching windows and reproducible evaluation harnesses.',
      technologies: ['Python', 'Go', 'Docker', 'PostgreSQL'],
    })),
    achievements: Array.from({ length: 8 }, (_, idx) => ({
      id: `aw-over-${idx}`,
      title: `Annual Engineering Hackathon & Symposium #${idx + 1}`,
      issuer: 'University Computing Society',
      date: '2024',
      role: 'Team Lead',
      description:
        'Led four-member student team building real-time accessibility tooling and presented architecture demos to faculty judges.',
    })),
  };

  const multiPagePlan = paginateEditorialPdfColumns({
    leftSections: INTERNSHIP_LEFT_ORDER,
    rightSections: INTERNSHIP_RIGHT_ORDER,
    resume: longInternshipResume,
    scale,
    headerHeightPt,
    mode: 'internship',
  });
  assert.ok(multiPagePlan.length >= 2, `Expected >= 2 pages, got ${multiPagePlan.length}`);
  multiPagePlan.forEach((p, idx) => {
    assert.equal(p.pageNumber, idx + 1);
    assert.ok(p.left.length > 0 || p.right.length > 0);
  });
});

