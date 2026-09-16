import * as Haptics from "expo-haptics";
import React from "react";
import {
  Modal,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const POPULAR_EMOJIS = ["❤️", "👍", "🔥", "😂", "😮", "😢", "🤣", "🖥️"];

interface ReactionPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}

export const ReactionPickerModal: React.FC<ReactionPickerModalProps> = ({
  visible,
  onClose,
  onSelectEmoji,
}) => {
  const handleSelect = (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectEmoji(emoji);
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/60 justify-center items-center px-4">
          <TouchableWithoutFeedback>
            <View className="bg-surface border border-surfaceLight px-3 py-2.5 rounded-full flex-row items-center gap-2 shadow-2xl elevation-10">
              {POPULAR_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  activeOpacity={0.6}
                  onPress={() => handleSelect(emoji)}
                  className="w-10 h-10 items-center justify-center rounded-full active:bg-surfaceLight"
                >
                  <Text className="text-2xl">{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
