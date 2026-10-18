import type { AnimatedRegion, LatLng } from 'react-native-maps';

export function mapMouseEventToMapEvent<T>(
  e?: google.maps.MapMouseEvent | null,
  defaultCoordinate?: LatLng | AnimatedRegion | null,
  map?: google.maps.Map | null,
  action?: string,
) {
  return {
    preventDefault: e?.stop,
    stopPropagation: e?.stop,
    nativeEvent: {
      action,
      coordinate: {
        latitude: e?.latLng?.lat() || defaultCoordinate?.latitude || 0,
        longitude: e?.latLng?.lng() || defaultCoordinate?.longitude || 0,
      },
      position: map?.getProjection()?.fromLatLngToPoint({
        lat: e?.latLng?.lat() || Number(defaultCoordinate?.latitude) || 0,
        lng: e?.latLng?.lng() || Number(defaultCoordinate?.longitude) || 0,
      }) || { x: 0, y: 0 },
    },
  } as T;
}

export function createMarkerPressEvent<T>(
  coordinate: LatLng,
  map: google.maps.Map,
  action: string,
  id: string,
): T {
  const projection = map.getProjection();
  const latLng = new google.maps.LatLng(coordinate.latitude, coordinate.longitude);
  const point = projection?.fromLatLngToPoint(latLng);

  return {
    nativeEvent: {
      id,
      action,
      coordinate,
      position: point ? { x: point.x, y: point.y } : undefined,
    },
  } as T;
}


/**
 * Converts a map mouse event from @vis.gl/react-google-maps to the Google Maps event that
 * mapMouseEventToMapEvent expects.
 *
 * @param e map mouse event received by a vis.gl Map handler
 */
export function toGoogleMouseEvent(e: {
  detail: { latLng: google.maps.LatLngLiteral | null };
  stop: () => void;
  domEvent?: Event;
}): google.maps.MapMouseEvent {
  return {
    latLng: e.detail.latLng ? new google.maps.LatLng(e.detail.latLng) : null,
    stop: e.stop,
    domEvent: e.domEvent,
  } as google.maps.MapMouseEvent;
}
