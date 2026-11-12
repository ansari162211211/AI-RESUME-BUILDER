import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEmail,
  validatePassword,
  validateSignup,
  validateLogin,
  calculateResumeCompleteness,
  analyzeResumeSections,
} from './validation.ts';
import {
  SAMPLE_ACADEMIC_CV,
  SAMPLE_STUDENT_CV,
} from '../data/sampleResumes.ts';

test('validateEmail correctly checks valid and invalid emails', () => {
  assert.equal(validateEmail('user@example.com'), true);
  assert.equal(validateEmail('eleanor.chen@stanford.edu'), true);
  assert.equal(validateEmail('invalid-email'), false);
  assert.equal(validateEmail('user@'), false);
  assert.equal(validateEmail(''), false);
});

test('validatePassword requires at least 6 characters', () => {
  assert.equal(validatePassword('123456').isValid, true);
  assert.equal(validatePassword('short').isValid, false);
  assert.equal(validatePassword('').isValid, false);
});

test('validateSignup checks fullName, email, password matching', () => {
  const resultValid = validateSignup(
    'Dr. Eleanor Chen',
    'eleanor.chen@stanford.edu',
    'academic123',
    'academic123'
  );
  assert.equal(resultValid.isValid, true);
  assert.equal(Object.keys(resultValid.errors).length, 0);

  const resultMismatch = validateSignup(
    'Dr. Eleanor Chen',
    'eleanor.chen@stanford.edu',
    'academic123',
    'mismatch456'
  );
  assert.equal(resultMismatch.isValid, false);
  assert.equal(resultMismatch.errors.confirmPassword, 'Passwords do not match');
});

test('validateLogin catches missing fields', () => {
  const valid = validateLogin('eleanor@stanford.edu', 'secretPassword');
  assert.equal(valid.isValid, true);

  const missingEmail = validateLogin('', 'password123');
  assert.equal(missingEmail.isValid, false);
  assert.ok(missingEmail.errors.email);
});

test('calculateResumeCompleteness computes academic and student scores accurately', () => {
  const academicScore = calculateResumeCompleteness(SAMPLE_ACADEMIC_CV);
  assert.equal(academicScore, 100);

  const studentScore = calculateResumeCompleteness(SAMPLE_STUDENT_CV);
  assert.ok(studentScore >= 70);

  const emptyScore = calculateResumeCompleteness({});
  assert.equal(emptyScore, 0);
});

test('analyzeResumeSections evaluates all 14 sections without penalizing optional sections', () => {
  const academicReport = analyzeResumeSections(SAMPLE_ACADEMIC_CV);
  assert.equal(academicReport.sections.length, 14);
  assert.equal(academicReport.overallStatus, 'excellent');
  assert.equal(academicReport.overallScore, 100);

  // Publications should be complete on Academic CV
  const pubSection = academicReport.sections.find((s) => s.sectionId === 'publications');
  assert.ok(pubSection);
  assert.equal(pubSection.status, 'complete');

  // On student CV, publications and references are optional_empty, not breaking the CV
  const studentReport = analyzeResumeSections(SAMPLE_STUDENT_CV);
  assert.equal(studentReport.sections.length, 14);
  const studentPub = studentReport.sections.find((s) => s.sectionId === 'publications');
  assert.ok(studentPub);
  assert.equal(studentPub.status, 'optional_empty');
  assert.equal(studentPub.isOptional, true);

  // Education should be complete for student
  const studentEdu = studentReport.sections.find((s) => s.sectionId === 'education');
  assert.ok(studentEdu);
  assert.equal(studentEdu.status, 'complete');
});

