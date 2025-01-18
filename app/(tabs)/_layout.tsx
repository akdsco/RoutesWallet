import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { useTheme } from "@/hooks";

export default function TabLayout() {
  const theme = useTheme();

  const screenOptions = {
    headerShown: false,
    tabBarActiveTintColor: theme.tint,
    tabBarActiveBackgroundColor: theme.background,
    tabBarInactiveBackgroundColor: theme.tabIconDefault,
    tabBarInactiveTintColor: theme.tabIconSelected,
    tabBarStyle: {
      backgroundColor: theme.background,
      borderTopWidth: 0,
      borderRadius: 10,
      bottom: 0,
    },
  };

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Routes",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="cog" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
