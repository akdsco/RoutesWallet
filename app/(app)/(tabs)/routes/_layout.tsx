import { Stack } from "expo-router";
import { useTheme } from "@/hooks";

export default function HomeLayout() {
  const { theme } = useTheme();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[route]"
        options={({ route }) => ({
          // TODO
          // @ts-ignore
          title: route.params?.routeName || "Selected Route",
          headerStyle: { backgroundColor: theme.background },
          headerBackTitle: "Routes",
          headerTintColor: theme.tint,
        })}
      />
    </Stack>
  );
}
