import Container from "@/components/Container";
import { ThemedText } from "@/components/ThemedText";
import { StyleSheet, View } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { useTags } from "@/containers/Tags/Tags.hook";
import { TagItem } from "@/components/Tag/TagItem";
import { useTheme } from "@/hooks";
import { Theme } from "@/constants/theme";
import { Button } from "@/components/Button/Buttons";
import { isConstraintError, isSQLiteError } from "@/db/error";
import Toast from "react-native-toast-message";
import { MenuProvider } from "react-native-popup-menu";
import DraggableFlatList from "react-native-draggable-flatlist/src/components/DraggableFlatList";

export const Tags = () => {
  const db = useSQLiteContext();
  const { theme } = useTheme();
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
    console.debug(`SQL: Route tag "${tagName}" added`);
  };

  const onPress = async () => {
    await addRouteTag("Crazy long tag name that should never ever exist??");
    // await assignRouteToTag(3219775770703638500n, 1);
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
          <Button
            title="Add tag"
            onPress={onPress}
            accessibilityLabel="add"
            style={styles.addTagButton}
          />
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
          <Button
            title="Add tag"
            onPress={onPress}
            accessibilityLabel="add"
            style={styles.addTagButton}
          />
        </View>
      </MenuProvider>
    </Container>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollViewContent: {
      flexGrow: 1,
      justifyContent: "space-between",
    },
    addTagButton: {
      alignItems: "center",
      bottom: 10,
      backgroundColor: theme.background,
    },
  });
