import Container from "@/components/Container";
import { ThemedText } from "@/components/ThemedText";
import { StyleSheet, ScrollView } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { useGroups } from "@/containers/Groups/Groups.hook";
import { TagItem } from "@/components/Tag/TagItem";
import { useCallback, useRef } from "react";
import BottomSheet from "@gorhom/bottom-sheet";
import { useTheme } from "@/hooks";
import { Theme } from "@/constants/theme";
import { Button } from "@/components/Button/Buttons";
import { isConstraintError, isSQLiteError } from "@/db/error";
import Toast from "react-native-toast-message";
import { MenuProvider } from "react-native-popup-menu";

export const Groups = () => {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const { tags, checkTags } = useGroups();
  const styles = makeStyles(theme);

  const bottomSheetRef = useRef<BottomSheet>(null);

  const assignRouteToTag = async (routeId: bigint, tagId: number) => {
    const sql = `
          INSERT INTO RouteTagAssignments (route_id, tag_id)
          VALUES (?, ?);
        `;

    try {
      await db.runAsync(sql, [routeId.toString(), tagId]);
      console.debug(`SQL: Route "${routeId}" assigned to tag id "${tagId}"`);
    } catch (error) {
      console.log("Error executing SQL", error);
      throw new Error("Error assigning tag to route");
    }
  };

  const addRouteTag = async (tagName: string) => {
    const sql = `
      INSERT INTO RouteTags (name)
      VALUES ('${tagName}');
    `;

    try {
      await db.execAsync(sql);
    } catch (error) {
      if (isSQLiteError(error)) {
        if (isConstraintError(error)) {
          // TODO: toast to let user know the tag is already on the list
          Toast.show({
            type: "error",
            text1: "Tag already exists",
            text2: "Try a different name",
          });
          return console.error("Tag already exists?\n", error);
        }
      }

      throw error;
    }

    await checkTags();
    console.debug(`SQL: Route tag "${tagName}" added`);
  };

  const onPress = async () => {
    await addRouteTag("Spain");
    // await assignRouteToTag(3219775770703638500n, 1);
  };

  // callbacks
  const handleSheetChanges = useCallback((index: number) => {
    console.log("handleSheetChanges", index);
  }, []);

  if (tags.length === 0) {
    return (
      <Container>
        <ThemedText>No tags available.</ThemedText>
      </Container>
    );
  }

  return (
    <Container>
      <MenuProvider>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          {tags.map((tag) => (
            <TagItem tag={tag} key={tag.id} />
          ))}
        </ScrollView>
        <Button
          title="Add tag"
          onPress={onPress}
          accessibilityLabel="add"
          style={styles.addTagButton}
        />
      </MenuProvider>
    </Container>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollViewContent: {
      flexGrow: 1,
    },
    addTagButton: {
      alignItems: "center",
      bottom: 10,
      backgroundColor: theme.background,
    },
  });
