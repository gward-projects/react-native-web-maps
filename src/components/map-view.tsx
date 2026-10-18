import type { ForwardedRef } from 'react';
import React, { forwardRef, memo, useCallback, useEffect, useEffectEvent, useId, useImperativeHandle, useMemo, useState } from 'react';
import type { Address, Camera, EdgePadding, SnapshotOptions } from 'react-native-maps';
import { APIProvider, Map as GoogleMap, useApiIsLoaded, useMap } from '@vis.gl/react-google-maps';
import { LatLng, Point, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import type RNMapView from 'react-native-maps';

import { logDeprecationWarning, logMethodNotImplementedWarning } from '../utils/log';
import { mapMouseEventToMapEvent, toGoogleMouseEvent } from '../utils/mouse-event';
import { MapViewProps } from '../override-types';
import { transformRNCameraObject } from '../utils/camera';
import { UserLocationMarker } from './user-location-marker';
import { useUserLocation } from '../hooks/use-user-location';

// Loaded upfront for the advanced markers (marker.web.tsx).
const LIBRARIES = ['marker'];

// A map hidden with display: none (for instance a screen kept in a navigation stack) has no
// visible region: Google still fires bounds_changed while measuring it at 0 x 0, with an empty
// region. Reporting it would hand the app an empty region, and animating back to it zooms the
// map to its maximum level, where Google has no tile (grey map).
const hasSize = (map: google.maps.Map) => map.getDiv().clientWidth > 0 && map.getDiv().clientHeight > 0;

// Google does not watch the size of the map container. Once it has measured a hidden map at 0 x 0
// (for instance when a marker is added to it), it keeps that empty viewport after the map is
// shown again: a camera change then loads no tile (grey map, empty info windows). It measures the
// container again on its own shortly after, without repainting.
const hasStaleViewport = (map: google.maps.Map) => {
  const span = map.getBounds()?.toSpan();
  return hasSize(map) && (!span || (span.lat() === 0 && span.lng() === 0));
};

// Upper bound for waiting on Google, in case it never measures the container again.
const STALE_VIEWPORT_TIMEOUT_MS = 5000;

/**
 * Runs the action once Google knows the real size of the map, right away when it already does.
 *
 * @param map map to wait for
 * @param action camera change or repaint that needs the real viewport
 */
const whenViewportKnown = (map: google.maps.Map, action: () => void) => {
  const start = performance.now();
  const check = () => {
    if (!hasStaleViewport(map) || performance.now() - start > STALE_VIEWPORT_TIMEOUT_MS) {
      action();
      return;
    }
    requestAnimationFrame(check);
  };
  check();
};

function MapViewContent(props: MapViewProps, ref: ForwardedRef<Partial<RNMapView>>) {
  const {
    customMapStyle,
    followsUserLocation,
    googleMapsMapId,
    initialCamera,
    initialRegion,
    maxZoomLevel,
    minZoomLevel,
    onDoublePress,
    onMapReady,
    onPanDrag,
    onPress,
    onRegionChange,
    onRegionChangeComplete,
    options,
    rotateEnabled,
    showsScale,
    showsUserLocation,
    zoomControlEnabled,
    zoomEnabled,
    zoomTapEnabled,
  } = props;

  // State

  // Identifies this map in the APIProvider, so that useMap returns its instance.
  const mapId = useId();
  const map = useMap(mapId);
  const [isGesture, setIsGesture] = useState<boolean>(false);
  // The map is uncontrolled: these values only set its initial camera, so a render never moves
  // it (a controlled center used to cancel a drag started by the same press).
  const [initialCenter] = useState<google.maps.LatLngLiteral>(() => ({
    lat: initialCamera?.center.latitude || initialRegion?.latitude || 0,
    lng: initialCamera?.center.longitude || initialRegion?.longitude || 0,
  }));

  const userLocation = useUserLocation({
    showUserLocation: props.showsUserLocation || false,
    requestPermission:
      props.showsUserLocation || !!props.onUserLocationChange || false,
    onUserLocationChange: props.onUserLocationChange,
    followUserLocation: props.followsUserLocation || false,
  });

  const isLoaded = useApiIsLoaded();

  // Callbacks

  // An effect event: a new onMapReady from the parent must not report the map ready again.
  const notifyMapReady = useEffectEvent(() => onMapReady?.());

  useEffect(() => {
    if (map) notifyMapReady();
  }, [map]);

  const _onDragStart = useCallback(() => {
    setIsGesture(true);
  }, []);

  const _onRegionChange = useCallback(() => {
    const bounds = map?.getBounds();
    if (map && bounds && hasSize(map)) {
      const northEast = bounds.getNorthEast();
      const southWest = bounds.getSouthWest();
      const longitudeDelta = Math.abs(northEast.lng() - southWest.lng());
      const latitudeDelta = Math.abs(northEast.lat() - southWest.lat());
      const center = bounds.getCenter();
      onRegionChange?.(
        {
          latitude: center.lat(),
          longitude: center.lng(),
          latitudeDelta,
          longitudeDelta,
        },
        { isGesture },
      );
    }
  }, [map, onRegionChange, isGesture]);

  const _onRegionChangeComplete = useCallback(() => {
    const bounds = map?.getBounds();
    if (map && bounds && hasSize(map)) {
      const northEast = bounds.getNorthEast();
      const southWest = bounds.getSouthWest();
      const longitudeDelta = Math.abs(northEast.lng() - southWest.lng());
      const latitudeDelta = Math.abs(northEast.lat() - southWest.lat());
      const center = bounds.getCenter();
      onRegionChangeComplete?.(
        {
          latitude: center.lat(),
          longitude: center.lng(),
          latitudeDelta,
          longitudeDelta,
        },
        { isGesture },
      );
    }
    setIsGesture(false);
  }, [map, onRegionChangeComplete, isGesture]);

  // Repaints a map shown again whose viewport Google measured while it was hidden.
  useEffect(() => {
    if (!map) return;
    let wasVisible = true;
    const observer = new IntersectionObserver(([entry]) => {
      const isVisible = entry?.isIntersecting ?? false;
      if (isVisible && !wasVisible && hasStaleViewport(map)) {
        whenViewportKnown(map, () => {
          const center = map.getCenter();
          if (center) map.setCenter(center);
        });
      }
      wasVisible = isVisible;
    });
    observer.observe(map.getDiv());
    return () => observer.disconnect();
  }, [map]);

  // Ref handle

  useImperativeHandle(
    ref,
    () => ({
      async getCamera(): Promise<Camera> {
        const center = map?.getCenter();
        return {
          altitude: 0,
          heading: map?.getHeading() || 0,
          pitch: map?.getTilt() || 0, // TODO: Review this
          zoom: map?.getZoom() || 0, // TODO: Normalize value
          center: {
            latitude: center?.lat() || 0,
            longitude: center?.lng() || 0,
          },
        };
      },
      setCamera(camera: Partial<Camera>): void {
        map?.moveCamera(transformRNCameraObject(camera));
      },
      animateCamera(
        camera: Partial<Camera>,
        _opts?: { duration?: number },
      ): void {
        map?.moveCamera(transformRNCameraObject(camera));
      },
      async getMapBoundaries(): Promise<{
        northEast: LatLng;
        southWest: LatLng;
      }> {
        const bounds = map?.getBounds();

        const northEast = bounds?.getNorthEast();
        const southWest = bounds?.getSouthWest();

        return {
          northEast: {
            latitude: northEast?.lat() || 0,
            longitude: northEast?.lng() || 0,
          },
          southWest: {
            latitude: southWest?.lat() || 0,
            longitude: southWest?.lng() || 0,
          },
        };
      },
      animateToRegion(region: Region, _duration?: number): void {
        const bounds = new google.maps.LatLngBounds();

        // Source: https://github.com/react-native-maps/react-native-maps/blob/master/android/src/main/java/com/airbnb/android/react/maps/AirMapView.java#L503

        // southWest
        bounds.extend({
          lat: region.latitude - region.latitudeDelta / 2,
          lng: region.longitude - region.longitudeDelta / 2,
        });

        // northEast
        bounds.extend({
          lat: region.latitude + region.latitudeDelta / 2,
          lng: region.longitude + region.longitudeDelta / 2,
        });

        // panToBounds not working??
        // map?.panToBounds(bounds);
        if (map) whenViewportKnown(map, () => map.fitBounds(bounds));
      },
      fitToCoordinates(
        coordinates?: LatLng[],
        options?: { edgePadding?: EdgePadding; animated?: boolean },
      ): void {
        const bounds = new google.maps.LatLngBounds();

        if (coordinates) {
          coordinates?.forEach((c) =>
            bounds.extend({
              lat: c.latitude,
              lng: c.longitude,
            }),
          );
        }

        map?.fitBounds(bounds, options?.edgePadding as google.maps.Padding);
      },
      setMapBoundaries(northEast: LatLng, southWest: LatLng): void {
        const bounds = new google.maps.LatLngBounds();

        bounds.extend({ lat: northEast.latitude, lng: northEast.longitude });
        bounds.extend({ lat: southWest.latitude, lng: southWest.longitude });

        map?.fitBounds(bounds);
      },
      async pointForCoordinate(coordinate: LatLng): Promise<Point> {
        const point = map?.getProjection()?.fromLatLngToPoint({
          lat: coordinate.latitude,
          lng: coordinate.longitude,
        });
        return point || { x: 0, y: 0 };
      },
      async coordinateForPoint(point: Point): Promise<LatLng> {
        const coord = map
          ?.getProjection()
          ?.fromPointToLatLng(new google.maps.Point(point.x, point.y));

        return { latitude: coord?.lat() || 0, longitude: coord?.lng() || 0 };
      },
      async takeSnapshot(_options?: SnapshotOptions): Promise<string> {
        logMethodNotImplementedWarning('takeSnapshot');
        return '';
      },
      async addressForCoordinate(_coordinate: LatLng): Promise<Address> {
        //Location.setGoogleApiKey(props.googleMapsApiKey || ''); Doesn't exist anymore
        const [address] = await Location.reverseGeocodeAsync(_coordinate);

        return address
          ? {
            administrativeArea: address.region || '',
            country: address.country || '',
            countryCode: address.isoCountryCode || '',
            locality: address.city || '',
            postalCode: address.postalCode || '',
            name: address.name || '',
            subAdministrativeArea: address.subregion || '',
            subLocality: address.city || '',
            thoroughfare: '',
          }
          : (null as unknown as Address);
      },
      animateToNavigation(
        _location: LatLng,
        _bearing: number,
        _angle: number,
        _duration?: number,
      ): void {
        logDeprecationWarning('animateToNavigation');
      },
      animateToCoordinate(_latLng: LatLng, _duration?: number): void {
        logDeprecationWarning('animateToCoordinate');
      },
      animateToBearing(_bearing: number, _duration?: number): void {
        logDeprecationWarning('animateToBearing');
      },
      animateToViewingAngle(_angle: number, _duration?: number): void {
        logDeprecationWarning('animateToViewingAngle');
      },
      fitToElements(_options?: {
        edgePadding?: EdgePadding;
        animated?: boolean;
      }): void {
        logMethodNotImplementedWarning('fitToElements');
      },
      fitToSuppliedMarkers(
        _markers: string[],
        _options?: { edgePadding?: EdgePadding; animated?: boolean },
      ): void {
        logMethodNotImplementedWarning('fitToSuppliedMarkers');
      },
      setIndoorActiveLevelIndex(_index: number): void {
        logMethodNotImplementedWarning('setIndoorActiveLevelIndex');
      },
    }),
    [map],
  );

  // Side effects

  useEffect(() => {
    if (followsUserLocation && userLocation) {
      map?.panTo({
        lat: userLocation.coords.latitude,
        lng: userLocation.coords.longitude,
      });
    }
  }, [followsUserLocation, map, userLocation]);

  const mapNode = useMemo(
    () => (
      <GoogleMap
        id={mapId}
        style={{ flex: 1 }}
        defaultCenter={initialCenter}
        defaultZoom={initialCamera?.zoom || 3}
        defaultHeading={initialCamera?.heading}
        defaultTilt={initialCamera?.pitch}
        onBoundsChanged={_onRegionChange}
        onDragstart={_onDragStart}
        onDragend={_onRegionChangeComplete}
        onDrag={() => {
          const center = map?.getCenter();

          onPanDrag?.(
            mapMouseEventToMapEvent(
              null,
              center && { latitude: center.lat(), longitude: center.lng() },
              map,
              undefined,
            ),
          );
        }}
        onClick={(e) =>
          onPress?.(mapMouseEventToMapEvent(toGoogleMouseEvent(e), null, map, 'press'))
        }
        onDblclick={(e) =>
          onDoublePress?.(mapMouseEventToMapEvent(toGoogleMouseEvent(e), null, map, 'press'))
        }
        scrollwheel={zoomEnabled}
        disableDoubleClickZoom={!zoomTapEnabled}
        zoomControl={zoomControlEnabled}
        rotateControl={rotateEnabled}
        minZoom={minZoomLevel} // TODO: Normalize value
        maxZoom={maxZoomLevel} // TODO: Normalize value
        scaleControl={showsScale}
        styles={customMapStyle}
        mapId={googleMapsMapId}
        // vis.gl types colorScheme and renderingType with its own enums, of the same values.
        {...(options as Omit<google.maps.MapOptions, 'colorScheme' | 'renderingType'>)}
      >
        {showsUserLocation && userLocation && (
          <UserLocationMarker coordinates={userLocation.coords} />
        )}
        {props.children}
      </GoogleMap>
    ),
    [
      _onDragStart,
      _onRegionChange,
      _onRegionChangeComplete,
      customMapStyle,
      googleMapsMapId,
      initialCamera,
      initialCenter,
      map,
      mapId,
      maxZoomLevel,
      minZoomLevel,
      onDoublePress,
      onPanDrag,
      onPress,
      options,
      props.children,
      rotateEnabled,
      showsScale,
      showsUserLocation,
      userLocation,
      zoomControlEnabled,
      zoomEnabled,
      zoomTapEnabled,
    ],
  );

  return isLoaded ? mapNode : <>{props.loadingFallback || null}</>;
}

const MapViewWithRef = forwardRef(MapViewContent);

function MapViewComponent(props: MapViewProps, ref: ForwardedRef<Partial<RNMapView>>) {
  if (props.provider !== 'google') {
    console.warn(
      '[WARNING] `react-native-web-maps` only suppots google for now. Please pass "google" as provider in props',
    );

    return null;
  }

  return (
    <APIProvider apiKey={props.googleMapsApiKey || ''} libraries={LIBRARIES}>
      <MapViewWithRef {...props} ref={ref} />
    </APIProvider>
  );
}

export const MapView = memo(forwardRef(MapViewComponent));
