import PostHog from "posthog-react-native";
import { AppConfig, isProduction } from "@/library/config";

export const postHog = new PostHog(AppConfig.POSTHOG_API_KEY, {
  host: "https://eu.i.posthog.com",
  // Why using "memory" persistence?
  // https://github.com/PostHog/posthog-js-lite/issues/140
  // https://chatgpt.com/share/67bbac5d-5370-800c-8e14-07bcf0e78716
  persistence: "memory",
  disabled: !isProduction,
});
