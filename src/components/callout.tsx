import { createContext, useContext, useMemo } from 'react';
import { InfoWindow as GMInfoWindow, useMap } from '@vis.gl/react-google-maps';
import type { LatLng, MapCalloutProps, Point } from 'react-native-maps';

import { mapMouseEventToMapEvent } from '../utils/mouse-event';
import { OverlayView } from './overlay-view';

export type CalloutContextType = {
  coordinate: LatLng;
  calloutVisible: boolean;
  toggleCalloutVisible: () => void;
  markerSize: { width: number; height: number };
  anchor: Point;
};

export const CalloutContext = createContext<CalloutContextType>({
  coordinate: { latitude: 0, longitude: 0 },
  calloutVisible: false,
  toggleCalloutVisible: () => {
  },
  markerSize: { width: 0, height: 0 },
  anchor: { x: 0, y: 0 },
});

export function Callout(props: MapCalloutProps) {
  const map = useMap();

  const {
    coordinate,
    calloutVisible,
    toggleCalloutVisible,
    markerSize,
    anchor,
  } = useContext(CalloutContext);

  //By default callout is positioned to bottom center
  //i.e. is at anchor: (0.5, 1)
  //This compensates to match expected result using the provided anchor prop
  const xOffset = -(markerSize.width * (0.5 - anchor.x));
  const yOffset = -(markerSize.height * (1 - anchor.y));
  // Stable between renders: the vis.gl InfoWindow closes and reopens whenever this array changes,
  // and reopening auto-pans the map, which cancelled the drag in progress (for instance when
  // the screen re-renders on returning to the map).
  const pixelOffset = useMemo<[number, number]>(() => [xOffset, yOffset], [xOffset, yOffset]);

  return calloutVisible ? (
    <div
      onClick={(e) => {
        props.onPress?.(
          mapMouseEventToMapEvent(null, coordinate, map, 'callout-press'),
        );
        e.stopPropagation(); //Prevent marker click handler from being called
      }}
    >
      {props.tooltip ? (
        <OverlayView
          position={{
            lat: Number(coordinate.latitude),
            lng: Number(coordinate.longitude),
          }}
          offset={{ x: xOffset, y: yOffset }}
        >
          {/* Render on top of marker instead of inside */}
          <div style={{ transform: 'translate(-50%,-100%)' }}>
            {props.children}
          </div>
        </OverlayView>
      ) : (
        <GMInfoWindow
          position={{
            lat: Number(coordinate.latitude),
            lng: Number(coordinate.longitude),
          }}
          pixelOffset={pixelOffset}
          onCloseClick={() => toggleCalloutVisible()}
        >
          <>{props.children}</>
        </GMInfoWindow>
      )}
    </div>
  ) : null;
}
