import assert from 'node:assert/strict';
import test from 'node:test';

import { getBoundByRegion } from '../../../src/utils/region';

test('returns the [west, south, east, north] box around the region center', () => {
  assert.deepEqual(
    getBoundByRegion({ latitude: 48, longitude: 2, latitudeDelta: 4, longitudeDelta: 6 }),
    [-1, 46, 5, 50],
  );
});

test('scales the box around the center', () => {
  assert.deepEqual(
    getBoundByRegion({ latitude: 0, longitude: 0, latitudeDelta: 2, longitudeDelta: 2 }, 2),
    [-2, -2, 2, 2],
  );
});

test('a longitude delta below -180 is brought back into range', () => {
  assert.deepEqual(
    getBoundByRegion({ latitude: 0, longitude: 0, latitudeDelta: 2, longitudeDelta: -350 }),
    [-5, -1, 5, 1],
  );
});
