import { SearchInput } from "@/components/SearchInput/SearchInput";
import React from "react";
import { FilterProps } from "@/containers/StravaRoutes/useRoutesFilters.hook";
import { View } from "react-native";
import { FilterChip } from "@/components/FilterChip/FilterChip";

type RoutesHeaderProps = FilterProps & {
  routeCount: number;
};

export const RoutesHeader = ({
  search,
  distance,
  elevation,
  movingTime,
  appliedFilters,
  routeCount,
}: RoutesHeaderProps) => {
  const displayElevation = (elevation: number) => {
    if (elevation < 1000) {
      return `${elevation}m`;
    }

    return `${(elevation / 1000).toFixed(1)}km`;
  };

  return (
    <>
      <SearchInput
        isFiltered={appliedFilters.search}
        searchTerm={search.term}
        foundRoutes={routeCount}
        onSearchTermChange={search.onChange}
        onSearchSubmit={search.onSubmit}
        onSearchReset={search.onReset}
      />
      <View
        style={{
          flexDirection: "row",
          marginHorizontal: 5,
        }}
      >
        {appliedFilters.distance && (
          <FilterChip
            iconLabel="bicycle"
            title={`${distance.range[0]} - ${distance.range[1]} km`}
            onPress={distance.onReset}
          />
        )}
        {appliedFilters.elevation && (
          <FilterChip
            iconLabel="trending-up-outline"
            title={`${displayElevation(elevation.range[0])} - ${displayElevation(elevation.range[1])}`}
            onPress={elevation.onReset}
          />
        )}
        {appliedFilters.movingTime && (
          <FilterChip
            iconLabel="time-outline"
            title={`${movingTime.range[0]} - ${movingTime.range[1]} min`}
            onPress={movingTime.onReset}
          />
        )}
      </View>
    </>
  );
};
