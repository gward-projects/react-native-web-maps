import React from 'react';
import { Circle as GMCircle } from '@vis.gl/react-google-maps';
import type { MapCircleProps } from 'react-native-maps';

export function Circle(props: MapCircleProps) {
  return (
    <GMCircle
      center={{ lat: props.center.latitude, lng: props.center.longitude }}
      radius={props.radius}
      fillColor={props.fillColor}
      strokeColor={props.strokeColor}
      zIndex={props.zIndex}
    />
  );
}
