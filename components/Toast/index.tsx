import { BaseToastProps } from "react-native-toast-message";
import { GenericToast } from "@/components/Toast/Toast";
import { useTheme } from "@/hooks";
import {
  CrossIcon,
  ExclamationIcon,
  InfoIcon,
  SuccessCheckmark,
} from "@/components/Icon/ToastIcons";

export const ToastSuccess = ({ ...props }: BaseToastProps) => {
  const { theme } = useTheme();

  return (
    <GenericToast {...props}>
      <SuccessCheckmark fill={theme.toast.success} />
    </GenericToast>
  );
};

export const ToastError = ({ ...props }: BaseToastProps) => {
  const { theme } = useTheme();

  return (
    <GenericToast {...props}>
      <CrossIcon fill={theme.toast.error} />
    </GenericToast>
  );
};

export const ToastWarning = ({ ...props }: BaseToastProps) => {
  const { theme } = useTheme();

  return (
    <GenericToast {...props}>
      <ExclamationIcon fill={theme.toast.warning} />
    </GenericToast>
  );
};

export const ToastInfo = ({ ...props }: BaseToastProps) => {
  const { theme } = useTheme();

  return (
    <GenericToast {...props}>
      <InfoIcon fill={theme.toast.info} />
    </GenericToast>
  );
};
