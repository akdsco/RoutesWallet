// TODO: implement below tables use across the whole app
export const tables = {
  stravaAuthResponse: "StravaAuthResponse",
  stravaAthlete: "StravaAthlete",
  stravaRoute: "StravaRoute",
  stravaMap: "StravaMap",
  stravaMapUrls: "StravaMapUrls",
  routeTags: "RouteTags",
  routeTagAssignments: "RouteTagAssignments",
  athleteTagOrder: "AthleteTagOrder",
};

export const createStravaAthleteTable = `
  CREATE TABLE IF NOT EXISTS ${tables.stravaAthlete} (
    id INTEGER PRIMARY KEY NOT NULL,
    username TEXT,
    resource_state INTEGER NOT NULL,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    bio TEXT,
    city TEXT NOT NULL,
    state TEXT,
    country TEXT,
    sex TEXT NOT NULL,
    premium BOOLEAN NOT NULL,
    summit BOOLEAN NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    badge_type_id INTEGER NOT NULL,
    profile_medium TEXT NOT NULL,
    profile TEXT NOT NULL,
    friend TEXT,
    follower TEXT,
    weight REAL
  );`;

export const createStravaAuthResponseTable = `
  CREATE TABLE IF NOT EXISTS ${tables.stravaAuthResponse} (
    scope TEXT,
    token_type TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    expires_in INTEGER NOT NULL,
    refresh_token TEXT NOT NULL,
    access_token TEXT NOT NULL,
    athlete_id INTEGER NOT NULL UNIQUE,
    FOREIGN KEY (athlete_id) REFERENCES StravaAthlete(id)
  );`;

export const createStravaMapTable = `
  CREATE TABLE IF NOT EXISTS ${tables.stravaMap} (
    id TEXT PRIMARY KEY NOT NULL,
    summary_polyline TEXT NOT NULL,
    resource_state INTEGER NOT NULL
  );`;

export const createStravaMapUrlsTable = `
  CREATE TABLE IF NOT EXISTS ${tables.stravaMapUrls} (
    url TEXT NOT NULL,
    retina_url TEXT NOT NULL,
    light_url TEXT NOT NULL,
    dark_url TEXT NOT NULL
  );`;

export const createStravaRouteTable = `
  CREATE TABLE IF NOT EXISTS ${tables.stravaRoute} (
    athlete_id INTEGER NOT NULL,
    description TEXT,
    distance REAL NOT NULL,
    elevation_gain REAL NOT NULL,
    id BIGINT PRIMARY KEY NOT NULL,
    id_str TEXT NOT NULL,
    map_id TEXT NOT NULL,
    map_urls_id TEXT NOT NULL,
    name TEXT NOT NULL,
    private BOOLEAN NOT NULL,
    resource_state INTEGER NOT NULL,
    starred BOOLEAN NOT NULL,
    sub_type INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    type INTEGER NOT NULL,
    estimated_moving_time BIGINT NOT NULL,
    waypoints TEXT,
    FOREIGN KEY (athlete_id) REFERENCES StravaAthlete(id),
    FOREIGN KEY (map_id) REFERENCES StravaMap(id),
    FOREIGN KEY (map_urls_id) REFERENCES StravaMapUrls(url)
  );`;

export const createRouteTagsTable = `
  CREATE TABLE IF NOT EXISTS ${tables.routeTags} (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL UNIQUE, -- Unique tag name
    color TEXT NOT NULL DEFAULT '#687076', -- Default color is grey
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`;

export const primeRouteTags = `
  INSERT INTO ${tables.routeTags} (name, color) VALUES 
    ('Long routes', 'red'),
    ('Weekend getaways', '#FFB3B3'),
    ('Short and punchy', '#687076'),
    ('Best climbs', 'blue');
  `;

export const athleteTagOrder = `
  CREATE TABLE IF NOT EXISTS ${tables.athleteTagOrder} (
    athlete_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    order_position INTEGER NOT NULL,
    PRIMARY KEY (athlete_id, tag_id),
    FOREIGN KEY (athlete_id) REFERENCES StravaAthlete(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES RouteTags(id) ON DELETE CASCADE
  );`;

export const createRouteTagAssignmentsTable = `
  CREATE TABLE IF NOT EXISTS ${tables.routeTagAssignments} (
    route_id BIGINT NOT NULL,
    tag_id INTEGER NOT NULL,
    assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (route_id, tag_id),
    FOREIGN KEY (route_id) REFERENCES StravaRoute(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES RouteTags(id) ON DELETE CASCADE
  );`;
