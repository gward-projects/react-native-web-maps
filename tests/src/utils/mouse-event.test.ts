import assert from 'node:assert/strict';
import test from 'node:test';

import { mapMouseEventToMapEvent, toGoogleMouseEvent } from '../../../src/utils/mouse-event';

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

test('converts a vis.gl map mouse event to a Google Maps mouse event', () => {
  class FakeLatLng {
    constructor(private readonly literal: google.maps.LatLngLiteral) {}
    lat() { return this.literal.lat; }
    lng() { return this.literal.lng; }
  }
  const globals = globalThis as unknown as { google?: unknown };
  const previous = globals.google;
  globals.google = { maps: { LatLng: FakeLatLng } };

  try {
    const stop = () => {};
    const event = toGoogleMouseEvent({ detail: { latLng: { lat: 48.85, lng: 2.35 } }, stop });

    assert.equal(event.latLng?.lat(), 48.85);
    assert.equal(event.latLng?.lng(), 2.35);
    assert.equal(event.stop, stop);
    assert.equal(toGoogleMouseEvent({ detail: { latLng: null }, stop }).latLng, null);
  } finally {
    globals.google = previous;
  }
});
