import Container from "@/components/Container";
import { StyleSheet, View } from "react-native";
import { useTags } from "@/containers/Tags/Tags.hook";
import React from "react";
import { AddTag } from "@/containers/Tags/AddTag";
import { TagsEmpty } from "@/containers/Tags/TagsEmpty";
import DraggableFlatList from "react-native-draggable-flatlist/src/components/DraggableFlatList";
import { TagItem } from "@/components/Tag/TagItem";

export const Tags = () => {
  const { tags, setTags, checkTags } = useTags();

  if (tags.length === 0) {
    return <TagsEmpty checkTags={checkTags} />;
  }

  return (
    <Container>
      <View style={styles.scrollViewContent}>
        <DraggableFlatList
          data={tags}
          onDragEnd={({ data }) => setTags(data, true)}
          keyExtractor={(item) => item.id.toString()}
          renderItem={TagItem}
        />
        <AddTag checkTags={checkTags} />
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    height: "100%",
    justifyContent: "space-between",
  },
});
