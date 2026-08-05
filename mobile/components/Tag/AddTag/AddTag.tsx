import { StyleSheet, TextInput, View } from "react-native";
import { Button } from "@/components/Button/Buttons";
import React from "react";
import { ThemeContextType } from "@/library/theme";
import { useTheme } from "@/hooks";
import { FunctionCallPromise } from "@/library/types";
import { useAddTag } from "@/components/Tag/AddTag/AddTag.hook";

type AddTagProps = {
  checkTags: FunctionCallPromise;
};

export const AddTag = ({ checkTags }: AddTagProps) => {
  const { tagName, setTagName, addTag } = useAddTag(checkTags);

  const themeContext = useTheme();
  const styles = makeStyles(themeContext);

  return (
    <View style={styles.addContainer}>
      <TextInput
        value={tagName}
        onChangeText={setTagName}
        style={[styles.textInput, { color: themeContext.theme.text }]}
        placeholder="Type in tag name"
      />
      <Button title="Add" onPress={addTag} accessibilityLabel="Add tag" />
    </View>
  );
};

const makeStyles = ({ colorMode }: ThemeContextType) =>
  StyleSheet.create({
    addContainer: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
      marginBottom: 18,
    },
    textInput: {
      fontSize: 18,
      borderBottomWidth: colorMode === "light" ? 1.5 : 0.5,
      borderColor: "#ccc",
      marginRight: 10,
      width: "75%",
    },
  });
