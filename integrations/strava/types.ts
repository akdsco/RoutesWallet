export type StravaAthleteBasic = {
  id: number;
  username: string | null;
  firstname: string;
  lastname: string;
  profile_medium: string;
};

export type StravaAthlete = StravaAthleteBasic & {
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

export type StravaAuthResponseRaw = Omit<StravaAuthResponse, "athlete"> & {
  scope?: string;
};

export type StravaDisconnectResponse = {
  access_token: string;
} | null;

export type StravaMap = {
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

export type StravaThemeUrl = "dark_url" | "light_url";

type StravaRouteCommon = {
  id: string;
  name: string;
  description: string | null;
  distance: number;
  elevation_gain: number;
  resource_state: number;
  timestamp: number;
  type: number;
  created_at: string;
  private: boolean;
  starred: boolean;
};

export type StravaRouteAPI = StravaRouteCommon & {
  id: BigInt;
  id_str: string;
  athlete: StravaAthlete;
  map: StravaMap;
  map_urls: StravaMapUrls;
  sub_type: number;
  estimated_moving_time: number;
  updated_at: string;
  waypoints: any[];
};

export type StravaRouteBase = StravaRouteCommon & {
  athlete: StravaAthleteBasic;
  map_urls: StravaMapUrls;
};

export type StravaRouteDetailed = Omit<StravaRouteAPI, "id" | "id_str"> & {
  id: string;
};

export type StravaAthleteFlat = {
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
};

export type StravaMapFlat = {
  map_id: string;
  map_summary_polyline: string;
  map_resource_state: number;
};

export type StravaMapUrlsFlat = {
  map_urls_url: string;
  map_urls_retina_url: string;
  map_urls_light_url: string;
  map_urls_dark_url: string;
};

export type StravaRouteBaseFlat = StravaRouteCommon &
  StravaMapUrlsFlat & {
    athlete_id: number;
    athlete_username: string | null;
  };

export type StravaRouteDetailedFlat = StravaRouteBaseFlat &
  StravaAthleteFlat &
  StravaMapFlat & {
    sub_type: number;
    estimated_moving_time: number;
    updated_at: string;
    waypoints: any[];
  };
