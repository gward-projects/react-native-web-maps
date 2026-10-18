import React from 'react';
import type { MapPolylineProps } from 'react-native-maps';
import { Polyline as GMPolyline, useMap } from '@vis.gl/react-google-maps';

import { mapMouseEventToMapEvent } from '../utils/mouse-event';

export function Polyline(props: MapPolylineProps) {
  const map = useMap();

  return (
    <GMPolyline
      path={props.coordinates.map((c) => ({
        lat: c.latitude,
        lng: c.longitude,
      }))}
      onClick={(e) =>
        props.onPress?.(mapMouseEventToMapEvent(e, null, map, 'polyline-press'))
      }
      geodesic={props.geodesic}
      clickable={props.tappable}
      strokeColor={props.strokeColor}
      strokeWeight={props.strokeWidth}
    />
  );
}
