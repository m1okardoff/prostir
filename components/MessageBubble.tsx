import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { COLORS } from "@/constants/theme";

interface MessageBubbleProps {
  content: string;
  imageUrl?: string;
  createdAt: number;
  isMine: boolean;
  senderName: string;
  isGroup: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  content,
  imageUrl,
  createdAt,
  isMine,
  senderName,
  isGroup,
}) => {
  // Форматуємо час: наприклад "14:32"
  const timeString = new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View
      className={`my-1 max-w-[80%] ${
        isMine ? "self-end items-end" : "self-start items-start"
      }`}
    >
      {/* Ім'я автора (показується тільки в групових чатах для повідомлень інших учасників) */}
      {!isMine && isGroup && (
        <Text className="text-grey text-[11px] mb-1 ml-2 font-medium">
          {senderName}
        </Text>
      )}

      <View
        className={`px-3 py-2 rounded-2xl ${
          isMine
            ? "bg-primary rounded-tr-xs"
            : "bg-surface border border-surfaceLight rounded-tl-xs"
        }`}
      >
        {/* Прикріплене зображення */}
        {imageUrl ? (
          <View className="mb-2 rounded-xl overflow-hidden">
            <Image
              source={{ uri: imageUrl }}
              style={{ width: 220, height: 220, borderRadius: 12 }}
              contentFit="cover"
              transition={200}
            />
          </View>
        ) : null}

        {/* Текст повідомлення */}
        {content ? (
          <Text className="text-white text-base leading-5">{content}</Text>
        ) : null}

        {/* Час відправки */}
        <Text
          className={`text-[10px] mt-1 self-end ${
            isMine ? "text-white/70" : "text-grey"
          }`}
        >
          {timeString}
        </Text>
      </View>
    </View>
  );
};
