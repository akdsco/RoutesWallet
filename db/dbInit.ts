import { type SQLiteDatabase } from "expo-sqlite";

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 1;

  const userVersionObject = await db.getFirstAsync<{
    user_version: number;
  }>("PRAGMA user_version");

  if (!userVersionObject) {
    throw new Error("User database version not found");
  }

  let { user_version: currentDbVersion } = userVersionObject;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    const createTablesSQL = `
      PRAGMA journal_mode = 'wal';
    
      CREATE TABLE IF NOT EXISTS StravaAthlete (
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
      );
    
      CREATE TABLE IF NOT EXISTS StravaAuthResponse (
        scope TEXT NOT NULL,
        token_type TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        expires_in INTEGER NOT NULL,
        refresh_token TEXT NOT NULL,
        access_token TEXT NOT NULL,
        athlete_id INTEGER NOT NULL UNIQUE,
        FOREIGN KEY (athlete_id) REFERENCES StravaAthlete(id)
      );
    
      CREATE TABLE IF NOT EXISTS StravaMap (
        id TEXT PRIMARY KEY NOT NULL,
        summary_polyline TEXT NOT NULL,
        resource_state INTEGER NOT NULL
      );
    
      CREATE TABLE IF NOT EXISTS StravaMapUrls (
        url TEXT NOT NULL,
        retina_url TEXT NOT NULL,
        light_url TEXT NOT NULL,
        dark_url TEXT NOT NULL
      );
    
      CREATE TABLE IF NOT EXISTS StravaRoute (
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
      );
      
      CREATE TABLE IF NOT EXISTS RouteTags (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        name TEXT NOT NULL UNIQUE, -- Unique tag name
        color TEXT NOT NULL DEFAULT '#687076', -- Default color is grey
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      
      CREATE TABLE IF NOT EXISTS RouteTagAssignments (
        route_id BIGINT NOT NULL,
        tag_id INTEGER NOT NULL,
        assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (route_id, tag_id),
        FOREIGN KEY (route_id) REFERENCES StravaRoute(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES RouteTags(id) ON DELETE CASCADE
      );
      
    `;

    await db.execAsync(createTablesSQL);

    // TODO: do we want to prime the db with some data?
    // await db.runAsync(
    //   "INSERT INTO todos (value, intValue) VALUES (?, ?)",
    //   "hello",
    //   1,
    // );
    // await db.runAsync(
    //   "INSERT INTO todos (value, intValue) VALUES (?, ?)",
    //   "world",
    //   2,
    // );

    currentDbVersion = 1;
  }

  if (currentDbVersion === 1) {
    // Add more migrations
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
