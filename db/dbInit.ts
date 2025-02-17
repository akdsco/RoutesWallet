import { type SQLiteDatabase } from "expo-sqlite";
import {
  createAthleteTagOrderTable,
  createRouteTagAssignmentsTable,
  createRouteTagsTable,
  createStravaAthleteTable,
  createStravaAuthResponseTable,
  createStravaMapTable,
  createStravaMapUrlsTable,
  createStravaRouteTable,
  loadDbWithInitialTags,
} from "@/db/tables";
import { log } from "@/library/logger";

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
    await initialiseDatabaseTables(db);

    currentDbVersion = 1;
  }

  if (currentDbVersion === 1) {
    // Add migrations
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

const initialiseDatabaseTables = async (db: SQLiteDatabase) => {
  try {
    const setJournalMode = `PRAGMA journal_mode = 'wal';`;
    await db.execAsync(setJournalMode);

    const stravaAthleteTablePromise = db.execAsync(createStravaAthleteTable);
    const stravaAuthResponseTablePromise = db.execAsync(
      createStravaAuthResponseTable,
    );
    const stravaMapTablePromise = db.execAsync(createStravaMapTable);
    const stravaMapUrlsTablePromise = db.execAsync(createStravaMapUrlsTable);
    const stravaRouteTablePromise = db.execAsync(createStravaRouteTable);
    const stravaRouteTagsTablePromise = db.execAsync(createRouteTagsTable);
    const athleteTagOrderTablePromise = db.execAsync(
      createAthleteTagOrderTable,
    );
    const routeTagsAssignmentsTablePromise = db.execAsync(
      createRouteTagAssignmentsTable,
    );

    // Set all tables
    await Promise.all([
      stravaAthleteTablePromise,
      stravaAuthResponseTablePromise,
      stravaMapTablePromise,
      stravaMapUrlsTablePromise,
      stravaRouteTablePromise,
      stravaRouteTagsTablePromise,
      athleteTagOrderTablePromise,
      routeTagsAssignmentsTablePromise,
    ]);

    const routeTagsTableDataPromise = db.execAsync(loadDbWithInitialTags);

    // Prime tables with initial data
    await Promise.all([routeTagsTableDataPromise]);
  } catch (error) {
    log.error("initialiseDatabaseTables", "Error when creating tables", {
      error,
    });
  }

  log.info("initialiseDatabaseTables", "Database tables created");
};
