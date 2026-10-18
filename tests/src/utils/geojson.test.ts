import assert from 'node:assert/strict';
import test from 'node:test';

import { getColor, getRgbaFromHex, makeCoordinates, makeOverlays } from '../../../src/utils/geojson';

const point: GeoJSON.Feature = {
  type: 'Feature',
  properties: { 'fill': '#ff0000', 'fill-opacity': 0.5 },
  geometry: { type: 'Point', coordinates: [2.35, 48.85] },
};

const polygon: GeoJSON.Feature = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [[0, 0], [1, 0], [1, 1], [0, 0]],
      [[0.2, 0.2], [0.4, 0.2], [0.4, 0.4], [0.2, 0.2]],
    ],
  },
};

test('GeoJSON positions become react-native-maps coordinates', () => {
  assert.deepEqual(makeCoordinates(point), [{ latitude: 48.85, longitude: 2.35 }]);
});

test('features become typed overlays, a polygon keeping its holes', () => {
  const overlays = makeOverlays([point, polygon]) as Record<string, unknown>[];

  assert.deepEqual(overlays.map((overlay) => overlay.type), ['point', 'polygon']);
  assert.deepEqual(overlays[0]?.coordinates, { latitude: 48.85, longitude: 2.35 });
  assert.equal((overlays[1]?.coordinates as unknown[]).length, 4);
  assert.equal((overlays[1]?.holes as unknown[]).length, 1);
});

test('a hex color becomes rgba', () => {
  assert.equal(getRgbaFromHex('#00ff80', 0.5), 'rgba(0,255,128,0.5)');
});

test('the color prop wins over the feature color, which takes its opacity', () => {
  const overlay = { feature: point };

  assert.equal(getColor({ fillColor: 'blue' }, overlay, 'fill', 'fillColor'), 'blue');
  assert.equal(getColor({}, overlay, 'fill', 'fillColor'), 'rgba(255,0,0,0.5)');
});
