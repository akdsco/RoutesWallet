import { StyleSheet, TextInput, View } from "react-native";
import { Button } from "@/components/Button/Buttons";
import React from "react";
import { ThemeContextType } from "@/library/theme";
import { useApp, useTheme } from "@/hooks";
import { useSQLiteContext } from "expo-sqlite";
import { Toast } from "@/library/Toast";
import { log } from "@/library/logger";
import { handleRouteTagInsert } from "@/db/methods";
import { FunctionCall } from "@/library/types";

type AddTagProps = {
  checkTags: FunctionCall;
};

export const AddTag = ({ checkTags }: AddTagProps) => {
  const themeContext = useTheme();
  const { theme } = themeContext;

  const db = useSQLiteContext();
  const { athleteId } = useApp();
  const [newTagName, setNewTagName] = React.useState("");

  const styles = makeStyles(themeContext);

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

  return (
    <View style={styles.addContainer}>
      <TextInput
        value={newTagName}
        onChangeText={setNewTagName}
        style={[styles.textInput, { color: theme.text }]}
        placeholder="Type in tag name"
      />
      <Button title="Add" onPress={addRouteTag} accessibilityLabel="Add tag" />
    </View>
  );
};

const makeStyles = ({ colorMode }: ThemeContextType) =>
  StyleSheet.create({
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
