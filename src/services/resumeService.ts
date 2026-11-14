import {
  auth,
  db,
  doc,
  collection,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  handleFirestoreError,
  OperationType,
} from './firebase';
import type { Resume } from '../types/resume';
import {
  SAMPLE_ACADEMIC_CV,
  SAMPLE_CLASSIC_PROFESSIONAL_CV,
  SAMPLE_ELEGANT_SERIF_CV,
  SAMPLE_EXPERIENCED_CV,
  SAMPLE_FRESHER_CV,
  SAMPLE_FRESHER_RESUME_CV,
  SAMPLE_HARVARD_CV,
  SAMPLE_INTERNSHIP_RESUME_CV,
  SAMPLE_JAKES_CV,
  SAMPLE_MODERN_CORPORATE_CV,
  SAMPLE_SOFTWARE_DEVELOPER_CV,
  SAMPLE_STUDENT_CV,
  SAMPLE_TWO_COLUMN_CV,
  BLANK_ACADEMIC_CV,
} from '../data/sampleResumes';

const LOCAL_STORAGE_KEY_PREFIX = 'minimalist_resumes_';

function getLocalResumes(userId: string): Resume[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalResumes(userId: string, resumes: Resume[]): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(resumes));
  } catch (e) {
    console.error('Failed to save resumes locally', e);
  }
}

export async function getUserResumes(userId: string): Promise<Resume[]> {
  const collectionPath = `users/${userId}/resumes`;
  const local = getLocalResumes(userId);

  // If unauthenticated or demo user, directly return local storage
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return local;
  }

  try {
    const colRef = collection(db, 'users', userId, 'resumes');
    const snap = await getDocs(colRef);
    const list: Resume[] = [];
    snap.forEach((d) => {
      list.push(d.data() as Resume);
    });

    // Sort by updatedAt descending
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    // Also sync local cache
    saveLocalResumes(userId, list);
    return list;
  } catch (error) {
    console.warn('Could not fetch from Firestore, checking local storage cache...', error);
    if (local.length > 0) return local;

    try {
      handleFirestoreError(error, OperationType.LIST, collectionPath);
    } catch {
      return local;
    }
    return [];
  }
}

export async function getResume(userId: string, resumeId: string): Promise<Resume | null> {
  const docPath = `users/${userId}/resumes/${resumeId}`;
  const localList = getLocalResumes(userId);
  const foundLocal = localList.find((r) => r.id === resumeId);

  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return foundLocal || null;
  }

  try {
    const docRef = doc(db, 'users', userId, 'resumes', resumeId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Resume;
    }
    return foundLocal || null;
  } catch (error) {
    console.warn('Could not fetch resume from Firestore, using local cache', error);
    if (foundLocal) return foundLocal;

    try {
      handleFirestoreError(error, OperationType.GET, docPath);
    } catch {
      return null;
    }
    return null;
  }
}

export async function saveResume(userId: string, resume: Resume): Promise<void> {
  const docPath = `users/${userId}/resumes/${resume.id}`;
  const now = new Date().toISOString();
  const updatedResume: Resume = {
    ...resume,
    userId,
    updatedAt: now,
    createdAt: resume.createdAt || now,
  };

  // Always update local cache first
  const currentLocal = getLocalResumes(userId);
  const existingIdx = currentLocal.findIndex((r) => r.id === resume.id);
  if (existingIdx >= 0) {
    currentLocal[existingIdx] = updatedResume;
  } else {
    currentLocal.unshift(updatedResume);
  }
  saveLocalResumes(userId, currentLocal);

  // If user is authenticated with Firebase, persist to Firestore
  if (auth.currentUser && auth.currentUser.uid === userId) {
    try {
      const docRef = doc(db, 'users', userId, 'resumes', resume.id);
      await setDoc(docRef, updatedResume);
    } catch (error) {
      console.error('Error saving resume to Firestore:', error);
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  }
}

export async function deleteResume(userId: string, resumeId: string): Promise<void> {
  const docPath = `users/${userId}/resumes/${resumeId}`;

  // Remove from local cache
  const currentLocal = getLocalResumes(userId);
  const filtered = currentLocal.filter((r) => r.id !== resumeId);
  saveLocalResumes(userId, filtered);

  if (auth.currentUser && auth.currentUser.uid === userId) {
    try {
      const docRef = doc(db, 'users', userId, 'resumes', resumeId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting resume from Firestore:', error);
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  }
}
export type TemplateProfileType =
  | 'academic'
  | 'classic'
  | 'jakes'
  | 'two-column'
  | 'software-developer'
  | 'harvard'
  | 'elegant-serif'
  | 'modern-corporate'
  | 'fresher-resume'
  | 'internship-resume'
  | 'experienced'
  | 'fresher'
  | 'student'
  | 'blank'
  | 'sample';

export async function createNewResume(
  userId: string,
  title?: string,
  templateType: TemplateProfileType = 'academic',
  userDisplayName?: string,
  userEmail?: string
): Promise<Resume> {
  const newId = `cv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  let base: Omit<Resume, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
  switch (templateType) {
    case 'academic':
      base = SAMPLE_ACADEMIC_CV;
      break;
    case 'classic':
      base = SAMPLE_CLASSIC_PROFESSIONAL_CV;
      break;
    case 'jakes':
      base = SAMPLE_JAKES_CV;
      break;
    case 'two-column':
      base = SAMPLE_TWO_COLUMN_CV;
      break;
    case 'software-developer':
      base = SAMPLE_SOFTWARE_DEVELOPER_CV;
      break;
    case 'harvard':
      base = SAMPLE_HARVARD_CV;
      break;
    case 'elegant-serif':
      base = SAMPLE_ELEGANT_SERIF_CV;
      break;
    case 'modern-corporate':
      base = SAMPLE_MODERN_CORPORATE_CV;
      break;
    case 'fresher-resume':
      base = SAMPLE_FRESHER_RESUME_CV;
      break;
    case 'internship-resume':
      base = SAMPLE_INTERNSHIP_RESUME_CV;
      break;
    case 'experienced':
      base = SAMPLE_EXPERIENCED_CV;
      break;
    case 'fresher':
      base = SAMPLE_FRESHER_CV;
      break;
    case 'student':
      base = SAMPLE_STUDENT_CV;
      break;
    case 'blank':
      base = BLANK_ACADEMIC_CV;
      break;
    case 'sample':
    default:
      base = SAMPLE_ACADEMIC_CV;
      break;
  }

  const newResume: Resume = {
    ...base,
    id: newId,
    userId,
    title: title || base.title,
    createdAt: now,
    updatedAt: now,
    personalInfo: {
      ...base.personalInfo,
      fullName: userDisplayName || base.personalInfo.fullName,
      email: userEmail || base.personalInfo.email,
    },
  };

  await saveResume(userId, newResume);
  return newResume;
}
