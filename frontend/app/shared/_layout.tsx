import { Stack } from "expo-router";

export default function SharedLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="home" />
      <Stack.Screen name="login" />
      <Stack.Screen name="role-selection" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}