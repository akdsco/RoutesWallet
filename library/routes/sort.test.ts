import { sortRoutes } from "@/library/routes/sort";
import { StravaRouteCommonFilterable } from "@/integrations/strava";
import { SortKeys } from "@/library/types";

const routes: StravaRouteCommonFilterable[] = [
  {
    id: "1",
    name: "Route 1",
    description: "Route 1",
    distance: 10,
    elevation_gain: 10,
    created_at: "2021-01-01",
    estimated_moving_time: 10,
  },
  {
    id: "2",
    name: "Route 2",
    description: "Route 2",
    distance: 5,
    elevation_gain: 5,
    created_at: "2021-01-01",
    estimated_moving_time: 5,
  },
  {
    id: "3",
    name: "Route 3",
    description: "Route 3",
    distance: 15,
    elevation_gain: 15,
    created_at: "2021-01-01",
    estimated_moving_time: 15,
  },
];

describe("Sort Routes", () => {
  it("should throw an error if an invalid sort key is provided", () => {
    expect(() =>
      sortRoutes(routes, { name: "invalid" as SortKeys, type: "asc" }),
    ).toThrow("Invalid sort key");
  });
  describe("Sort by distance", () => {
    it("should sort routes by distance in descending order", () => {
      const sortedRoutes = sortRoutes(routes, {
        name: "distance",
        type: "dsc",
      });
      expect(sortedRoutes[0].distance).toBe(15);
      expect(sortedRoutes[1].distance).toBe(10);
      expect(sortedRoutes[2].distance).toBe(5);
    });
    it("should sort routes by distance in ascending order", () => {
      const sortedRoutes = sortRoutes(routes, {
        name: "distance",
        type: "asc",
      });
      expect(sortedRoutes[0].distance).toBe(5);
      expect(sortedRoutes[1].distance).toBe(10);
      expect(sortedRoutes[2].distance).toBe(15);
    });
  });
  describe("Sort by elevation", () => {
    it("should sort routes by elevation in descending order", () => {
      const sortedRoutes = sortRoutes(routes, {
        name: "elevation",
        type: "dsc",
      });
      expect(sortedRoutes[0].elevation_gain).toBe(15);
      expect(sortedRoutes[1].elevation_gain).toBe(10);
      expect(sortedRoutes[2].elevation_gain).toBe(5);
    });
    it("should sort routes by elevation in ascending order", () => {
      const sortedRoutes = sortRoutes(routes, {
        name: "elevation",
        type: "asc",
      });
      expect(sortedRoutes[0].elevation_gain).toBe(5);
      expect(sortedRoutes[1].elevation_gain).toBe(10);
      expect(sortedRoutes[2].elevation_gain).toBe(15);
    });
  });
  describe("Sort by moving time", () => {
    it("should sort routes by moving time in descending order", () => {
      const sortedRoutes = sortRoutes(routes, {
        name: "movingTime",
        type: "dsc",
      });
      expect(sortedRoutes[0].estimated_moving_time).toBe(15);
      expect(sortedRoutes[1].estimated_moving_time).toBe(10);
      expect(sortedRoutes[2].estimated_moving_time).toBe(5);
    });
    it("should sort routes by moving time in ascending order", () => {
      const sortedRoutes = sortRoutes(routes, {
        name: "movingTime",
        type: "asc",
      });
      expect(sortedRoutes[0].estimated_moving_time).toBe(5);
      expect(sortedRoutes[1].estimated_moving_time).toBe(10);
      expect(sortedRoutes[2].estimated_moving_time).toBe(15);
    });
  });
});
