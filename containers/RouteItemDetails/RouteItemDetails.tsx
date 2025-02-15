import Container from "@/components/Container";
import { useRouteItemDetails } from "@/containers/RouteItemDetails/RouteItemDetails.hook";
import { Loader } from "@/components/Loader";
import { ThemedText } from "@/components/ThemedText";
import {
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useTheme } from "@/hooks";
import React, { useRef } from "react";
import { log } from "@/library/logger";
import { StravaThemeUrl } from "@/integrations/strava";
import { assignTagToRoute, removeTagFromRoute } from "@/db/methods/tags";
import { useSQLiteContext } from "expo-sqlite";
import { Toast } from "@/library/Toast";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeContextType } from "@/library/theme";
import { ListItem } from "@rneui/themed";

export const RouteItemDetails = () => {
  const { loading, route, assignedTags, setAssignedTags } =
    useRouteItemDetails();
  const db = useSQLiteContext();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const themeContext = useTheme();
  const { theme } = themeContext;
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

  const handleTagToggle = async (
    tagId: number,
    routeId: BigInt,
    isAssigned: boolean,
  ) => {
    if (isAssigned) {
      log.debug("handleTagToggle", "Removing tag from route", {
        tagId,
        routeId,
      });

      await removeTagFromRoute(db)(tagId, routeId);
      setAssignedTags((prevTags) =>
        prevTags.map((tag) =>
          tag.id === tagId ? { ...tag, isAssigned: !isAssigned } : tag,
        ),
      );
      Toast("success", "Tag removed successfully");
      return;
    }

    await assignTagToRoute(db)(tagId, routeId);
    setAssignedTags((prevTags) =>
      prevTags.map((tag) =>
        tag.id === tagId ? { ...tag, isAssigned: !isAssigned } : tag,
      ),
    );
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
          snapPoints={[53, "50%"]}
          handleStyle={{
            backgroundColor: theme.contrastBackground,
            borderTopLeftRadius: 5,
            borderTopRightRadius: 5,
          }}
          handleIndicatorStyle={{
            backgroundColor: theme.text,
          }}
          backgroundStyle={{
            backgroundColor: theme.contrastBackground,
          }}
        >
          <BottomSheetView style={styles.contentContainer}>
            <View
              style={{
                width: "100%",
                flex: 1,
              }}
            >
              <ThemedText style={{ marginBottom: 10, alignSelf: "center" }}>
                Assigned tags
              </ThemedText>
              <FlatList
                data={assignedTags}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <ListItem
                    bottomDivider
                    onPress={() =>
                      handleTagToggle(item.id, route.id, item.isAssigned)
                    }
                    style={{ backgroundColor: theme.background }}
                  >
                    <ListItem.CheckBox
                      iconType="material-community"
                      checkedIcon="checkbox-marked"
                      uncheckedIcon="checkbox-blank-outline"
                      checked={item.isAssigned}
                      onPress={() =>
                        handleTagToggle(item.id, route.id, item.isAssigned)
                      }
                    />
                    <ListItem.Content
                      style={{ backgroundColor: theme.background }}
                    >
                      <ListItem.Title style={{ color: theme.text }}>
                        {item.name}
                      </ListItem.Title>
                    </ListItem.Content>
                  </ListItem>
                )}
              />
            </View>
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
      paddingRight: 20,
      paddingLeft: 20,
      alignItems: "center",
      backgroundColor: theme.contrastBackground,
    },
  });
