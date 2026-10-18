import { useEffect, useEffectEvent, useState } from 'react';
import * as Location from 'expo-location';
import type { UserLocationChangeEvent } from 'react-native-maps';

interface UseUserLocationOptions {
  requestPermission: boolean;
  followUserLocation: boolean;
  showUserLocation: boolean;

  onUserLocationChange?(e: UserLocationChangeEvent): void;
}

export function useUserLocation(options: UseUserLocationOptions) {
  const { followUserLocation, onUserLocationChange } = options;
  const [location, setLocation] = useState<Location.LocationObject>();

  const [permission] = Location.useForegroundPermissions({
    request: options.requestPermission,
    get: options.showUserLocation,
  });

  // An effect event: a new onUserLocationChange must not restart the position watch.
  const handleLocationChange = useEffectEvent(
    (e: Location.LocationObject) => {
      setLocation(e);
      onUserLocationChange?.({
        nativeEvent: {
          coordinate: {
            ...e.coords,
            timestamp: Date.now(),
            altitude: e.coords.altitude || 0,
            heading: e.coords.heading || 0,
            accuracy: e.coords.accuracy || Location.Accuracy.Balanced,
            isFromMockProvider: e.mocked || false,
            speed: e.coords.speed || 0,
          },
        },
      } as unknown as UserLocationChangeEvent);
    },
  );

  const granted = permission?.granted ?? false;

  useEffect(() => {
    if (!granted || !followUserLocation) return;

    // The subscription arrives asynchronously: remove it at once if the effect
    // was cleaned up in the meantime.
    let subscription: Location.LocationSubscription | undefined;
    let cleanedUp = false;

    Location.getCurrentPositionAsync().then((e) => handleLocationChange(e));
    // Watch position
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced },
      (e) => handleLocationChange(e),
    ).then((watch) => {
      if (cleanedUp) watch.remove();
      else subscription = watch;
    });

    return () => {
      cleanedUp = true;
      subscription?.remove();
    };
  }, [granted, followUserLocation]);

  return location;
}
