import { Stack } from "expo-router";
import { useTheme } from "@/hooks";
import { ShareButton } from "@/components/ShareButton/ShareButton";

export default function Layout() {
  const { theme } = useTheme();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[tag]"
        options={({ route }) => ({
          // TODO
          // @ts-ignore
          title: route.params?.tagName || "Selected Tag",
          headerStyle: { backgroundColor: theme.background },
          headerBackTitle: "Tags",
          headerTintColor: theme.tint,
        })}
      />
      <Stack.Screen
        name="tagged-routes"
        options={({ route }) => ({
          // @ts-ignore
          title: route.params?.routeName || "Selected Tag",
          headerStyle: { backgroundColor: theme.background },
          headerBackTitle: "Back",
          headerTintColor: theme.tint,
          headerRight: () => <ShareButton route={route} />,
        })}
      />
    </Stack>
  );
}
