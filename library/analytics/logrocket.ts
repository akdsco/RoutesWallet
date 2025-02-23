import { isProduction } from "@/library/config";
import LogRocket from "@logrocket/react-native";

const LOGROCKET_PROJECT_ID = "jhywsk/routes-wallet";

export const initLogRocket = () => {
  if (isProduction) {
    LogRocket.init(LOGROCKET_PROJECT_ID);
  }
};
