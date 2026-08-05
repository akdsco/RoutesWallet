import { useRoute } from "@react-navigation/core";
import { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { getRouteIdsByTagId } from "@/db/methods";

export const useTaggedRoutes = () => {
  const [loading, setLoading] = useState(true);
  const db = useSQLiteContext();
  const { params } = useRoute();
  const [routeIds, setRouteIds] = useState<string[]>([]);

  useEffect(() => {
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
