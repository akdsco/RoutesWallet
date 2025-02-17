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

export const useTagList = () => {
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
          text: "Delete",
          onPress: async () => {
            log.info("useTags:removeTag", "User confirmed tag remove action", {
              tagId,
            });
            await removeTagFromDb(db)(athleteId, tagId);
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
