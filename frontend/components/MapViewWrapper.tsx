// Web platform implementation - no react-native-maps on web
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Stub components for web platform
const MapView: any = null;
const Marker: any = null;
const Circle: any = null;
const PROVIDER_DEFAULT: any = null;

// Web fallback component
const WebMapFallback = ({ style }: { style?: any }) => (
  <View style={[styles.fallbackContainer, style]}>
    <Text style={styles.fallbackTitle}>🗺️ Map View</Text>
    <Text style={styles.fallbackText}>
      Maps are only available on mobile devices.
    </Text>
    <Text style={styles.fallbackSubtext}>
      Please use the Android or iOS app to view the map.
    </Text>
  </View>
);

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 20,
  },
  fallbackTitle: {
    fontSize: 24,
    marginBottom: 12,
  },
  fallbackText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  fallbackSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
});

export { MapView, Marker, Circle, PROVIDER_DEFAULT, WebMapFallback };
export const isMapAvailable = false;
