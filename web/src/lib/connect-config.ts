/**
 * Fail-loud guard for the connect flow's server config (TB-116). A missing or
 * blank Strava secret / session key is a **permanent** misconfiguration, not a
 * transient error — so the callback surfaces it distinctly (an explicit log + a
 * "temporarily unavailable" status) instead of POSTing an undefined secret to
 * Strava and returning a generic 400 the member is told to "try again". This is
 * the TB-99 permanent-vs-transient split applied to config. Pure + unit-tested.
 */
export type ConnectConfig = {
  STRAVA_CLIENT_ID?: string;
  STRAVA_CLIENT_SECRET?: string;
  SESSION_SECRET?: string;
};

const REQUIRED = [
  'STRAVA_CLIENT_ID',
  'STRAVA_CLIENT_SECRET',
  'SESSION_SECRET',
] as const;

/** The names of any required config vars that are absent or blank. */
export function missingConnectConfig(env: ConnectConfig): string[] {
  return REQUIRED.filter((key) => {
    const value = env[key];
    return typeof value !== 'string' || value.trim() === '';
  });
}
