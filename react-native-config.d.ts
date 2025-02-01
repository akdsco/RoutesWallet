declare module "react-native-config" {
  export interface NativeConfig {
    STRAVA_CLIENT_ID: string;
    STRAVA_CLIENT_SECRET: string;
    STRAVA_REDIRECT_URI: string;
  }

  export const Config: NativeConfig;
  export default Config;
}
