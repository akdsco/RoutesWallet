import { filterRoutes } from "@/library/routes/filter";
import { StravaRouteCommonFilterable } from "@/integrations/strava";

const noMissingDataRoutes: StravaRouteCommonFilterable[] = [
  {
    id: "1",
    distance: 5,
    created_at: "2021-01-01T00:00:00Z",
    elevation_gain: 100,
    estimated_moving_time: 30,
  },
  {
    id: "2",
    distance: 10,
    created_at: "2022-01-01T00:00:00Z",
    elevation_gain: 110,
    estimated_moving_time: 35,
  },
  {
    id: "3",
    distance: 15,
    created_at: "2023-01-01T00:00:00Z",
    elevation_gain: 120,
    estimated_moving_time: 40,
  },
];

describe("Filter Routes", () => {
  it("Should get all routes when no filters are applied", () => {
    const noFilterResult = filterRoutes(noMissingDataRoutes, {});
    expect(noFilterResult.length).toBe(noMissingDataRoutes.length);
  });
  describe("Distance", () => {
    it("Should filter by distance", () => {
      const result = filterRoutes(noMissingDataRoutes, {
        minDistance: 6,
        maxDistance: 14,
      });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("2");
    });
    it("Should get two routes", () => {
      const result = filterRoutes(noMissingDataRoutes, {
        minDistance: 5,
        maxDistance: 10,
      });
      expect(result.length).toBe(2);
      expect(result[0].id).toBe("1");
      expect(result[1].id).toBe("2");
    });
    it("Should get all routes when on boundaries", () => {
      const result = filterRoutes(noMissingDataRoutes, {
        minDistance: 5,
        maxDistance: 15,
      });
      expect(result.length).toBe(3);
    });
    it("Should get no routes", () => {
      const result = filterRoutes(noMissingDataRoutes, {
        minDistance: 0,
        maxDistance: 4,
      });
      expect(result.length).toBe(0);
    });
  });
  describe("Elevation Gain", () => {
    it("Should filter by elevation gain", () => {
      const result = filterRoutes(noMissingDataRoutes, {
        minElevationGain: 101,
        maxElevationGain: 119,
      });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("2");
    });
    it("Should get two routes", () => {
      const result = filterRoutes(noMissingDataRoutes, {
        minElevationGain: 100,
        maxElevationGain: 110,
      });
      expect(result.length).toBe(2);
      expect(result[0].id).toBe("1");
      expect(result[1].id).toBe("2");
    });
    it("Should get all routes when on boundaries", () => {
      const result = filterRoutes(noMissingDataRoutes, {
        minElevationGain: 100,
        maxElevationGain: 120,
      });
      expect(result.length).toBe(3);
      expect(result[0].id).toBe("1");
      expect(result[1].id).toBe("2");
    });
    it("Should get no routes", () => {
      const result = filterRoutes(noMissingDataRoutes, {
        minElevationGain: 0,
        maxElevationGain: 99,
      });
      expect(result.length).toBe(0);
    });
  });
  describe("Created At", () => {
    it("Should filter by created at", () => {
      const result = filterRoutes(noMissingDataRoutes, {
        startDate: "2022-01-01T00:00:00Z",
        endDate: "2022-12-31T23:59:59Z",
      });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("2");
    });
    it("Should get two routes when on boundaries", () => {
      const result = filterRoutes(noMissingDataRoutes, {
        startDate: "2021-01-01T00:00:00Z",
        endDate: "2022-01-01T00:00:00Z",
      });
      expect(result.length).toBe(2);
      expect(result[0].id).toBe("1");
      expect(result[1].id).toBe("2");
    });
    it("Should get no routes", () => {
      const result = filterRoutes(noMissingDataRoutes, {
        startDate: "2024-01-01T00:00:00Z",
        endDate: "2024-12-31T23:59:59Z",
      });
      expect(result.length).toBe(0);
    });
  });
  describe("Estimated Moving Time", () => {
    it("Should filter by estimated moving time", () => {
      const result = filterRoutes(noMissingDataRoutes, {
        minEstimatedMovingTime: 31,
        maxEstimatedMovingTime: 39,
      });

      expect(result.length).toBe(1);
    });
    it("Should get all routes when on boundaries", () => {
      const result = filterRoutes(noMissingDataRoutes, {
        minEstimatedMovingTime: 30,
        maxEstimatedMovingTime: 40,
      });
      expect(result.length).toBe(3);
    });
    it("Should get no routes", () => {
      const result = filterRoutes(noMissingDataRoutes, {
        minEstimatedMovingTime: 0,
        maxEstimatedMovingTime: 29,
      });
      expect(result.length).toBe(0);
    });
  });
  describe("Mixed Filters", () => {
    it("Should filter by distance and elevation gain", () => {
      const result = filterRoutes(noMissingDataRoutes, {
        minDistance: 6,
        maxDistance: 14,
        minElevationGain: 101,
        maxElevationGain: 119,
      });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("2");
    });
    it("Should filter by distance, elevation gain, and created at", () => {
      const result = filterRoutes(noMissingDataRoutes, {
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
      const result = filterRoutes(noMissingDataRoutes, {
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
      const result = filterRoutes(noMissingDataRoutes, {
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
});
