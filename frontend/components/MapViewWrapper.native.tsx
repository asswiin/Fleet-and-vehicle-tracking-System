import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapViewNative, { Marker, Circle, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

export interface MapViewMethods {
  animateToRegion: (region: any, duration?: number) => void;
  fitToCoordinates: (coordinates: any[], options?: any) => void;
}

const MapView = MapViewNative;

// Fallback component (not used on native, but exported for consistency)
const WebMapFallback = ({ style }: { style?: any }) => (
  <View style={[styles.fallbackContainer, style]}>
    <Text style={styles.fallbackText}>Map unavailable</Text>
  </View>
);

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  fallbackText: {
    color: '#64748B',
  },
});

export { MapView, Marker, Circle, Polyline, PROVIDER_DEFAULT, WebMapFallback };
export const isMapAvailable = true;
