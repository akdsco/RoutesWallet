export type StravaAthleteBasic = {
  username: string | null;
  firstname: string;
  lastname: string;
  profile_medium: string;
};

export type StravaAthlete = StravaAthleteBasic & {
  id: number;
  resource_state: number;
  bio: string | null;
  city: string;
  state: string | null;
  country: string | null;
  sex: string;
  premium: boolean;
  summit: boolean;
  created_at: string;
  updated_at: string;
  badge_type_id: number;
  profile: string;
  friend: null;
  follower: null;
  weight?: number;
};

export type StravaAuthResponse = {
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete: StravaAthlete;
};

export type StravaDisconnectResponse = {
  access_token: string;
} | null;

export type StravaAuthResponseRaw = Omit<StravaAuthResponse, "athlete"> & {
  scope?: string;
};

type StravaMap = {
  id: string;
  summary_polyline: string;
  resource_state: number;
};

type StravaMapUrls = {
  url: string;
  retina_url: string;
  light_url: string;
  dark_url: string;
};

export type StravaRouteDetailed = {
  athlete: StravaAthlete;
  description: string | null;
  distance: number;
  elevation_gain: number;
  id: BigInt;
  id_str: string;
  map: StravaMap;
  map_urls: StravaMapUrls;
  name: string;
  private: boolean;
  resource_state: number;
  starred: boolean;
  sub_type: number;
  created_at: string; // ISO 8601 date string
  updated_at: string; // ISO 8601 date string
  timestamp: BigInt;
  type: number;
  estimated_moving_time: BigInt;
  waypoints: any[];
};

export type StravaRouteBase = {
  athlete: Pick<StravaAthlete, "id" | "username">;
  id: BigInt;
  id_str: string;
  name: string;
  starred: boolean;
  created_at: string;
  description: string | null;
  distance: number;
  elevation_gain: number;
  resource_state: number;
  timestamp: BigInt;
  type: number;
  map_urls: StravaMapUrls;
};

export type StravaRouteBaseFlat = {
  athlete_id: number;
  athlete_username: string | null;
  description: string | null;
  distance: number;
  elevation_gain: number;
  id: BigInt;
  id_str: string;
  map_urls_url: string;
  map_urls_retina_url: string;
  map_urls_light_url: string;
  map_urls_dark_url: string;
  name: string;
  private: boolean;
  resource_state: number;
  starred: boolean;
  created_at: string;
  timestamp: BigInt;
  type: number;
};

export type StravaRouteDetailedFlat = {
  athlete_id: number;
  athlete_username: string | null;
  athlete_resource_state: number;
  athlete_firstname: string;
  athlete_lastname: string;
  athlete_bio: string | null;
  athlete_city: string;
  athlete_state: string | null;
  athlete_country: string | null;
  athlete_sex: string;
  athlete_premium: boolean;
  athlete_summit: boolean;
  athlete_created_at: string;
  athlete_updated_at: string;
  athlete_badge_type_id: number;
  athlete_profile_medium: string;
  athlete_profile: string;
  athlete_friend: null;
  athlete_follower: null;
  athlete_weight?: number;
  description: string | null;
  distance: number;
  elevation_gain: number;
  id: BigInt;
  id_str: string;
  map_id: string;
  map_summary_polyline: string;
  map_resource_state: number;
  map_urls_url: string;
  map_urls_retina_url: string;
  map_urls_light_url: string;
  map_urls_dark_url: string;
  name: string;
  private: boolean;
  resource_state: number;
  starred: boolean;
  sub_type: number;
  created_at: string;
  updated_at: string;
  timestamp: BigInt;
  type: number;
  estimated_moving_time: BigInt;
  waypoints: any[];
};

export type StravaThemeUrl = "dark_url" | "light_url";
