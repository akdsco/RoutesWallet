import Toast, { BaseToastProps } from "react-native-toast-message";
import {
  ToastError,
  ToastInfo,
  ToastSuccess,
  ToastWarning,
} from "@/components/Toast";

const toastConfig = {
  info: (props: BaseToastProps) => <ToastInfo {...props} />,
  warning: (props: BaseToastProps) => <ToastWarning {...props} />,
  error: (props: BaseToastProps) => <ToastError {...props} />,
  success: (props: BaseToastProps) => <ToastSuccess {...props} />,
};

type ToastType = "info" | "success" | "warning" | "error";

const TopToast = (type: ToastType, title?: string, message?: string) => {
  Toast.show({
    type,
    text1: title,
    text2: message,
    topOffset: 55,
  });
};

export { TopToast as Toast, toastConfig };
