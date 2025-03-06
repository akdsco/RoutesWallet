import { StyleSheet, View } from "react-native";
import Container from "@/components/Container";
import React from "react";
import { FunctionCallPromise } from "@/library/types";
import { AddTag } from "@/components/Tag/AddTag/AddTag";

type TagsEmptyProps = {
  checkTags: FunctionCallPromise;
};

export const TagListEmpty = ({ checkTags }: TagsEmptyProps) => {
  return (
    <Container>
      <View style={styles.scrollViewContent}>
        <AddTag checkTags={checkTags} />
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});
