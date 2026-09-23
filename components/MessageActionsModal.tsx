import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    Modal,
    Pressable,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { ReactionPickerPosition } from "./ReactionPickerModal";

const POPULAR_EMOJIS = ["❤️", "🤣", "😭", "💔", "😺", "🏳‍⚧", "😍", "👬"];
const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

export interface MessageActionTarget {
  messageId: string;
  content: string;
  isMine: boolean;
  canEdit: boolean;
  canDelete: boolean;
  senderName: string;
}

interface MessageActionsModalProps {
  visible: boolean;
  position?: ReactionPickerPosition | null;
  target?: MessageActionTarget | null;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  onReply: () => void;
  onCopy: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const MessageActionsModal: React.FC<MessageActionsModalProps> = ({
  visible,
  position,
  target,
  onClose,
  onSelectEmoji,
  onReply,
  onCopy,
  onEdit,
  onDelete,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 15,
          stiffness: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 90,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible || !target) return null;

  const handleEmojiSelect = (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectEmoji(emoji);
    onClose();
  };

  const handleAction = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    setTimeout(() => {
      action();
    }, 120);
  };

  // Розрахунок позиції вікна відносно повідомлення
  const MENU_WIDTH = 220;
  const isMine = position?.isMine ?? target.isMine;

  let top = position ? position.y + 40 : SCREEN_HEIGHT / 3;
  if (top + 240 > SCREEN_HEIGHT) {
    top = Math.max(70, top - 260);
  }

  let left = isMine ? SCREEN_WIDTH - MENU_WIDTH - 16 : 16;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Напівпрозорий бекдроп */}
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
        onPress={onClose}
      />

      <Animated.View
        style={[
          {
            position: "absolute",
            top,
            left,
            width: MENU_WIDTH,
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
            zIndex: 100,
          },
        ]}
      >
        {/* 1. Горизонтальний блок емодзі реакцій */}
        <View className="flex-row items-center justify-around bg-[#1F1F23] rounded-3xl p-1.5 mb-2.5 border border-white/10 shadow-2xl shadow-black">
          {POPULAR_EMOJIS.slice(0, 6).map((emoji) => (
            <TouchableOpacity
              key={emoji}
              activeOpacity={0.7}
              onPress={() => handleEmojiSelect(emoji)}
              className="w-8 h-8 items-center justify-center rounded-full"
            >
              <Text style={{ fontSize: 20 }}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 2. Контекстне меню дій */}
        <View className="bg-[#1F1F23] rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black">
          {/* Відповісти */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleAction(onReply)}
            className="flex-row items-center px-4 py-3 border-b border-white/5 active:bg-white/5"
          >
            <Ionicons
              name="arrow-undo-outline"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 12 }}
            />
            <Text className="text-white text-sm font-medium">Відповісти</Text>
          </TouchableOpacity>

          {/* Копіювати текст (якщо є текст) */}
          {target.content ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleAction(onCopy)}
              className="flex-row items-center px-4 py-3 border-b border-white/5 active:bg-white/5"
            >
              <Ionicons
                name="copy-outline"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 12 }}
              />
              <Text className="text-white text-sm font-medium">
                Копіювати текст
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Редагувати (якщо доступно) */}
          {target.canEdit && onEdit ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleAction(onEdit)}
              className="flex-row items-center px-4 py-3 border-b border-white/5 active:bg-white/5"
            >
              <Ionicons
                name="pencil-outline"
                size={18}
                color={COLORS.primary}
                style={{ marginRight: 12 }}
              />
              <Text className="text-white text-sm font-medium">Редагувати</Text>
            </TouchableOpacity>
          ) : null}

          {/* Видалити (якщо є права) */}
          {target.canDelete && onDelete ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleAction(onDelete)}
              className="flex-row items-center px-4 py-3 active:bg-red-500/10"
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color="#EF4444"
                style={{ marginRight: 12 }}
              />
              <Text className="text-red-500 text-sm font-medium">Видалити</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </Animated.View>
    </Modal>
  );
};
