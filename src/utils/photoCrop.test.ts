import test from 'node:test';
import assert from 'node:assert/strict';
import { computePhotoCropRect, validatePhotoFile } from './photoCrop';

test('computePhotoCropRect computes accurate centered portrait (3:4) and square (1:1) source rectangles', () => {
  const portraitFromWide = computePhotoCropRect(1600, 1000, {
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    shape: 'portrait',
  });
  assert.equal(portraitFromWide.outWidth, 312);
  assert.equal(portraitFromWide.outHeight, 400);
  assert.equal(portraitFromWide.sh, 1000);
  assert.equal(portraitFromWide.sw, 780);
  assert.equal(portraitFromWide.sx, (1600 - 780) / 2);
  assert.equal(portraitFromWide.sy, 0);

  const squareFromTall = computePhotoCropRect(800, 1200, {
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    shape: 'square',
  });
  assert.equal(squareFromTall.outWidth, 320);
  assert.equal(squareFromTall.outHeight, 320);
  assert.equal(squareFromTall.sw, 800);
  assert.equal(squareFromTall.sh, 800);
  assert.equal(squareFromTall.sx, 0);
  assert.equal(squareFromTall.sy, 200);

  const circleFromWide = computePhotoCropRect(1200, 900, {
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    shape: 'circle',
  });
  assert.equal(circleFromWide.outWidth, 320);
  assert.equal(circleFromWide.outHeight, 320);
  assert.equal(circleFromWide.sw, 900);
  assert.equal(circleFromWide.sh, 900);
  assert.equal(circleFromWide.sx, 150);
  assert.equal(circleFromWide.sy, 0);
});

test('computePhotoCropRect clamps zoom (1..3) and pan offsets (-1..1) safely within image bounds', () => {
  const zoomedOutOfBounds = computePhotoCropRect(1000, 1000, {
    zoom: 5, // should clamp to 3
    offsetX: 3, // should clamp to 1
    offsetY: -3, // should clamp to -1
    shape: 'square',
  });
  const expectedSize = 1000 / 3;
  assert.ok(Math.abs(zoomedOutOfBounds.sw - expectedSize) < 0.01);
  assert.ok(Math.abs(zoomedOutOfBounds.sh - expectedSize) < 0.01);
  assert.ok(zoomedOutOfBounds.sx >= 0 && zoomedOutOfBounds.sx + zoomedOutOfBounds.sw <= 1000.01);
  assert.ok(zoomedOutOfBounds.sy >= 0 && zoomedOutOfBounds.sy + zoomedOutOfBounds.sh <= 1000.01);
});

test('validatePhotoFile accepts valid JPG/PNG/WebP under 8MB and rejects invalid types or oversized files', () => {
  assert.equal(validatePhotoFile({ type: 'image/jpeg', size: 500_000 }).valid, true);
  assert.equal(validatePhotoFile({ type: 'image/png', size: 2_000_000 }).valid, true);
  assert.equal(validatePhotoFile({ type: 'image/webp', size: 1_000_000 }).valid, true);

  const pdfCheck = validatePhotoFile({ type: 'application/pdf', size: 100_000 });
  assert.equal(pdfCheck.valid, false);
  assert.ok(pdfCheck.error?.includes('JPG, PNG, or WebP'));

  const hugeCheck = validatePhotoFile({ type: 'image/png', size: 10 * 1024 * 1024 });
  assert.equal(hugeCheck.valid, false);
  assert.ok(hugeCheck.error?.includes('8 MB'));
});
