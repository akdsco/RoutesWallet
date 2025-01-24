import { Stack } from "expo-router";
import { useTheme } from "@/hooks";

export default function Layout() {
  const theme = useTheme();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[tagged-routes]"
        options={({ route }) => ({
          // TODO
          // @ts-ignore
          title: route.params?.tagName || "Selected Tag",
          headerStyle: { backgroundColor: theme.background },
          headerBackTitle: "Groups",
          headerTintColor: theme.tint,
        })}
      />
    </Stack>
  );
}
