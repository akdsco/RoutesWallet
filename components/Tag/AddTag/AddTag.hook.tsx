import { log } from "@/library/logger";
import { Toast } from "@/library/Toast";
import { handleRouteTagInsert } from "@/db/methods";
import { Keyboard } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { useApp } from "@/hooks";
import React from "react";
import { FunctionCall } from "@/library/types";

export const useAddTag = (checkTags: FunctionCall) => {
  const [tagName, setTagName] = React.useState("");
  const db = useSQLiteContext();
  const { athleteId } = useApp();

  const addTag = async () => {
    if (tagName.trim() === "") {
      log.info("useTags: addTag", "User trying to add an empty tag");
      Toast(
        "info",
        "Cannot add empty tag",
        "Please type in a name for your new tag",
      );
      return;
    }

    const tagInsetResult = await handleRouteTagInsert(db)(athleteId, tagName);

    if (tagInsetResult) {
      Toast("error", "Error adding tag", tagInsetResult.error);
      return;
    }

    await checkTags();
    log.info("useTags: addTag", `Route tag "${tagName}" added successfully`);
    setTagName("");
    Keyboard.dismiss();
  };
  return {
    tagName,
    setTagName,
    addTag,
  };
};
