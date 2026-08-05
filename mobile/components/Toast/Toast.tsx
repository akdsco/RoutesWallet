import { Text, View } from "react-native";
import { useTheme } from "@/hooks";
import { PropsWithChildren } from "react";
import { BaseToastProps } from "react-native-toast-message";

type GenericToastProps = PropsWithChildren<BaseToastProps>;

export const GenericToast = ({ children, text1, text2 }: GenericToastProps) => {
  const { theme } = useTheme();

  return (
    <View
      className="flex flex-row items-center w-full max-w-sm p-4 mb-4 text-gray-500 bg-white rounded-lg shadow-sm dark:text-gray-400 dark:bg-gray-800"
      role="alert"
    >
      {children}
      <View className="max-w-xs">
        <Text
          style={{ color: theme.text }}
          className="ms-3 text-md font-normal"
        >
          {text1}
        </Text>
        {text2 && (
          <Text className="ms-3 mt-1 text-sm font-normal color-gray-400">
            {text2}
          </Text>
        )}
      </View>
    </View>
  );
};
