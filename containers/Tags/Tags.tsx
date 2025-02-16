import Container from "@/components/Container";
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useTags } from "@/containers/Tags/Tags.hook";
import React, { useEffect, useRef } from "react";
import { AddTag } from "@/containers/Tags/AddTag";
import { TagsEmpty } from "@/containers/Tags/TagsEmpty";
import { TagItem } from "@/components/Tag/TagItem";
import { useKeyboard } from "@react-native-community/hooks";
import { useTheme } from "@/hooks";
import DraggableFlatList from "react-native-draggable-flatlist";

export const Tags = () => {
  const { tags, setTags, checkTags } = useTags();
  const { theme } = useTheme();
  const keyboard = useKeyboard();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: keyboard.keyboardShown ? 0 : 1, // Fade out when the keyboard appears
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [keyboard.keyboardShown]);

  if (tags.length === 0) {
    return <TagsEmpty checkTags={checkTags} />;
  }

  if (tags.length === 0) {
    return <TagsEmpty checkTags={checkTags} />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <Container>
          <View style={styles.fullWidthBackground}>
            <View style={styles.listWrapper}>
              <DraggableFlatList
                data={tags}
                onDragEnd={({ data }) => setTags(data, true)}
                keyExtractor={(item) => item.id.toString()}
                renderItem={TagItem}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.listContent}
              />
            </View>
          </View>
          <View style={styles.addTagContainer}>
            <AddTag checkTags={checkTags} />
          </View>
        </Container>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  fullWidthBackground: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  listWrapper: {
    width: "100%",
  },
  listContent: {
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  addTagContainer: {
    paddingVertical: 15,
  },
});
