import React, { JSX, memo, type ReactElement, useMemo, useState } from 'react';
import type { MapMarkerProps } from 'react-native-maps';
import Supercluster, {
  type AnyProps,
  type ClusterFeature,
  type ClusterProperties,
  type PointFeature,
} from 'supercluster';

import { Cluster } from './cluster';
import type { ClusterProps, MarkerClustererProps } from './types';
import { getBoundByRegion } from '../../utils/region';
import { Marker } from '../marker';

type ClusterType = (PointFeature<{
  node: JSX.Element
  cluster: boolean
}> | ClusterFeature<AnyProps>);

function MarkerClustererComponent(props: MarkerClustererProps) {
  const [supercluster] = useState(
    () => new Supercluster<{ node: JSX.Element; cluster: boolean }>(),
  );

  const markers = useMemo(
    () =>
      (React.Children.toArray(props.children).filter((child) => {
        return (child as ReactElement).type === Marker;
      }) as ReactElement<MapMarkerProps>[]) || [],
    [props.children],
  );

  const points = useMemo<
    PointFeature<{ node: JSX.Element; cluster: boolean }>[]
  >(
    () =>
      markers.map((node) => ({
        type: 'Feature',
        properties: { cluster: false, node },
        geometry: {
          type: 'Point',
          coordinates: [
            Number(node.props.coordinate.longitude),
            Number(node.props.coordinate.latitude),
          ],
        },
      })),
    [markers],
  );

  const clusters: ClusterType[] = useMemo(() => {
    if (!props.region) return [];

    const bbox = getBoundByRegion(props.region);

    supercluster.load(points);

    return supercluster.getClusters(
      bbox,
      Math.round(Math.log(360 / props.region.longitudeDelta) / Math.LN2),
    );
  }, [props.region, points, supercluster]);

  return (
    <>
      {clusters.map((feature: ClusterType, idx: number) => {
        const clusterProperties =
          feature.properties as ClusterProperties;

        const clusterProps: ClusterProps = {
          expansionZoom: supercluster.getClusterExpansionZoom(
            clusterProperties.cluster_id,
          ),
          pointCount: clusterProperties.point_count,
          pointCountAbbreviated: clusterProperties.point_count_abbreviated,
          coordinate: {
            longitude: feature.geometry.coordinates[0]!,
            latitude: feature.geometry.coordinates[1]!,
          },
        };

        return (
          <React.Fragment key={idx.toString()}>
            {feature.properties.cluster
              ? props.renderCluster?.(clusterProps) || (
              <Cluster {...clusterProps} />
            )
              : feature.properties.node}
          </React.Fragment>
        );
      })}
    </>
  );
}

export const MarkerClusterer = memo(MarkerClustererComponent);
