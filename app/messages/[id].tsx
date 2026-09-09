import { ChatInput } from "@/components/ChatInput";
import { MessageBubble } from "@/components/MessageBubble";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { File } from "expo-file-system";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id as Id<"conversations">;

  const [isSending, setIsSending] = useState(false);

  const conversation = useQuery(api.conversations.getConversation, {
    conversationId,
  });

  const messages = useQuery(api.messages.getMessages, { conversationId });

  const sendMessageMutation = useMutation(api.messages.sendMessage);

  const generateUploadUrlMutation = useMutation(api.messages.generateUploadUrl);

  const handleSendMessage = async (text: string, selectedImageUri?: string) => {
    try {
      setIsSending(true);

      let storageId: Id<"_storage"> | undefined;

      if (selectedImageUri) {
        console.log("Selected image URI:", selectedImageUri);

        // Створюємо File з локального URI
        const file = new File(selectedImageUri);

        console.log("File exists:", file.exists);
        console.log("File size:", file.size);
        console.log("File type:", file.type);

        if (!file.exists) {
          throw new Error("Файл зображення не існує або більше недоступний.");
        }

        if (!file.size || file.size <= 0) {
          throw new Error("Файл зображення порожній.");
        }

        // Отримуємо URL Convex Storage
        const uploadUrl = await generateUploadUrlMutation();

        console.log("Upload URL:", uploadUrl);

        // Отримуємо Blob з локального файлу
        const blob = await file.arrayBuffer();

        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": file.type || "image/jpeg",
          },
          body: blob,
        });

        const responseText = await uploadResult.text();

        console.log("Upload status:", uploadResult.status);

        console.log("Upload response:", responseText);

        if (!uploadResult.ok) {
          throw new Error(
            `Не вдалося завантажити зображення: HTTP ${uploadResult.status}${
              responseText ? ` — ${responseText}` : ""
            }`,
          );
        }

        let json: {
          storageId?: string;
        };

        try {
          json = JSON.parse(responseText);
        } catch {
          throw new Error(
            `Convex повернув некоректну відповідь: ${responseText}`,
          );
        }

        if (!json.storageId) {
          throw new Error(`Convex не повернув storageId: ${responseText}`);
        }

        storageId = json.storageId as Id<"_storage">;

        console.log("Uploaded storage ID:", storageId);
      }

      await sendMessageMutation({
        conversationId,
        content: text,
        storageId,
      });

      console.log("Message sent successfully");
    } catch (error: any) {
      console.error("Error sending message:", error);

      Alert.alert(
        "Помилка",
        error?.message || "Не вдалося надіслати повідомлення",
      );
    } finally {
      setIsSending(false);
    }
  };

  if (conversation === undefined || messages === undefined) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!conversation) {
    return (
      <View className="flex-1 bg-black justify-center items-center px-4">
        <Text className="text-white text-base mb-4">Бесіду не знайдено</Text>

        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-primary px-4 py-2 rounded-xl"
        >
          <Text className="text-white font-semibold">Повернутися</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const headerTitle = conversation.isGroup
    ? (conversation.name ?? "Груповий чат")
    : conversation.otherUser?.fullname ||
      conversation.otherUser?.username ||
      "Користувач";

  const headerAvatar = conversation.isGroup
    ? null
    : conversation.otherUser?.image;

  return (
    <View className="flex-1 bg-black">
      {/* Хедер чату */}
      <View className="flex-row items-center px-4 py-3 border-b border-surface">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {conversation.isGroup ? (
          <View className="w-10 h-10 rounded-full bg-surfaceLight border border-surface items-center justify-center mr-3">
            <Ionicons name="people" size={20} color={COLORS.primary} />
          </View>
        ) : (
          <Image
            source={{
              uri:
                headerAvatar ??
                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              marginRight: 12,
            }}
            contentFit="cover"
          />
        )}

        <View className="flex-1 justify-center">
          <Text numberOfLines={1} className="text-white font-bold text-base">
            {headerTitle}
          </Text>

          <Text className="text-grey text-xs">
            {conversation.isGroup
              ? `${conversation.participants.length} учасників`
              : `@${conversation.otherUser?.username ?? "user"}`}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 50}
      >
        <FlatList
          data={messages}
          inverted
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
          renderItem={({ item }) => (
            <MessageBubble
              content={item.content}
              imageUrl={item.imageUrl}
              createdAt={item.createdAt}
              isMine={item.isMine}
              senderName={item.senderName}
              isGroup={conversation.isGroup}
            />
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-16 scale-y-[-1]">
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={44}
                color={COLORS.grey}
                style={{ marginBottom: 8 }}
              />

              <Text className="text-grey text-sm text-center">
                Повідомлень ще немає. Напишіть першим!
              </Text>
            </View>
          }
        />

        <ChatInput onSendMessage={handleSendMessage} isSending={isSending} />
      </KeyboardAvoidingView>
    </View>
  );
}
