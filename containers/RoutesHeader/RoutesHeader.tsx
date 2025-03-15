import { SearchInput } from "@/components/SearchInput/SearchInput";
import React from "react";
import {
  FilterProps,
  SortBy,
} from "@/containers/StravaRoutes/useRoutesFilters.hook";
import { View } from "react-native";
import { FilterChip } from "@/components/FilterChip/FilterChip";
import {
  displayElevation,
  formatMinutesToHoursAndMinutes,
} from "@/library/displayFormat";
import { SortSelectionButton } from "@/components/SortSelectionButton";
import { FunctionCall } from "@/library/types";

type RoutesHeaderProps = FilterProps & {
  routeCount: number;
  sortBy: SortBy;
  onBottomSheetOpen: FunctionCall;
};

export const RoutesHeader = ({
  search,
  distance,
  elevation,
  movingTime,
  appliedFilters,
  sortBy,
  onBottomSheetOpen,
  routeCount,
}: RoutesHeaderProps) => {
  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ paddingRight: 6, marginTop: 9 }}>
          <SortSelectionButton
            name={sortBy.name}
            isSelected={true}
            sortDescending={sortBy.type === "dsc"}
            updateSort={onBottomSheetOpen}
          />
        </View>
        <SearchInput
          isFiltered={appliedFilters.search}
          searchTerm={search.term}
          foundRoutes={routeCount}
          onSearchTermChange={search.onChange}
          onSearchSubmit={search.onSubmit}
          onSearchReset={search.onReset}
        />
      </View>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          marginHorizontal: 5,
        }}
      >
        {appliedFilters.distance && (
          <FilterChip
            iconLabel="bicycle"
            title={`${distance.range[0]} → ${distance.range[1]} km`}
            onPress={distance.onReset}
          />
        )}
        {appliedFilters.elevation && (
          <FilterChip
            iconLabel="trending-up-outline"
            title={`${displayElevation(elevation.range[0])} → ${displayElevation(elevation.range[1])}`}
            onPress={elevation.onReset}
          />
        )}
        {appliedFilters.movingTime && (
          <FilterChip
            iconLabel="time-outline"
            title={`${formatMinutesToHoursAndMinutes(movingTime.range[0])} → ${formatMinutesToHoursAndMinutes(movingTime.range[1])}`}
            onPress={movingTime.onReset}
          />
        )}
      </View>
    </>
  );
};
