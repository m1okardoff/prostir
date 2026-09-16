import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface ReplyPreviewBarProps {
  senderName: string;
  text: string;
  onCancel: () => void;
}

export const ReplyPreviewBar: React.FC<ReplyPreviewBarProps> = ({
  senderName,
  text,
  onCancel,
}) => {
  return (
    <View className="flex-row items-center justify-between px-4 py-2 bg-surface border-t border-surfaceLight">
      <View className="flex-row items-center flex-1 mr-3">
        {/* Іконка відповіді */}
        <Ionicons
          name="arrow-undo"
          size={18}
          color={COLORS.primary}
          style={{ marginRight: 8 }}
        />

        {/* Вертикальна кольорова смужка */}
        <View className="w-1 h-9 bg-primary rounded-full mr-2.5" />

        <View className="flex-1 justify-center">
          <Text
            numberOfLines={1}
            className="text-primary font-semibold text-xs mb-0.5"
          >
            Відповідь для {senderName}
          </Text>
          <Text numberOfLines={1} className="text-grey text-xs">
            {text || "Вкладення"}
          </Text>
        </View>
      </View>

      {/* Кнопка скасування цитування */}
      <TouchableOpacity
        onPress={onCancel}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="p-1 rounded-full bg-surfaceLight"
      >
        <Ionicons name="close" size={16} color={COLORS.grey} />
      </TouchableOpacity>
    </View>
  );
};
