export type StravaAthlete = {
  id: number;
  username: number | null;
  resource_state: number;
  firstname: string;
  lastname: string;
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
  profile_medium: string;
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

export type StravaRoute = {
  athlete: StravaAthlete;
  description: string | null;
  distance: number;
  elevation_gain: number;
  id: number;
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
  timestamp: number;
  type: number;
  estimated_moving_time: number;
  waypoints: any[];
};
