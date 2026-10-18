import React from 'react';
import type { MapPolygonProps } from 'react-native-maps';
import { Polygon as GMPolygon, useMap } from '@vis.gl/react-google-maps';

import { mapMouseEventToMapEvent } from '../utils/mouse-event';

export function Polygon(props: MapPolygonProps) {
  const map = useMap();
  return (
    <GMPolygon
      paths={props.coordinates.map((c) => ({
        lat: c.latitude,
        lng: c.longitude,
      }))}
      onClick={(e) =>
        props.onPress?.(mapMouseEventToMapEvent(e, null, map, 'polygon-press'))
      }
      geodesic={props.geodesic}
      clickable={props.tappable}
      fillColor={props.fillColor}
      strokeColor={props.strokeColor}
      strokeWeight={props.strokeWidth}
    />
  );
}
