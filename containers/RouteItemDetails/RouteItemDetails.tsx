import Container from "@/components/Container";
import { useRouteItemDetails } from "@/containers/RouteItemDetails/RouteItemDetails.hook";
import { Loader } from "@/components/Loader";
import { ThemedText } from "@/components/ThemedText";
import { Dimensions, Image, ScrollView, StyleSheet, View } from "react-native";
import { useTheme } from "@/hooks";
import React, { useRef } from "react";
import { log } from "@/library/logger";
import { StravaThemeUrl } from "@/integrations/strava";
import { assignTagToRoute } from "@/db/methods/tags";
import { useSQLiteContext } from "expo-sqlite";
import { Toast } from "@/library/Toast";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeContextType } from "@/library/theme";

export const RouteItemDetails = () => {
  const { loading, route, assignedTags, addTag } = useRouteItemDetails();
  const db = useSQLiteContext();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const themeContext = useTheme();
  const styles = makeStyles(themeContext);

  // Keeping mapColor logic here helps in re-rendering the component when colorMode changes
  // TODO: Can't we pack below up into a hook? feels messy ?
  const { colorMode } = useTheme();
  const mapColor = `${colorMode}_url` as StravaThemeUrl;
  const ScreenWidth = Dimensions.get("window").width;

  if (loading) {
    return <Loader />;
  }

  if (!route) {
    return (
      <Container>
        <ThemedText>Route not found</ThemedText>
      </Container>
    );
  }

  const handleSelectedMenuOption = async (
    selectedMenuItem: string,
    routeId: BigInt,
  ) => {
    log.info(
      "handleSelectedMenuOption",
      `User adds tag ${selectedMenuItem} to routeId ${routeId}`,
    );
    await assignTagToRoute(db)(routeId, Number(selectedMenuItem));
    Toast("success", "Tag added successfully");
  };

  const handleSheetChanges = (index: number) => {
    console.log("handleSheetChanges", index);
  };

  return (
    <Container>
      <GestureHandlerRootView style={styles.gestureContainer}>
        <ScrollView>
          <Image
            source={{ uri: route.map_urls[mapColor] }}
            style={{ width: ScreenWidth * 0.9 }}
            className="h-64 object-cover rounded-lg mt-3"
          />
          <View style={{ display: "flex", justifyContent: "space-between" }}>
            <View className="flex flex-row justify-between items-center mt-4">
              <ThemedText className="text-xl font-bold">
                {route.name}
              </ThemedText>
            </View>
            {/*<View>*/}
            {/*  {assignedTags.map((tag) => (*/}
            {/*    <View key={tag.id}>*/}
            {/*      <ThemedText>{tag.name}</ThemedText>*/}
            {/*    </View>*/}
            {/*  ))}*/}
            {/*</View>*/}
          </View>
          <View className="mt-4 mb-16 space-y-2">
            <ThemedText>
              Distance: {(route.distance / 1000).toFixed(2)} km
            </ThemedText>
            <ThemedText>
              Elevation Gain: {route.elevation_gain.toFixed(1)} m
            </ThemedText>
            {route.description && (
              <ThemedText>Description: {route.description}</ThemedText>
            )}
            <ThemedText>
              Created At: {new Date(route.created_at).toLocaleDateString()}
            </ThemedText>
          </View>
        </ScrollView>
        <BottomSheet
          ref={bottomSheetRef}
          onChange={handleSheetChanges}
          snapPoints={[25, "50%"]}
          handleStyle={{
            backgroundColor: themeContext.theme.contrastBackground,
            borderTopLeftRadius: 5,
            borderTopRightRadius: 5,
          }}
          handleIndicatorStyle={{
            backgroundColor: themeContext.theme.text,
          }}
          backgroundStyle={{
            backgroundColor: themeContext.theme.contrastBackground,
          }}
        >
          <BottomSheetView style={styles.contentContainer}>
            <ThemedText>Awesome 🎉</ThemedText>
          </BottomSheetView>
        </BottomSheet>
      </GestureHandlerRootView>
    </Container>
  );
};

const makeStyles = ({ theme }: ThemeContextType) =>
  StyleSheet.create({
    gestureContainer: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      flex: 1,
      padding: 36,
      alignItems: "center",
      backgroundColor: theme.contrastBackground,
    },
  });
