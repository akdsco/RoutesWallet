import { SearchInput } from "@/components/SearchInput/SearchInput";
import React from "react";
import { FilterProps } from "@/containers/StravaRoutes/useRoutesFilters.hook";
import { ThemedText } from "@/components/ThemedText";
import { View } from "react-native";

type RoutesHeaderProps = FilterProps & {
  routeCount: number;
};

export const RoutesHeader = ({
  search,
  appliedFilters,
  routeCount,
}: RoutesHeaderProps) => {
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
      <View>
        <ThemedText>Some more stuff</ThemedText>
      </View>
    </>
  );
};
