import { StyleSheet, View } from "react-native";
import Container from "@/components/Container";
import React from "react";
import { AddTag } from "@/containers/Tags/AddTag";
import { FunctionCall } from "@/library/types";

type TagsEmptyProps = {
  checkTags: FunctionCall;
};

export const TagsEmpty = ({ checkTags }: TagsEmptyProps) => {
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
