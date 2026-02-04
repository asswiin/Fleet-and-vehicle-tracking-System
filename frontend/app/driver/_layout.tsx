import { Stack } from "expo-router";

export default function DriverLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="driver-dashboard" />
      <Stack.Screen name="active-trip" />
      <Stack.Screen name="driver-profile" />
      <Stack.Screen name="edit-driver-profile" />
      <Stack.Screen name="punching-history" />
      <Stack.Screen name="punching" />
      <Stack.Screen name="select-location" />
      <Stack.Screen name="select-vehicle" />
      <Stack.Screen name="trip-notifications" />
    </Stack>
  );
}