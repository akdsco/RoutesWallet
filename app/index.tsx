import { View } from "react-native";
import { Logo } from "@/components/Logo/Logo";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Logo />
    </View>
  );
}
