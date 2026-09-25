import { ChatInput } from "@/components/ChatInput";
import { GroupInfoModal } from "@/components/GroupInfoModal";
import { MessageActionTarget } from "@/components/MessageActionsModal";
import { MessageBubble } from "@/components/MessageBubble";
import {
  ReactionPickerModal,
  ReactionPickerPosition,
} from "@/components/ReactionPickerModal";
import { SwipeableMessageItem } from "@/components/SwipeableMessageItem";
import { VideoNoteRecorderModal } from "@/components/VideoNoteRecorderModal";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { File } from "expo-file-system";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { fetch } from "expo/fetch";
import { useRef, useState } from "react";
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
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id as Id<"conversations">;

  const [isSending, setIsSending] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [isVideoRecorderVisible, setIsVideoRecorderVisible] = useState(false);

  const currentUserId = useQuery(api.users.currentUser)?._id;

  const scrollToBottom = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const conversation = useQuery(api.conversations.getConversation, {
    conversationId,
  });

  const {
    results: messages,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.messages.getPaginatedMessages,
    { conversationId },
    { initialNumItems: 25 },
  );

  const sendMessageMutation = useMutation(api.messages.sendMessage);

  const generateUploadUrlMutation = useMutation(api.messages.generateUploadUrl);

  const editMessageMutation = useMutation(api.messages.editMessage);
  const deleteMessageMutation = useMutation(api.messages.deleteMessage);
  const [actionsModalState, setActionsModalState] = useState<{
    visible: boolean;
    position: ReactionPickerPosition | null;
    target: MessageActionTarget | null;
  }>({
    visible: false,
    position: null,
    target: null,
  });

  const [editingMessage, setEditingMessage] = useState<{
    messageId: string;
    text: string;
  } | null>(null);

  const [replyingTo, setReplyingTo] = useState<{
    messageId: string;
    senderName: string;
    text: string;
  } | null>(null);

  const [pickerState, setPickerState] = useState<{
    messageId: Id<"messages">;
    position: ReactionPickerPosition;
  } | null>(null);

  // 2. Мутація перемикання реакцій:
  const toggleReactionMutation = useMutation(api.messages.toggleReaction);

  const handleToggleReaction = async (
    messageId: Id<"messages">,
    emoji: string,
  ) => {
    try {
      await toggleReactionMutation({ messageId, emoji });
    } catch (error) {
      console.error("Помилка зміни реакції:", error);
    }
  };

  // Обробник надсилання відеокружечка
  const handleSendVideoNote = async (
    videoUri: string,
    durationSeconds: number,
  ) => {
    try {
      setIsSending(true);

      // 1. Отримуємо одноразовий URL для завантаження в Convex Storage
      const uploadUrl = await generateUploadUrlMutation();

      // 2. Створюємо екземпляр файлу
      const file = new File(videoUri);

      // 3. Завантажуємо .mp4 файл
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "video/mp4" },
        body: file,
      });

      if (!uploadResult.ok) {
        throw new Error("Не вдалося завантажити відеокружечок");
      }

      const { storageId } = await uploadResult.json();

      // 4. Зберігаємо повідомлення в базі
      await sendMessageMutation({
        conversationId,
        content: "",
        videoStorageId: storageId,
        videoDuration: durationSeconds,
        isVideoNote: true,
      });
    } catch (error: any) {
      console.error("Помилка надсилання кружечка:", error);
      Alert.alert(
        "Помилка",
        error?.message || "Не вдалося надіслати відеокружечок",
      );
    } finally {
      setIsSending(false);
    }
  };

  // Копіювання в буфер обміну
  const handleCopyMessage = async (content: string) => {
    // Якщо встановлено expo-clipboard:
    // await Clipboard.setStringAsync(content);
    Alert.alert("Успішно", "Текст повідомлення скопійовано");
  };

  // Старт редагування
  const handleStartEdit = (messageId: string, text: string) => {
    setReplyingTo(null); // скасовуємо відповідь, якщо була активна
    setEditingMessage({ messageId, text });
  };

  // Збереження відредагованого тексту
  const handleSaveEdit = async (messageId: string, newText: string) => {
    try {
      setIsSending(true);
      await editMessageMutation({
        messageId: messageId as Id<"messages">,
        content: newText,
      });
      setEditingMessage(null);
    } catch (error: any) {
      console.error("Помилка редагування:", error);
      Alert.alert("Помилка", error.message || "Не вдалося зберегти зміни");
    } finally {
      setIsSending(false);
    }
  };

  // Видалення повідомлення з підтвердженням
  const handleDeleteMessage = (messageId: string) => {
    Alert.alert(
      "Видалити повідомлення?",
      "Це повідомлення буде безповоротно видалено для всіх учасників бесіди.",
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Видалити",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMessageMutation({
                messageId: messageId as Id<"messages">,
              });
            } catch (error: any) {
              console.error("Помилка видалення повідомлення:", error);
              Alert.alert(
                "Помилка",
                error.message || "Не вдалося видалити повідомлення",
              );
            }
          },
        },
      ],
    );
  };

  // Обробник надсилання голосового повідомлення
  const handleSendAudio = async (
    audioUri: string,
    durationSeconds: number,
    waveform?: number[],
  ) => {
    try {
      setIsSending(true);

      // 1. Отримуємо одноразовий URL для завантаження аудіо
      const uploadUrl = await generateUploadUrlMutation();

      // 2. Створюємо екземпляр файлу з локального URI
      const file = new File(audioUri);

      // 3. Завантажуємо файл у Convex Storage через expo/fetch
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "audio/m4a" },
        body: file,
      });

      if (!uploadResult.ok) {
        const errorText = await uploadResult.text();
        throw new Error(
          `Не вдалося завантажити голосове повідомлення: HTTP ${uploadResult.status}${
            errorText ? ` — ${errorText}` : ""
          }`,
        );
      }

      const { storageId } = await uploadResult.json();

      // 4. Зберігаємо повідомлення в базі
      await sendMessageMutation({
        conversationId,
        content: "",
        audioStorageId: storageId,
        audioDuration: durationSeconds,
        waveform,
      });
    } catch (error: any) {
      console.error("Помилка надсилання аудіо:", error);
      Alert.alert(
        "Помилка",
        error.message || "Не вдалося надіслати голосове повідомлення",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async (text: string, selectedImageUri?: string) => {
    try {
      setIsSending(true);
      let storageId: Id<"_storage"> | undefined;

      if (selectedImageUri) {
        const uploadUrl = await generateUploadUrlMutation();
        const file = new File(selectedImageUri);
        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: file,
        });
        const { storageId: uploadedId } = await uploadResult.json();
        storageId = uploadedId;
      }

      // Передаємо параметри цитування (якщо є)
      await sendMessageMutation({
        conversationId,
        content: text,
        storageId,
        replyToId: replyingTo?.messageId as Id<"messages"> | undefined,
        replyToSender: replyingTo?.senderName,
        replyToText: replyingTo?.text,
      });

      // Скидаємо стан відповіді
      setReplyingTo(null);
    } catch (error: any) {
      Alert.alert(
        "Помилка",
        error?.message || "Не вдалося надіслати повідомлення",
      );
    } finally {
      setIsSending(false);
    }
  };

  const [isGroupInfoVisible, setIsGroupInfoVisible] = useState(false);

  if (conversation === undefined || (isLoading && messages.length === 0)) {
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
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface">
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Натискання на аватар та назву для відкриття інфо */}
          <TouchableOpacity
            onPress={() => conversation.isGroup && setIsGroupInfoVisible(true)}
            disabled={!conversation.isGroup}
            className="flex-row items-center flex-1"
          >
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
              <Text
                numberOfLines={1}
                className="text-white font-bold text-base"
              >
                {headerTitle}
              </Text>

              <Text className="text-grey text-xs">
                {conversation.isGroup
                  ? `${conversation.participants.length} учасників • Натисніть для інфо`
                  : `@${conversation.otherUser?.username ?? "user"}`}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Кнопка налаштувань / інформації про групу */}
        {conversation.isGroup && (
          <TouchableOpacity
            onPress={() => setIsGroupInfoVisible(true)}
            className="p-1 active:opacity-70"
          >
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 50}
      >
        <View className="flex-1 relative">
          <FlatList
            ref={flatListRef}
            data={messages}
            inverted
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
            onScroll={(event) => {
              const offsetY = event.nativeEvent.contentOffset.y;
              if (offsetY > 300 && !showScrollBottom) {
                setShowScrollBottom(true);
              } else if (offsetY <= 300 && showScrollBottom) {
                setShowScrollBottom(false);
              }
            }}
            scrollEventThrottle={16}
            onEndReached={() => {
              if (status === "CanLoadMore") {
                loadMore(20);
              }
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              status === "LoadingMore" ? (
                <View className="py-4 items-center justify-center">
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <SwipeableMessageItem
                isSystem={item.isSystem}
                isMine={item.isMine}
                onReply={() => {
                  if (item.isSystem) return;
                  setReplyingTo({
                    messageId: item._id,
                    senderName: item.senderName,
                    text:
                      item.content ||
                      (item.imageUrl ? "📷 Фотографія" : "🎤 Голосове"),
                  });
                }}
                onDoubleTap={() => {
                  if (!item.isSystem) {
                    handleToggleReaction(item._id, "❤️");
                  }
                }}
                onLongPress={(position) => {
                  if (!item.isSystem) {
                    const canEdit = item.isMine && !!item.content;
                    const canDelete =
                      item.isMine ||
                      (!!currentUserId && conversation.creatorId === currentUserId) ||
                      (!!currentUserId &&
                        (conversation.adminIds?.includes(currentUserId) ??
                          false));

                    setActionsModalState({
                      visible: true,
                      position,
                      target: {
                        messageId: item._id,
                        content: item.content || "",
                        isMine: item.isMine,
                        canEdit,
                        canDelete,
                        senderName: item.senderName,
                      },
                    });
                  }
                }}
              >
                <MessageBubble
                  content={item.content}
                  imageUrl={item.imageUrl}
                  createdAt={item.createdAt}
                  isMine={item.isMine}
                  senderName={item.senderName}
                  isGroup={conversation.isGroup}
                  senderAvatar={item.senderAvatar}
                  senderId={item.senderId}
                  audioUrl={item.audioUrl}
                  audioDuration={item.audioDuration}
                  videoUrl={item.videoUrl}
                  videoDuration={item.videoDuration}
                  isVideoNote={item.isVideoNote}
                  replyToSender={item.replyToSender}
                  replyToText={item.replyToText}
                  reactions={item.reactions}
                  onToggleReaction={(emoji) =>
                    handleToggleReaction(item._id, emoji)
                  }
                  isSystem={item.isSystem}
                  waveform={item.waveform}
                />
              </SwipeableMessageItem>
            )}
            ListEmptyComponent={
              isLoading ? null : (
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
              )
            }
          />

          {/* Плаваюча кнопка повернення до останнього повідомлення */}
          {showScrollBottom && (
            <Animated.View
              entering={FadeInDown.duration(200)}
              exiting={FadeOutDown.duration(200)}
              className="absolute bottom-3 right-4 z-20"
            >
              <TouchableOpacity
                onPress={scrollToBottom}
                activeOpacity={0.8}
                className="w-10 h-10 rounded-full bg-surface/95 border border-surfaceLight items-center justify-center shadow-lg shadow-black/60"
              >
                <Ionicons
                  name="chevron-down"
                  size={22}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        <ChatInput
          onSendMessage={handleSendMessage}
          onSendAudio={handleSendAudio}
          onOpenVideoRecorder={() => setIsVideoRecorderVisible(true)}
          isSending={isSending}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </KeyboardAvoidingView>
      {/* Модальне меню швидких емодзі */}
      <ReactionPickerModal
        visible={!!pickerState}
        position={pickerState?.position}
        onClose={() => setPickerState(null)}
        onSelectEmoji={(emoji) => {
          if (pickerState) {
            handleToggleReaction(pickerState.messageId, emoji);
          }
        }}
      />
      {conversation.isGroup && (
        <GroupInfoModal
          visible={isGroupInfoVisible}
          onClose={() => setIsGroupInfoVisible(false)}
          conversationId={conversationId}
          groupName={conversation.name ?? "Груповий чат"}
          creatorId={conversation.creatorId}
          participants={conversation.participants}
          currentUserRole={conversation.currentUserRole}
          canManageMembers={conversation.canManageMembers}
          canDeleteChat={conversation.canDeleteChat}
          onConversationDeleted={() => router.replace("/messages")}
        />
      )}
      <VideoNoteRecorderModal
        visible={isVideoRecorderVisible}
        onClose={() => setIsVideoRecorderVisible(false)}
        onFinishRecording={handleSendVideoNote}
      />
    </View>
  );
}
