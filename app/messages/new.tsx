import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";
import { Id } from "@/convex/_generated/dataModel";

export default function NewChatScreen() {
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Id<"users">[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const users = useQuery(api.users.searchUsers, { queryText: searchQuery });
  const getOrCreateDirect = useMutation(
    api.conversations.getOrCreateDirectConversation,
  );
  const createGroup = useMutation(api.conversations.createGroupConversation);

  // Вибір або зняття вибору користувача для групи
  const toggleSelectUser = (userId: Id<"users">) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  // Початок особистого діалогу
  const handleStartDirectChat = async (userId: Id<"users">) => {
    try {
      setIsSubmitting(true);
      const conversationId = await getOrCreateDirect({ participantId: userId });
      router.replace(`/messages/${conversationId}`);
    } catch (error: any) {
      Alert.alert("Помилка", error.message || "Не вдалося відкрити діалог");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Створення групи
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Помилка", "Вкажіть назву для групового чату");
      return;
    }
    if (selectedUserIds.length < 1) {
      Alert.alert("Помилка", "Оберіть щонайменше одного учасника для групи");
      return;
    }

    try {
      setIsSubmitting(true);
      const conversationId = await createGroup({
        name: groupName.trim(),
        participantIds: selectedUserIds,
      });
      router.replace(`/messages/${conversationId}`);
    } catch (error: any) {
      Alert.alert("Помилка", error.message || "Не вдалося створити групу");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      {/* Хедер */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white">
            {isGroupMode ? "Нова група" : "Нове повідомлення"}
          </Text>
        </View>

        {isGroupMode && (
          <TouchableOpacity
            onPress={handleCreateGroup}
            disabled={
              isSubmitting || !groupName.trim() || selectedUserIds.length === 0
            }
            className={`px-3 py-1.5 rounded-full ${
              groupName.trim() && selectedUserIds.length > 0 && !isSubmitting
                ? "bg-primary"
                : "opacity-40"
            }`}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white font-semibold text-xs">Створити</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Перемикач режимів: Особистий / Група */}
      <View className="flex-row p-3 gap-2 border-b border-surface">
        <TouchableOpacity
          onPress={() => setIsGroupMode(false)}
          className={`flex-1 py-2 rounded-xl items-center ${
            !isGroupMode ? "bg-primary" : "bg-surface"
          }`}
        >
          <Text className="text-white font-semibold text-sm">
            Особистий діалог
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsGroupMode(true)}
          className={`flex-1 py-2 rounded-xl items-center ${
            isGroupMode ? "bg-primary" : "bg-surface"
          }`}
        >
          <Text className="text-white font-semibold text-sm">Груповий чат</Text>
        </TouchableOpacity>
      </View>

      {/* Поле назви групи (якщо обрано груповий режим) */}
      {isGroupMode && (
        <View className="px-4 py-2 border-b border-surface">
          <TextInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Введіть назву групи..."
            placeholderTextColor={COLORS.grey}
            className="bg-surface border border-surfaceLight rounded-xl px-4 py-2.5 text-white text-base"
          />
        </View>
      )}

      {/* Пошук користувачів */}
      <View className="px-4 py-2">
        <View className="flex-row items-center bg-surface border border-surfaceLight rounded-xl px-3 py-2">
          <Ionicons
            name="search"
            size={18}
            color={COLORS.grey}
            className="mr-2"
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Пошук людей..."
            placeholderTextColor={COLORS.grey}
            className="flex-1 text-white text-sm"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={COLORS.grey} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Список користувачів */}
      {users === undefined ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = selectedUserIds.includes(item._id);

            return (
              <TouchableOpacity
                onPress={() => {
                  if (isGroupMode) {
                    toggleSelectUser(item._id);
                  } else {
                    handleStartDirectChat(item._id);
                  }
                }}
                className="flex-row items-center justify-between px-4 py-3 active:bg-surface border-b border-surface/30"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <Image
                    source={{
                      uri:
                        item.image ??
                        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
                    }}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      marginRight: 12,
                    }}
                    contentFit="cover"
                  />
                  <View>
                    <Text className="text-white font-semibold text-base">
                      {item.fullname || item.username}
                    </Text>
                    <Text className="text-grey text-xs">@{item.username}</Text>
                  </View>
                </View>

                {/* Чекбокс у режимі групи */}
                {isGroupMode && (
                  <View
                    className={`w-6 h-6 rounded-full border items-center justify-center ${
                      isSelected
                        ? "bg-primary border-primary"
                        : "border-grey bg-transparent"
                    }`}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="p-8 items-center">
              <Text className="text-grey text-sm text-center">
                Користувачів не знайдено
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
