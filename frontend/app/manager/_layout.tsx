import { Stack } from "expo-router";

export default function ManagerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="manager-dashboard" />
      <Stack.Screen name="add-parcel" />
      <Stack.Screen name="assign-trip" />
      <Stack.Screen name="edit-manager-profile" />
      <Stack.Screen name="edit-parcel" />
      <Stack.Screen name="manager-profile" />
      <Stack.Screen name="parcel-details" />
      <Stack.Screen name="parcel-list" />
      <Stack.Screen name="selecting-parcel" />
      <Stack.Screen name="selecting-parcel-improved" />
      <Stack.Screen name="reassign-driver" />
      <Stack.Screen name="trip-assignment-detail" />
      <Stack.Screen name="trip-confirmation" />
      <Stack.Screen name="trip-summary" />

      <Stack.Screen name="trip-list" />
      <Stack.Screen name="trip-details" />
      <Stack.Screen name="track-trip" />
      <Stack.Screen name="edit-trip" />
    </Stack>
  );
}