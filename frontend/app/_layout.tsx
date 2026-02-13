import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />
      <Stack.Screen
        name="shared"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="admin"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="manager"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="driver"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="track-parcel"
        options={{
          headerShown: false,
          title: "Track Parcel",
        }}
      />
    </Stack>
  );
}

