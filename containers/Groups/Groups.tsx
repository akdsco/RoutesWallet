import Container from "@/components/Container";
import { ThemedText } from "@/components/ThemedText";
import { Pressable, StyleSheet, ScrollView } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { useGroups } from "@/containers/Groups/Groups.hook";
import { TagItem } from "@/components/Tag/TagItem";

export const Groups = () => {
  const db = useSQLiteContext();
  const { tags } = useGroups();

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
      console.debug("SQL: Error when adding tag", error);
      throw error;
    }

    console.debug(`SQL: Route tag "${tagName}" added`);
  };

  const onPress = async () => {
    // await addRouteTag("Mallorca");
    // await assignRouteToTag(3219775770703638500n, 1);
  };

  if (tags.length === 0) {
    return (
      <Container>
        <ThemedText>No tags available.</ThemedText>
      </Container>
    );
  }

  return (
    <Container>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {tags.map((tag) => (
          <TagItem tag={tag} key={tag.id} />
        ))}
      </ScrollView>
      {/*<Pressable onPress={onPress} style={{ paddingTop: 50 }}>*/}
      {/*  <ThemedText>Execute Fn</ThemedText>*/}
      {/*</Pressable>*/}
    </Container>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
  },
});
