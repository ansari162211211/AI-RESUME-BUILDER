import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXECUTIVE_PURPLE_DONUT_PALETTE,
  computeDonutChartSegments,
  getDonutPalette,
  getLanguageDotScore,
  validateDailyActivities,
} from './dailyActivities';

test('validateDailyActivities accepts valid totals up to 24h and calculates remaining hours accurately', () => {
  const result = validateDailyActivities([
    { id: '1', activity: 'Daytime job', hours: 8 },
    { id: '2', activity: 'Sports and relaxation', hours: 2 },
    { id: '3', activity: 'Spending time with family', hours: 5 },
    { id: '4', activity: 'Sleep, beautiful sleep', hours: 6 },
    { id: '5', activity: 'Hopeful novelist by night', hours: 3 },
  ]);
  assert.equal(result.valid, true);
  assert.equal(result.totalHours, 24);
  assert.equal(result.remainingHours, 0);
  assert.equal(result.validItems.length, 5);

  const partial = validateDailyActivities([
    { id: '1', activity: 'Classes & Labs', hours: 7 },
    { id: '2', activity: 'Coding Projects', hours: 4 },
  ]);
  assert.equal(partial.valid, true);
  assert.equal(partial.totalHours, 11);
  assert.equal(partial.remainingHours, 13);
});

test('validateDailyActivities rejects totals exceeding 24 hours and non-positive or unnamed items', () => {
  const overLimit = validateDailyActivities([
    { id: '1', activity: 'Work', hours: 14 },
    { id: '2', activity: 'Study', hours: 6 },
    { id: '3', activity: 'Sleep', hours: 8 },
  ]);
  assert.equal(overLimit.valid, false);
  assert.equal(overLimit.totalHours, 28);
  assert.equal(overLimit.remainingHours, 0);
  assert.ok(overLimit.error?.includes('exceed 24 hours'));

  const zeroHours = validateDailyActivities([
    { id: '1', activity: 'Reading', hours: 0 },
  ]);
  assert.equal(zeroHours.valid, false);
  assert.equal(zeroHours.invalidEntries.length, 1);

  const missingName = validateDailyActivities([
    { id: '1', activity: '   ', hours: 4 },
  ]);
  assert.equal(missingName.valid, false);
  assert.equal(missingName.invalidEntries.length, 1);
});

test('validateDailyActivities supports percentage mode (<= 100%) and rejects totals exceeding 100%', () => {
  const validPct = validateDailyActivities(
    [
      { id: 'p1', activity: 'Corporate Strategy', hours: 35, percentage: 35 },
      { id: 'p2', activity: 'Product Innovation', hours: 25, percentage: 25 },
      { id: 'p3', activity: 'Board & Investors', hours: 20, percentage: 20 },
      { id: 'p4', activity: 'Talent & Culture', hours: 20, percentage: 20 },
    ],
    'percentage'
  );
  assert.equal(validPct.valid, true);
  assert.equal(validPct.mode, 'percentage');
  assert.equal(validPct.totalPercentage, 100);
  assert.equal(validPct.remainingPercentage, 0);
  assert.equal(validPct.validItems.length, 4);

  const overPct = validateDailyActivities(
    [
      { id: 'p1', activity: 'Strategy', hours: 60, percentage: 60 },
      { id: 'p2', activity: 'Operations', hours: 55, percentage: 55 },
    ],
    'percentage'
  );
  assert.equal(overPct.valid, false);
  assert.equal(overPct.totalPercentage, 115);
  assert.ok(overPct.error?.includes('exceeds 100%'));
});

test('computeDonutChartSegments generates valid SVG arc paths and uses EXECUTIVE_PURPLE_DONUT_PALETTE for #4c1d95', () => {
  const geom = computeDonutChartSegments(
    [
      { id: '1', activity: 'Daytime job', hours: 8 },
      { id: '2', activity: 'Sports and relaxation', hours: 2 },
      { id: '3', activity: 'Spending time with family', hours: 5 },
      { id: '4', activity: 'Sleep, beautiful sleep', hours: 6 },
      { id: '5', activity: 'Hopeful novelist by night', hours: 3 },
    ],
    { accentColor: '#8f131b' }
  );

  assert.equal(geom.totalHours, 24);
  assert.equal(geom.segments.length, 5);
  for (const seg of geom.segments) {
    assert.ok(seg.pathD.startsWith('M '), 'Arc path must start with Move command');
    assert.ok(seg.pathD.includes(' A '), 'Arc path must contain SVG Arc commands');
    assert.ok(seg.pathD.endsWith('Z'), 'Arc path must be closed');
    assert.ok(seg.color.startsWith('#'));
  }

  assert.deepEqual(getDonutPalette('#4c1d95'), EXECUTIVE_PURPLE_DONUT_PALETTE);

  const execGeom = computeDonutChartSegments(
    [
      { id: 'e1', activity: 'Corporate Strategy', hours: 40, percentage: 40 },
      { id: 'e2', activity: 'Product Innovation', hours: 35, percentage: 35 },
      { id: 'e3', activity: 'Executive Leadership', hours: 25, percentage: 25 },
    ],
    { accentColor: '#4c1d95', mode: 'percentage' }
  );
  assert.equal(execGeom.totalHours, 100);
  assert.equal(execGeom.segments.length, 3);
  assert.equal(execGeom.segments[0].color, EXECUTIVE_PURPLE_DONUT_PALETTE[0]);
  assert.equal(execGeom.segments[1].color, EXECUTIVE_PURPLE_DONUT_PALETTE[1]);
  assert.equal(execGeom.segments[2].color, EXECUTIVE_PURPLE_DONUT_PALETTE[2]);

  // Empty activities yield empty segments cleanly
  const empty = computeDonutChartSegments([]);
  assert.equal(empty.segments.length, 0);
  assert.equal(empty.totalHours, 0);
});

test('getLanguageDotScore maps explicit proficiency levels and returns null when unconfirmed', () => {
  assert.equal(getLanguageDotScore(''), null);
  assert.equal(getLanguageDotScore(undefined), null);
  assert.equal(getLanguageDotScore('Unconfirmed'), null);

  assert.equal(getLanguageDotScore('Native'), 5);
  assert.equal(getLanguageDotScore('Native / Bilingual'), 5);
  assert.equal(getLanguageDotScore('Fluent'), 4.5);
  assert.equal(getLanguageDotScore('Advanced'), 4);
  assert.equal(getLanguageDotScore('Intermediate'), 3);
  assert.equal(getLanguageDotScore('3.5'), 3.5);
  assert.equal(getLanguageDotScore('Elementary'), 2);
  assert.equal(getLanguageDotScore('Beginner'), 1);
});
