import { type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMap } from '@vis.gl/react-google-maps';

interface OverlayViewProps {
  position: google.maps.LatLngLiteral;
  // Pixel offset applied to the position, in the coordinates of the overlay pane.
  offset: { x: number; y: number };
  children: ReactNode;
}

/**
 * Renders React content at a geographic position, in the pane that receives mouse events.
 * @vis.gl/react-google-maps has no OverlayView component: this is a thin google.maps.OverlayView.
 */
export function OverlayView({ position, offset, children }: OverlayViewProps) {
  const map = useMap();
  const [container] = useState(() => document.createElement('div'));
  const { lat, lng } = position;
  const { x, y } = offset;

  useEffect(() => {
    if (!map) return;

    // Defined here: google.maps only exists once the Maps JavaScript API has loaded.
    class Overlay extends google.maps.OverlayView {
      override onAdd() {
        container.style.position = 'absolute';
        // Clicks and drags on the content must not reach the map.
        google.maps.OverlayView.preventMapHitsAndGesturesFrom(container);
        this.getPanes()?.overlayMouseTarget.appendChild(container);
      }

      override draw() {
        const point = this.getProjection()?.fromLatLngToDivPixel(new google.maps.LatLng(lat, lng));
        if (!point) return;
        container.style.left = `${point.x + x}px`;
        container.style.top = `${point.y + y}px`;
      }

      override onRemove() {
        container.remove();
      }
    }

    const overlay = new Overlay();
    overlay.setMap(map);
    return () => overlay.setMap(null);
  }, [map, container, lat, lng, x, y]);

  return createPortal(children, container);
}
