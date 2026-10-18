import React, { Children, isValidElement, type ReactNode } from 'react';
import { AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import type { MapMarkerProps, Point } from 'react-native-maps';

import { Callout, CalloutContext } from './callout';
import type { CalloutContextType } from './callout';
import { createMarkerPressEvent, mapMouseEventToMapEvent } from '../utils/mouse-event';

interface MarkerState {
  calloutVisible: boolean;
}

//Wrapped in class component to provide methods
//forwardRef + useImperativeHandle not sufficient because it returns a ForwardRefExoticComponent which does not seem to render in the MapView
export class Marker extends React.Component<MapMarkerProps, MarkerState> {
  constructor(props: MapMarkerProps) {
    super(props);
    this.state = { calloutVisible: false };
  }

  showCallout() {
    this.setState({ calloutVisible: true });
  }

  hideCallout() {
    this.setState({ calloutVisible: false });
  }

  override render(): React.ReactNode {
    return (
      <MarkerF
        {...this.props}
        calloutVisible={this.state.calloutVisible}
        toggleCalloutVisible={() =>
          this.setState({ calloutVisible: !this.state.calloutVisible })
        }
      />
    );
  }
}

// Default Google Maps marker size, used to place the callout above the marker.
const DEFAULT_MARKER_SIZE = { width: 22, height: 40 };

/**
 * Splits the marker's children between its visual content and its callouts, which are rendered
 * next to the marker (in an InfoWindow or an overlay), not inside it.
 *
 * @param children children of the marker
 */
function partitionChildren(children: ReactNode): [ReactNode[], ReactNode[]] {
  const visual: ReactNode[] = [];
  const callouts: ReactNode[] = [];

  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === Callout) callouts.push(child);
    else visual.push(child);
  });

  return [visual, callouts];
}

interface MarkerFProps extends MapMarkerProps {
  calloutVisible: boolean;
  toggleCalloutVisible: () => void;
}

function MarkerF(props: MarkerFProps) {
  const map = useMap();


  const onMarkerPress = () => {
    if (map) {
      props.onPress?.(
        createMarkerPressEvent(props.coordinate, map, 'marker-press', 'id'),
      );
    }

    props.toggleCalloutVisible();
  };

  //Default anchor values to react-native-maps values (https://github.com/react-native-maps/react-native-maps/blob/master/docs/marker.md)
  const calloutAnchor: Point = props.calloutAnchor || { x: 0.5, y: 0 };

  const calloutContextValue: CalloutContextType = {
    calloutVisible: props.calloutVisible,
    toggleCalloutVisible: props.toggleCalloutVisible,
    coordinate: props.coordinate,
    markerSize: DEFAULT_MARKER_SIZE,
    anchor: calloutAnchor,
  };

  const [visual, callouts] = partitionChildren(props.children);
  const hasContent = visual.length > 0;

  return (
    <CalloutContext.Provider value={calloutContextValue}>
      <AdvancedMarker
        // Custom content is centered on the position; without content, the default pin keeps
        // its bottom-center anchor.
        {...(hasContent && { anchorLeft: '-50%', anchorTop: '-50%' })}
        clickable={props.tappable}
        draggable={props.draggable}
        position={{
          lat: Number(props.coordinate.latitude),
          lng: Number(props.coordinate.longitude),
        }}
        title={props.title}
        {...(props.tappable && {
          onClick: () => onMarkerPress(),
        })}
        {...(props.draggable && {
          onDrag: (e: google.maps.MapMouseEvent) =>
            props.onDrag?.(mapMouseEventToMapEvent(e, props.coordinate, map, '')),
          onDragStart: (e: google.maps.MapMouseEvent) =>
            props.onDragStart?.(mapMouseEventToMapEvent(e, props.coordinate, map, '')),
          onDragEnd: (e: google.maps.MapMouseEvent) =>
            props.onDragEnd?.(mapMouseEventToMapEvent(e, props.coordinate, map, '')),
        })}
      >
        {hasContent ? visual : null}
      </AdvancedMarker>
      {callouts}
    </CalloutContext.Provider>
  );
}
