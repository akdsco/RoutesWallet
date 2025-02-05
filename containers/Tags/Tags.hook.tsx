import { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { useApp } from "@/hooks";
import { TagWithFunctions, UpdateTag } from "@/library/types";
import {
  getOrderedRawTagsFromDb,
  removeTagFromDb,
  saveTagOrderInDb,
  updateTagInDb,
} from "@/db/methods/tags";
import { Alert } from "react-native";
import { log } from "@/library/logger";

export const useTags = () => {
  const db = useSQLiteContext();
  const { athleteId } = useApp();
  const [tags, setTags] = useState<TagWithFunctions[]>([]);

  const removeTag = async (tagId: number) => {
    Alert.alert(
      "Are you sure you want to remove this tag?",
      "All the route assignments will also be removed",
      [
        {
          text: "Cancel",
          onPress: () =>
            log.info(
              "useTags:removeTag",
              "User pressed cancel when prompted to confirm tag remove",
            ),
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: async () => {
            log.info("useTags:removeTag", "User confirmed tag remove action");
            await removeTagFromDb(db)(tagId, athleteId!);
            await checkTags();
          },
          style: "destructive",
        },
      ],
    );
  };

  const updateTag: UpdateTag = async (tag) => {
    await updateTagInDb(db)(tag);
    await checkTags();
  };

  const checkTags = async () => {
    const rawTags = await getOrderedRawTagsFromDb(db)(athleteId);

    const tags: TagWithFunctions[] = rawTags.map((tag) => ({
      ...tag,
      removeTag,
      updateTag,
    }));

    setTags(tags);
  };

  const onSetTags = async (tags: TagWithFunctions[], saveOrderInDb = false) => {
    setTags(tags);

    if (saveOrderInDb) {
      if (!athleteId) {
        throw new Error("Athlete ID is missing");
      }
      await saveTagOrderInDb(db)(athleteId, tags);
    }
  };

  useEffect(() => {
    checkTags().then();
  }, []);

  return {
    tags,
    setTags: onSetTags,
    checkTags,
  };
};
