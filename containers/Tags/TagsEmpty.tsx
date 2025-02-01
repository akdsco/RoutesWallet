import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
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
        <View
          style={{
            display: "flex",
            alignContent: "center",
            justifyContent: "center",
            height: "89%",
          }}
        >
          <ThemedText type="defaultSemiBold" style={{ textAlign: "center" }}>
            Add tags by clicking on the Add tag button located on the bottom of
            this screen
          </ThemedText>
        </View>
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
