import assert from 'node:assert/strict';
import test from 'node:test';

import { mapMouseEventToMapEvent } from '../../../src/utils/mouse-event';

type MapEvent = { nativeEvent: { action?: string; coordinate: { latitude: number; longitude: number }; position: { x: number; y: number } } };

test('takes the coordinate of the Google Maps event', () => {
  const event = { latLng: { lat: () => 48.85, lng: () => 2.35 } } as google.maps.MapMouseEvent;
  const mapEvent = mapMouseEventToMapEvent<MapEvent>(event, null, null, 'press');

  assert.deepEqual(mapEvent.nativeEvent.coordinate, { latitude: 48.85, longitude: 2.35 });
  assert.equal(mapEvent.nativeEvent.action, 'press');
  assert.deepEqual(mapEvent.nativeEvent.position, { x: 0, y: 0 });
});

test('falls back to the default coordinate without an event', () => {
  const mapEvent = mapMouseEventToMapEvent<MapEvent>(null, { latitude: 1, longitude: 2 });

  assert.deepEqual(mapEvent.nativeEvent.coordinate, { latitude: 1, longitude: 2 });
});
