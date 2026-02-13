import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Web/Default implementation
// On web, we often use an iframe or a different map library.
// The current app logic handles the web fallbacks in the screens themselves.

const MapView = (props: any) => <View {...props}>{props.children}</View>;
const Marker = (props: any) => <View {...props} />;
const Circle = (props: any) => <View {...props} />;
const Polyline = (props: any) => <View {...props} />;
const PROVIDER_DEFAULT = 'default';

const WebMapFallback = ({ style }: { style?: any }) => (
    <View style={[styles.fallbackContainer, style]}>
        <Text style={styles.fallbackText}>Web map fallback</Text>
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
export const isMapAvailable = false;
