import Container from "@/components/Container";
import { ThemedText } from "@/components/ThemedText";
import { StyleSheet, TextInput, View } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { useTags } from "@/containers/Tags/Tags.hook";
import { TagItem } from "@/components/Tag/TagItem";
import { useApp, useTheme } from "@/hooks";
import { ThemeContextType } from "@/library/theme";
import { Button } from "@/components/Button/Buttons";
import { MenuProvider } from "react-native-popup-menu";
import DraggableFlatList from "react-native-draggable-flatlist/src/components/DraggableFlatList";
import React from "react";
import { log } from "@/library/logger";
import { handleRouteTagInsert } from "@/db/methods";
import { Toast } from "@/library/Toast";

export const Tags = () => {
  const db = useSQLiteContext();
  const [newTagName, setNewTagName] = React.useState("");
  const themeContext = useTheme();
  const { athleteId } = useApp();
  const { tags, setTags, checkTags } = useTags();
  const styles = makeStyles(themeContext);

  const { theme } = themeContext;

  const assignRouteToTag = async (routeId: BigInt, tagId: number) => {
    const sql = `
          INSERT INTO RouteTagAssignments (route_id, tag_id)
          VALUES (?, ?);
        `;

    try {
      await db.runAsync(sql, [routeId.toString(), tagId]);
      console.debug(`SQL: Route "${routeId}" assigned to tag id "${tagId}"`);
    } catch (error) {
      const msg = "Error assigning tag to route";
      log.error("useTags:assignRouteToTag", msg, { error });
      throw new Error(msg);
    }
  };

  const addRouteTag = async () => {
    if (!athleteId) {
      Toast(
        "info",
        "User not identified",
        "Please try to logout and log back in",
      );
      return;
    }

    if (newTagName.trim() === "") {
      log.info("useTags: addRouteTag", "User trying to add an empty tag");
      Toast(
        "info",
        "Cannot add empty tag",
        "Please type in a name for your new tag",
      );
      return;
    }

    await handleRouteTagInsert(db)(athleteId, newTagName);

    await checkTags();
    log.debug(
      "useTags: addRouteTag",
      `Route tag "${newTagName}" added successfully`,
    );
    setNewTagName("");
  };

  if (tags.length === 0) {
    return (
      <Container>
        <View style={styles.scrollViewContent}>
          <View
            style={{
              display: "flex",
              alignContent: "center",
              justifyContent: "center",
              height: "89%",
            }}
          >
            <ThemedText type="defaultSemiBold" style={{ textAlign: "center" }}>
              Add tags by clicking on the Add tag button located on the bottom
              of this screen
            </ThemedText>
          </View>
          <View style={styles.addContainer}>
            <TextInput
              value={newTagName}
              onChangeText={setNewTagName}
              style={[styles.textInput, { color: theme.text }]}
              placeholder="Type in tag name"
            />
            <Button
              title="Add"
              onPress={addRouteTag}
              accessibilityLabel="Add tag"
            />
          </View>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <MenuProvider>
        <View style={styles.scrollViewContent}>
          <DraggableFlatList
            data={tags}
            onDragEnd={({ data }) => setTags(data, true)}
            keyExtractor={(item) => item.id.toString()}
            renderItem={TagItem}
            style={{
              // TODO: questionable solution, but it works? test it on different devices, load up more tags
              height: "89%",
            }}
          />
          {/*TODO: pack up into component */}
          <View style={styles.addContainer}>
            <TextInput
              value={newTagName}
              onChangeText={setNewTagName}
              style={[styles.textInput, { color: theme.text }]}
              placeholder="Type in tag name"
            />
            <Button
              title="Add"
              onPress={addRouteTag}
              accessibilityLabel="Add tag"
            />
          </View>
        </View>
      </MenuProvider>
    </Container>
  );
};

const makeStyles = ({ colorMode }: ThemeContextType) =>
  StyleSheet.create({
    scrollViewContent: {
      justifyContent: "space-between",
    },
    addContainer: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
    },
    textInput: {
      fontSize: 18,
      borderBottomWidth: colorMode === "light" ? 1.5 : 0.5,
      borderColor: "#ccc",
      marginRight: 10,
      width: "75%",
    },
  });
