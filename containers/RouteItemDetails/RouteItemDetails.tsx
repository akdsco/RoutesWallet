import Container from "@/components/Container";
import { useRouteItemDetails } from "@/containers/RouteItemDetails/RouteItemDetails.hook";
import { Loader } from "@/components/Loader";
import { ThemedText } from "@/components/ThemedText";
import { Dimensions, Image, ScrollView, StyleSheet, View } from "react-native";
import { useTheme } from "@/hooks";
import React, { useRef } from "react";
import { StravaThemeUrl } from "@/integrations/strava";
import { useSQLiteContext } from "expo-sqlite";
import BottomSheet, {
  BottomSheetFlatList,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeContextType } from "@/library/theme";
import { TagToggleItem } from "@/components/Tag/TagToggleItem";

export const RouteItemDetails = () => {
  const { loading, route, assignedTags, handleSheetChanges, handleTagToggle } =
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

  return (
    <Container>
      <GestureHandlerRootView style={styles.gestureContainer}>
        <View
          style={{
            width: ScreenWidth * 0.98,
            flex: 1,
          }}
        >
          <ScrollView
            contentContainerStyle={{
              alignItems: "center",
            }}
          >
            <Image
              source={{ uri: route.map_urls[mapColor] }}
              style={{ width: ScreenWidth * 0.9 }}
              className="h-64 object-cover rounded-lg mt-3"
            />
            <View
              style={{
                width: "100%",
                paddingLeft: "4%",
                paddingRight: "4%",
              }}
            >
              <View
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
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
            </View>
          </ScrollView>
          <BottomSheet
            ref={bottomSheetRef}
            onChange={handleSheetChanges}
            snapPoints={[53, "50%"]}
            enableDynamicSizing={false}
            enableContentPanningGesture={false}
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
                  Edit tags
                </ThemedText>
                <BottomSheetView style={{ flex: 1 }}>
                  <BottomSheetFlatList
                    data={assignedTags}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                      <TagToggleItem {...{ item, handleTagToggle }} />
                    )}
                    showsVerticalScrollIndicator={true}
                  />
                </BottomSheetView>
              </View>
            </BottomSheetView>
          </BottomSheet>
        </View>
      </GestureHandlerRootView>
    </Container>
  );
};

const makeStyles = ({ theme }: ThemeContextType) =>
  StyleSheet.create({
    gestureContainer: {
      flex: 1,
      backgroundColor: theme.background,
      width: "100%",
    },
    contentContainer: {
      flex: 1,
      paddingRight: 9,
      paddingLeft: 9,
      alignItems: "center",
      backgroundColor: theme.contrastBackground,
    },
  });
