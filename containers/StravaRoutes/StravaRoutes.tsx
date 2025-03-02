import Container from "@/components/Container";
import {
  FlatList,
  Keyboard,
  RefreshControl,
  RefreshControlProps,
  StyleSheet,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { RouteListItem } from "./RouteListItem";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button/Buttons";
import { Loader } from "@/components/Loader";
import { useRoutes } from "@/containers/StravaRoutes/StravaRoutes.hook";
import React, { ReactElement } from "react";
import { SearchInput } from "@/components/SearchInput/SearchInput";

type StravaRoutesProps = {
  route: string;
  filter?: RouteFilters;
  noRefresh?: boolean;
};

export type RouteFilters =
  | {
      routeIds?: string[];
    }
  | undefined;

export const StravaRoutes = ({
  route,
  filter,
  noRefresh,
}: StravaRoutesProps) => {
  const { width } = useWindowDimensions();
  const {
    loading,
    noRoutesAvailable,
    refreshing,
    onRefresh,
    routes,
    executeSearch,
    onSearchReset,
    isInSearchMode,
    setIsInSearchMode,
    isKeyboardVisible,
  } = useRoutes(filter);

  const getNumColumns = (screenWidth: number) => {
    if (screenWidth >= 980) return 4; // Desktop and larger tablets
    if (screenWidth >= 650) return 3; // Smaller tablets
    if (screenWidth >= 320) return 2; // Mobile
    return 1; // Small Mobile
  };

  const numColumns = getNumColumns(width);
  const maxWidth = Math.min(width, 1200);
  const itemWidth = (maxWidth - 10) / numColumns - 10; // 20 px for container padding, 10 px for item margin

  if (loading) {
    return <Loader />;
  }

  if (noRoutesAvailable) {
    return (
      <Container>
        <View style={styles.noRoutesContainer}>
          <ThemedText>No routes available.</ThemedText>
          <Button
            title="Refresh"
            onPress={onRefresh}
            accessibilityLabel="This will pull in your latest routes from Strava."
          />
        </View>
      </Container>
    );
  }

  const refreshControl: ReactElement<RefreshControlProps> | undefined =
    noRefresh ? undefined : (
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
    );

  return (
    <Container noCenter>
      {isKeyboardVisible && (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.closeKeyboardOverlay} />
        </TouchableWithoutFeedback>
      )}
      <FlatList
        keyboardShouldPersistTaps="handled"
        data={routes}
        keyExtractor={({ id }) => id}
        renderItem={({ item }) => (
          <RouteListItem {...{ item, route, itemWidth }} />
        )}
        ListHeaderComponent={
          <SearchInput
            {...{
              executeSearch,
              onSearchReset,
              isInSearchMode,
              setIsInSearchMode,
              foundRoutes: routes.length,
            }}
          />
        }
        refreshControl={refreshControl}
        numColumns={2}
      />
    </Container>
  );
};

const styles = StyleSheet.create({
  noRoutesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  closeKeyboardOverlay: {
    position: "absolute",
    top: 30,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "auto",
    zIndex: 10,
    backgroundColor: "transparent",
  },
});
