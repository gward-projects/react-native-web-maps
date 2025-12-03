import React from 'react';
import { useGoogleMap } from '@react-google-maps/api';
import type { MapMarkerProps, Point} from 'react-native-maps';
import { createMarkerPressEvent, mapMouseEventToMapEvent } from '../utils/mouse-event';
import type { CalloutContextType } from './callout';
import { CalloutContext } from './callout';
import { AdvancedMarker } from './AdvancedMarker';

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

  render(): React.ReactNode {
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

interface MarkerFProps extends MapMarkerProps {
  calloutVisible: boolean;
  toggleCalloutVisible: () => void;
}

function MarkerF(props: MarkerFProps) {
  const map = useGoogleMap();

  const customMarkerContainerRef = React.useRef<HTMLDivElement>(null);
  const [markerSize, setMarkerSize] = React.useState<{
    width: number;
    height: number;
  }>({ width: 22, height: 40 }); //22 x 40 is the default google maps marker size

  React.useEffect(() => {
    if (customMarkerContainerRef.current) {
      setMarkerSize({
        width: customMarkerContainerRef.current.clientWidth,
        height: customMarkerContainerRef.current.clientHeight,
      });
    }
  }, [customMarkerContainerRef.current]);

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
    markerSize,
    anchor: calloutAnchor,
  };

  return (
    <CalloutContext.Provider value={calloutContextValue}>
      <AdvancedMarker
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
        {props.children}
      </AdvancedMarker>
    </CalloutContext.Provider>
  );
}
