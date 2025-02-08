import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { useTheme } from "@/hooks";

export default function TabLayout() {
  const { theme } = useTheme();
  const iconSize = 28;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tint,
        tabBarActiveBackgroundColor: theme.background,
        tabBarInactiveBackgroundColor: theme.background,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopWidth: 0,
          borderRadius: 10,
          bottom: 0,
        },
        // TODO: add tabs animation, figure out how to make it work for dark backgrounds
        // animation: "fade",
      }}
    >
      <Tabs.Screen
        name="routes"
        options={{
          title: "Routes",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={iconSize} name="map-signs" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tags"
        options={{
          title: "Tags",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={iconSize} name="tags" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={iconSize} name="cog" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
