import { useRoute } from "@react-navigation/core";
import { useEffect, useState } from "react";
import { SQLiteDatabase, useSQLiteContext } from "expo-sqlite";
import { log } from "@/library/logger";

export const useTaggedRoutes = () => {
  const [loading, setLoading] = useState(true);
  const db = useSQLiteContext();
  const { params } = useRoute();
  const [routeIds, setRouteIds] = useState<bigint[]>([]);

  // TODO: move to DB files
  const getRouteIdsByTagId =
    (db: SQLiteDatabase) =>
    async (tagId: number): Promise<bigint[]> => {
      try {
        const query = `SELECT route_id FROM RouteTagAssignments WHERE tag_id = ?`;

        const results = await db.getAllAsync<{ route_id: bigint }>(query, [
          tagId,
        ]);

        const routeIds = results.map(({ route_id }) => route_id);

        log.info("useTaggedRoutes", `Fetched route IDs for tag ${tagId}`, {
          routeIds,
        });

        return routeIds;
      } catch (error) {
        // TODO: notify user of error?
        log.error("useTaggedRoutes", "Error fetching route IDs by tag", {
          error,
        });
        return [];
      }
    };

  useEffect(() => {
    console.log(params);
    const useEffectRun = async () => {
      if (!params) {
        return;
      }

      // @ts-ignore
      const routeIds = await getRouteIdsByTagId(db)(params.tag);
      setRouteIds(routeIds);
    };

    useEffectRun().then(() => setLoading(false));
  }, []);

  return {
    loading,
    routeIds,
  };
};
