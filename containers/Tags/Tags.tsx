import Container from "@/components/Container";
import { StyleSheet, View } from "react-native";
import { useTags } from "@/containers/Tags/Tags.hook";
import { TagItem } from "@/components/Tag/TagItem";
import DraggableFlatList from "react-native-draggable-flatlist/src/components/DraggableFlatList";
import React from "react";
import { AddTag } from "@/containers/Tags/AddTag";
import { TagsEmpty } from "@/containers/Tags/TagsEmpty";

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
          style={{
            // TODO: questionable solution, but it works? test it on different devices, load up more tags
            height: "89%",
          }}
        />
        <AddTag checkTags={checkTags} />
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    justifyContent: "space-between",
  },
});
