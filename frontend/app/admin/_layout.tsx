import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="admin-dashboard" />
      <Stack.Screen name="add-manager" />
      <Stack.Screen name="drivers-details" />
      <Stack.Screen name="drivers-list" />
      <Stack.Screen name="edit-vehicle" />
      <Stack.Screen name="manager-details" />
      <Stack.Screen name="managers-list" />
      <Stack.Screen name="register-driver" />
      <Stack.Screen name="register-vehicle" />
      <Stack.Screen name="vehicle-details" />
      <Stack.Screen name="vehicle-list" />
    </Stack>
  );
}