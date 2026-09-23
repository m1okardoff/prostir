import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

interface EditPreviewBarProps {
  originalText: string;
  onCancel: () => void;
}

export const EditPreviewBar: React.FC<EditPreviewBarProps> = ({
  originalText,
  onCancel,
}) => {
  return (
    <Animated.View
      entering={FadeInDown.duration(180)}
      exiting={FadeOutDown.duration(150)}
      className="flex-row items-center px-4 py-2.5 bg-surfaceLight/80 border-b border-surfaceLight"
    >
      {/* Іконка редагування */}
      <View className="mr-3 items-center justify-center">
        <Ionicons name="pencil" size={20} color={COLORS.primary} />
      </View>

      {/* Інформаційний блок */}
      <View className="flex-1 border-l-2 border-primary pl-2.5">
        <Text className="text-primary font-semibold text-xs mb-0.5">
          Редагування повідомлення
        </Text>
        <Text numberOfLines={1} className="text-grey text-xs leading-4">
          {originalText}
        </Text>
      </View>

      {/* Кнопка скасування (хрестик) */}
      <TouchableOpacity
        onPress={onCancel}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="p-1 rounded-full bg-surface items-center justify-center ml-2"
      >
        <Ionicons name="close" size={18} color={COLORS.grey} />
      </TouchableOpacity>
    </Animated.View>
  );
};
