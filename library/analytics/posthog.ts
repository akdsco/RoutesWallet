import PostHog from "posthog-react-native";
import { AppConfig, isProduction } from "@/library/config";

export const postHog = new PostHog(AppConfig.POSTHOG_API_KEY, {
  host: "https://eu.i.posthog.com",
  disabled: !isProduction,
});
