import { Stack } from "expo-router";
import { LogBox } from "react-native";

// Suppress specific warnings from older third-party dependencies doing deprecated React Native imports
LogBox.ignoreLogs([
  "ProgressBarAndroid has been extracted from react-native core",
  "Clipboard has been extracted from react-native core",
  "PushNotificationIOS has been extracted from react-native core",
]);

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
    </Stack>
  );
}

