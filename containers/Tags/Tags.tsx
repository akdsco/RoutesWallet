import Container from "@/components/Container";
import { ThemedText } from "@/components/ThemedText";
import { StyleSheet, TextInput, View } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { useTags } from "@/containers/Tags/Tags.hook";
import { TagItem } from "@/components/Tag/TagItem";
import { useApp, useTheme } from "@/hooks";
import { Theme } from "@/constants/theme";
import { Button } from "@/components/Button/Buttons";
import { isConstraintError, isSQLiteError } from "@/db/error";
import Toast from "react-native-toast-message";
import { MenuProvider } from "react-native-popup-menu";
import DraggableFlatList from "react-native-draggable-flatlist/src/components/DraggableFlatList";
import React from "react";

export const Tags = () => {
  const db = useSQLiteContext();
  const [newTagName, setNewTagName] = React.useState("");
  const { theme } = useTheme();
  const { athleteId } = useApp();
  const { tags, setTags, checkTags } = useTags();
  const styles = makeStyles(theme);

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

  const addRouteTag = async () => {
    if (newTagName.trim() === "") {
      Toast.show({
        type: "info",
        text1: "Cannot add empty tag",
        text2: "Please type in a name for your new tag",
        topOffset: 55,
      });
      return;
    }

    const sql = `
      INSERT INTO RouteTags (name)
      VALUES ('${newTagName}');
    `;

    try {
      await db.execAsync(sql);

      // Retrieve the ID of the new tag
      const getTagIdSql = `
        SELECT id FROM RouteTags
        WHERE name = '${newTagName}';
      `;
      const result = await db.getAllAsync<{ id: number }>(getTagIdSql);
      const tagId = result[0]?.id;

      if (!tagId) {
        throw new Error("Failed to retrieve tag ID after insertion");
      }

      // Set the new tag as the first in the order
      const updateOrderSql = `
      -- Shift existing tags for the athlete down by 1
      UPDATE AthleteTagOrder
      SET order_position = order_position + 1
      WHERE athlete_id = ${athleteId};

      -- Insert the new tag at the first position
      INSERT INTO AthleteTagOrder (athlete_id, tag_id, order_position)
      VALUES (${athleteId}, ${tagId}, 1);
    `;
      await db.execAsync(updateOrderSql);
    } catch (error) {
      if (isSQLiteError(error)) {
        if (isConstraintError(error)) {
          // TODO: toast to let user know the tag is already on the list
          Toast.show({
            type: "info",
            text1: "Tag already exists",
            text2: "Try a different name",
            topOffset: 55,
          });
          return console.error("Tag already exists?\n", error);
        }
      }

      throw error;
    }

    await checkTags();
    console.debug(`SQL: Route tag "${newTagName}" added`);
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
        {/*TODO: save order in db as well to persist*/}
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

const makeStyles = (theme: Theme) =>
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
      borderBottomWidth: 0.5,
      borderColor: "#ccc",
      marginRight: 10,
      width: "75%",
    },
  });
