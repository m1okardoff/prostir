import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface MessageBubbleProps {
  content: string;
  imageUrl?: string;
  createdAt: number;
  isMine: boolean;
  senderName: string;
  isGroup: boolean;
  senderAvatar?: string;
  senderId: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  content,
  imageUrl,
  createdAt,
  isMine,
  senderName,
  isGroup,
  senderAvatar,
  senderId,
}) => {
  // Форматуємо час: наприклад "14:32"
  const timeString = new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const router = useRouter();

  return (
    <View
      className={`my-4 max-w-[80%] ${
        isMine ? "self-end items-end" : "self-start items-start"
      }`}
    >
      <TouchableOpacity onPress={() => router.push(`/user/${senderId}`)}>
        <View className="flex-row items-center gap-1 mb-2 ">
          <Image
            source={{
              uri: senderAvatar
                ? senderAvatar
                : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
            }}
            style={{ width: 25, height: 25, borderRadius: 50 }}
            contentFit="cover"
          />
          {!isMine && isGroup && (
            <Text className="text-grey text-[11px] mb-1 ml-2 font-medium">
              {senderName}
            </Text>
          )}
        </View>
      </TouchableOpacity>

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
