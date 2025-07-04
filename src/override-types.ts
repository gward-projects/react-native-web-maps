import type { MapViewProps as RNMapViewProps } from 'react-native-maps';
import { JSX } from 'react';

/**
 * Overrides MapView props to include additional web-specific props
 *
 * Add '/// <reference types="@teovilla/react-native-web-maps/dist/typescript/override-types" />'
 * in the app.d.ts file of the app to get overriden types
 */

  //@ts-ignore gets rid of 'Duplicate identifier' error
export interface MapViewProps extends RNMapViewProps {
  googleMapsApiKey: string;
  googleMapsMapId: string;
  loadingFallback?: JSX.Element;
  options?: google.maps.MapOptions;
}
