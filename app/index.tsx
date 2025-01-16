import "expo-dev-client";
import React, { useEffect, useState } from "react";
import { StravaRoutes } from "@/containers/StravaRoutes";
import { useRouter } from "expo-router";
import { Loader } from "@/components/Loader";
import { SQLiteDatabase, useSQLiteContext } from "expo-sqlite";
import { getUserData, SECURE } from "@/db/secureStore";

export default function Index() {
  const router = useRouter();
  const db = useSQLiteContext();
  const [isLoading, setIsLoading] = useState(true);
  const [noRoutesAvailable, setNoRoutesAvailable] = useState(true);

  useEffect(() => {
    const checkRoutes = async () => {
      try {
        const athleteId = await getUserData<number>(SECURE.USER_ID);
        const routesAvailable = await areAnyRoutesAvailable(db)(athleteId);
        console.debug("Routes available?", routesAvailable);
        setNoRoutesAvailable(!routesAvailable);
      } catch (error) {
        console.error("Error checking routes:", error);
        setNoRoutesAvailable(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkRoutes();
  }, []);

  useEffect(() => {
    if (!isLoading && noRoutesAvailable) {
      router.replace("/authorise");
    }
  }, [isLoading, noRoutesAvailable, router]);

  if (isLoading) {
    // TODO: if end up using this loader, improve this
    return <Loader />;
  }

  if (noRoutesAvailable) {
    return null;
  }

  return <StravaRoutes />;
}

const areAnyRoutesAvailable =
  (db: SQLiteDatabase) =>
  async (athleteId: number): Promise<boolean> => {
    // TODO change to check only if there is at least one route
    console.debug("Getting routes for athleteId", athleteId);

    const query = `SELECT * FROM StravaRoute WHERE athlete_id = ?`;
    const allRoutes = await db.getAllAsync(query, [athleteId]);

    return allRoutes.length > 0;
  };
