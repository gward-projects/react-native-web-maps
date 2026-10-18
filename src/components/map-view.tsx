import type { ForwardedRef } from 'react';
import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import type { Address, Camera, EdgePadding, SnapshotOptions } from 'react-native-maps';
import { GoogleMap, type Libraries, useJsApiLoader } from '@react-google-maps/api';
import { LatLng, Point, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import type RNMapView from 'react-native-maps';

import { logDeprecationWarning, logMethodNotImplementedWarning } from '../utils/log';
import { mapMouseEventToMapEvent } from '../utils/mouse-event';
import { MapViewProps } from '../override-types';
import { transformRNCameraObject } from '../utils/camera';
import { UserLocationMarker } from './user-location-marker';
import { useUserLocation } from '../hooks/use-user-location';

const LIBRARIES: Libraries = ['marker'];

function MapViewComponent(props: MapViewProps, ref: ForwardedRef<Partial<RNMapView>>) {
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

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isGesture, setIsGesture] = useState<boolean>(false);
  // Computed once: GoogleMap calls setCenter whenever this object changes, and a setCenter
  // cancels the drag in progress. With a new center on each render, the render triggered by
  // onDragStart cancelled the drag that had just started.
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

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: props.googleMapsApiKey || '',
    libraries: LIBRARIES,
  });

  // Callbacks

  const _onMapReady = useCallback(
    (_map: google.maps.Map) => {
      setMap(_map);
      onMapReady?.();
    },
    [onMapReady],
  );

  const _onDragStart = useCallback(() => {
    setIsGesture(true);
  }, []);

  const _onRegionChange = useCallback(() => {
    const bounds = map?.getBounds();
    if (bounds) {
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
    if (bounds) {
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
        map?.fitBounds(bounds);
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
        onLoad={_onMapReady}
        onBoundsChanged={_onRegionChange}
        onDragStart={_onDragStart}
        onDragEnd={_onRegionChangeComplete}
        mapContainerStyle={{ flex: 1 }}
        zoom={initialCamera?.zoom || 3}
        heading={initialCamera?.heading}
        tilt={initialCamera?.pitch}
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
          onPress?.(mapMouseEventToMapEvent(e, null, map, 'press'))
        }
        onDblClick={(e) =>
          onDoublePress?.(mapMouseEventToMapEvent(e, null, map, 'press'))
        }
        center={initialCenter}
        options={{
          scrollwheel: zoomEnabled,
          disableDoubleClickZoom: !zoomTapEnabled,
          zoomControl: zoomControlEnabled,
          rotateControl: rotateEnabled,
          minZoom: minZoomLevel, // TODO: Normalize value
          maxZoom: maxZoomLevel, // TODO: Normalize value
          scaleControl: showsScale,
          styles: customMapStyle,
          mapId: googleMapsMapId,
          ...(options || {}),
        }}
      >
        <>
          {showsUserLocation && userLocation && (
            <UserLocationMarker coordinates={userLocation.coords} />
          )}
          {props.children}
        </>
      </GoogleMap>
    ),
    [
      _onDragStart,
      _onMapReady,
      _onRegionChange,
      _onRegionChangeComplete,
      customMapStyle,
      googleMapsMapId,
      initialCamera,
      initialCenter,
      map,
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

  if (props.provider !== 'google') {
    console.warn(
      '[WARNING] `react-native-web-maps` only suppots google for now. Please pass "google" as provider in props',
    );

    return null;
  }

  return isLoaded ? (
    React.cloneElement(mapNode)
  ) : (
    <>{props.loadingFallback || null}</>
  );
}

export const MapView = memo(forwardRef(MapViewComponent));
