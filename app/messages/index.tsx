import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";

export default function MessagesScreen() {
  const conversations = useQuery(api.conversations.getConversations);

  if (conversations === undefined) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Хедер списку повідомлень */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 p-1 active:opacity-70"
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white">Повідомлення</Text>
        </View>

        {/* Кнопка створення нового чату/групи */}
        <TouchableOpacity
          onPress={() => router.push("/messages/new")}
          className="p-1 active:opacity-70"
        >
          <Ionicons name="create-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Список чатів */}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }) => {
          // Визначаємо назву чату та аватарку
          const title = item.isGroup
            ? (item.name ?? "Груповий чат")
            : item.otherUser?.fullname ||
              item.otherUser?.username ||
              "Користувач";

          const avatarUrl = item.isGroup ? null : item.otherUser?.image;

          const lastMsg = item.lastMessage || "Немає повідомлень";
          const formattedDate = item.lastMessageAt
            ? new Date(item.lastMessageAt).toLocaleDateString([], {
                day: "2-digit",
                month: "2-digit",
              })
            : "";

          return (
            <TouchableOpacity
              onPress={() => router.push(`/messages/${item._id}`)}
              className="flex-row items-center px-4 py-3 active:bg-surface border-b border-surface/40"
            >
              {/* Аватарка */}
              {item.isGroup ? (
                <View className="w-12 h-12 rounded-full bg-surfaceLight border border-surface items-center justify-center mr-3">
                  <Ionicons name="people" size={24} color={COLORS.primary} />
                </View>
              ) : (
                <Image
                  source={{
                    uri:
                      avatarUrl ??
                      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
                  }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    marginRight: 12,
                  }}
                  contentFit="cover"
                />
              )}

              {/* Інформація про бесіду */}
              <View className="flex-1 justify-center">
                <View className="flex-row items-center justify-between mb-1">
                  <Text
                    numberOfLines={1}
                    className="text-white font-semibold text-base flex-1 mr-2"
                  >
                    {title}
                  </Text>
                  <Text className="text-grey text-xs">{formattedDate}</Text>
                </View>

                <View className="flex-row items-center">
                  {item.isGroup && (
                    <Text className="text-primary text-xs font-medium mr-1.5">
                      {item.participantCount} уч. •
                    </Text>
                  )}
                  <Text numberOfLines={1} className="text-grey text-sm flex-1">
                    {lastMsg}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center mt-20 px-8">
            <Ionicons
              name="chatbubbles-outline"
              size={56}
              color={COLORS.grey}
              style={{ marginBottom: 12 }}
            />
            <Text className="text-white text-lg font-bold text-center mb-1">
              У вас ще немає бесід
            </Text>
            <Text className="text-grey text-sm text-center mb-6">
              Розпочніть спілкування з друзями або створіть власну групу
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/messages/new")}
              className="bg-primary px-5 py-2.5 rounded-full"
            >
              <Text className="text-white font-semibold text-sm">
                Написати повідомлення
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}
