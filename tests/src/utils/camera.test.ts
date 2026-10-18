import assert from 'node:assert/strict';
import test from 'node:test';

import { transformRNCameraObject } from '../../../src/utils/camera';

test('maps a react-native-maps camera to Google Maps camera options', () => {
  assert.deepEqual(
    transformRNCameraObject({
      center: { latitude: 48.85, longitude: 2.35 },
      heading: 90,
      pitch: 45,
      zoom: 12,
    }),
    { tilt: 45, heading: 90, zoom: 12, center: { lat: 48.85, lng: 2.35 } },
  );
});

test('leaves the center undefined when the camera has none', () => {
  assert.equal(transformRNCameraObject({ zoom: 3 }).center, undefined);
});
