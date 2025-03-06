import { filterRoutes } from "@/library/routes/filter";
import { StravaRouteCommonFilterable } from "@/integrations/strava";
import Fuse from "fuse.js";
import { FilterBy } from "@/containers/StravaRoutes/useRoutesFilters.hook";

const noMissingDataRoutes: StravaRouteCommonFilterable[] = [
  {
    id: "1",
    name: "Hut in the Wild route",
    description: "Eloquent route",
    distance: 5 * 1000, // In meters
    created_at: "2021-01-01T00:00:00Z",
    elevation_gain: 100,
    estimated_moving_time: 30 * 60, // In seconds
  },
  {
    id: "2",
    name: "Mountain Peak route",
    description: "Difficult route",
    distance: 10 * 1000, // In meters
    created_at: "2022-01-01T00:00:00Z",
    elevation_gain: 110,
    estimated_moving_time: 35 * 60, // In seconds
  },
  {
    id: "3",
    name: "Lake View route",
    description: "Easy route through the forest",
    distance: 15 * 1000, // In meters
    created_at: "2023-01-01T00:00:00Z",
    elevation_gain: 120,
    estimated_moving_time: 40 * 60, // In seconds
  },
];

const fuse = new Fuse(noMissingDataRoutes, {
  includeScore: true,
  threshold: 0.4,
  keys: ["name", "description"],
});

describe("Filter Routes", () => {
  const filterBy: FilterBy = {
    search: true,
    distance: true,
    elevation: true,
    movingTime: true,
  };
  it("Should get all routes when no filters are applied", () => {
    const noFilterResult = filterRoutes(
      noMissingDataRoutes,
      fuse,
      filterBy,
      {},
    );
    expect(noFilterResult.length).toBe(noMissingDataRoutes.length);
  });
  describe("Fuse Text Search", () => {
    const filterBy: FilterBy = {
      search: true,
      distance: false,
      elevation: false,
      movingTime: false,
    };

    it("should return the route matching a part of its name", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        searchTerm: "Hut wild",
      });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("1");
    });

    it("should return the route matching a part of its description", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        searchTerm: "Difficult",
      });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("2");
    });

    it("should return all routes when a common word is searched", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        searchTerm: "route",
      });
      expect(result.length).toBe(3);
    });

    it("should be case-insensitive in search", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        searchTerm: "hut in the wild",
      });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("1");
    });

    it("should return no routes if the search query does not match any route", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        searchTerm: "Nonexistent",
      });
      expect(result.length).toBe(0);
    });
  });

  describe("Distance", () => {
    const filterBy: FilterBy = {
      search: false,
      distance: true,
      elevation: false,
      movingTime: false,
    };

    it("Should filter by distance", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        minDistance: 6,
        maxDistance: 14,
      });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("2");
    });
    it("Should get two routes", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        minDistance: 5,
        maxDistance: 10,
      });
      expect(result.length).toBe(2);
      expect(result[0].id).toBe("1");
      expect(result[1].id).toBe("2");
    });
    it("Should get all routes when on boundaries", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        minDistance: 5,
        maxDistance: 15,
      });
      expect(result.length).toBe(3);
    });
    it("Should get no routes", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        minDistance: 0,
        maxDistance: 4,
      });
      expect(result.length).toBe(0);
    });
  });
  describe("Elevation Gain", () => {
    const filterBy: FilterBy = {
      search: false,
      distance: false,
      elevation: true,
      movingTime: false,
    };
    it("Should filter by elevation gain", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        minElevationGain: 101,
        maxElevationGain: 119,
      });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("2");
    });
    it("Should get two routes", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        minElevationGain: 100,
        maxElevationGain: 110,
      });
      expect(result.length).toBe(2);
      expect(result[0].id).toBe("1");
      expect(result[1].id).toBe("2");
    });
    it("Should get all routes when on boundaries", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        minElevationGain: 100,
        maxElevationGain: 120,
      });
      expect(result.length).toBe(3);
      expect(result[0].id).toBe("1");
      expect(result[1].id).toBe("2");
    });
    it("Should get no routes", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        minElevationGain: 0,
        maxElevationGain: 99,
      });
      expect(result.length).toBe(0);
    });
  });
  xdescribe("Created At", () => {
    it("Should filter by created at", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        startDate: "2022-01-01T00:00:00Z",
        endDate: "2022-12-31T23:59:59Z",
      });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("2");
    });
    it("Should get two routes when on boundaries", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        startDate: "2021-01-01T00:00:00Z",
        endDate: "2022-01-01T00:00:00Z",
      });
      expect(result.length).toBe(2);
      expect(result[0].id).toBe("1");
      expect(result[1].id).toBe("2");
    });
    it("Should get no routes", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        startDate: "2024-01-01T00:00:00Z",
        endDate: "2024-12-31T23:59:59Z",
      });
      expect(result.length).toBe(0);
    });
  });
  describe("Estimated Moving Time", () => {
    const filterBy: FilterBy = {
      search: false,
      distance: false,
      elevation: false,
      movingTime: true,
    };

    it("Should filter by estimated moving time", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        minEstimatedMovingTime: 31,
        maxEstimatedMovingTime: 39,
      });

      expect(result.length).toBe(1);
    });
    it("Should get all routes when on boundaries", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        minEstimatedMovingTime: 30,
        maxEstimatedMovingTime: 40,
      });
      expect(result.length).toBe(3);
    });
    it("Should get no routes", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        minEstimatedMovingTime: 0,
        maxEstimatedMovingTime: 29,
      });
      expect(result.length).toBe(0);
    });
  });
  describe("Mixed Filters", () => {
    it("Should filter by distance and elevation gain", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        minDistance: 6,
        maxDistance: 14,
        minElevationGain: 101,
        maxElevationGain: 119,
      });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("2");
    });
    it("Should filter by distance, elevation gain, and created at", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        minDistance: 6,
        maxDistance: 14,
        minElevationGain: 101,
        maxElevationGain: 119,
        startDate: "2022-01-01T00:00:00Z",
        endDate: "2022-12-31T23:59:59Z",
      });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("2");
    });
    it("Should filter by distance, elevation gain, created at, and estimated moving time - min values test", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        minDistance: 14,
        maxDistance: undefined,
        minElevationGain: 115,
        maxElevationGain: undefined,
        startDate: "2022-01-01T00:00:00Z",
        endDate: undefined,
        minEstimatedMovingTime: 5,
        maxEstimatedMovingTime: undefined,
      });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("3");
    });
    it("Should filter by distance, elevation gain, created at, and estimated moving time - max values test", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        minDistance: undefined,
        maxDistance: 14,
        minElevationGain: undefined,
        maxElevationGain: 109,
        startDate: undefined,
        endDate: "2022-01-01T00:00:00Z",
        minEstimatedMovingTime: undefined,
        maxEstimatedMovingTime: 34,
      });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("1");
    });
  });
  describe("Combined Mixed Filters", () => {
    const filterBy: FilterBy = {
      search: true,
      distance: true,
      elevation: true,
      movingTime: true,
    };

    it("should return only the Lake View route when all filters narrow to route 3", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        searchTerm: "lake",
        minDistance: 14,
        maxDistance: 16,
        minElevationGain: 115,
        maxElevationGain: 125,
        minEstimatedMovingTime: 39,
        maxEstimatedMovingTime: 41,
      });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("3");
    });

    it("should return only the Hut in the Wild route when combined filters narrow from a broad search", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        searchTerm: "route",
        minDistance: 4,
        maxDistance: 6,
        minElevationGain: 90,
        maxElevationGain: 105,
        minEstimatedMovingTime: 29,
        maxEstimatedMovingTime: 31,
      });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("1");
    });

    it("should return no routes when combined filters conflict", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        searchTerm: "peak",
        minDistance: 5,
        maxDistance: 6,
        minElevationGain: 100,
        maxElevationGain: 120,
        minEstimatedMovingTime: 30,
        maxEstimatedMovingTime: 40,
      });
      expect(result.length).toBe(0);
    });

    it("should correctly filter when only one boundary is defined for each filter", () => {
      const result = filterRoutes(noMissingDataRoutes, fuse, filterBy, {
        searchTerm: "mountain",
        maxDistance: 12,
        maxElevationGain: 115,
        maxEstimatedMovingTime: 36,
      });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("2");
    });
  });
});
