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

const POPULAR_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🔥", "🎉", "👏"];
const PICKER_WIDTH = POPULAR_EMOJIS.length * 44 + 16;
const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

export interface ReactionPickerPosition {
  x: number;       // центр повідомлення по X
  y: number;       // верхній край повідомлення по Y
  isMine: boolean; // чи моє повідомлення (впливає на сторону)
}

interface ReactionPickerModalProps {
  visible: boolean;
  position?: ReactionPickerPosition | null;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}

export const ReactionPickerModal: React.FC<ReactionPickerModalProps> = ({
  visible,
  position,
  onClose,
  onSelectEmoji,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 14,
          stiffness: 200,
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
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSelect = (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectEmoji(emoji);
    onClose();
  };

  // Обчислюємо позицію бабла відносно повідомлення
  const getPickerStyle = () => {
    if (!position) return { top: SCREEN_HEIGHT / 2, left: 16 };

    const PICKER_HEIGHT = 58;
    const MARGIN = 8;

    // Показуємо пікер ВИЩЕ повідомлення
    let top = position.y - PICKER_HEIGHT - MARGIN;
    if (top < 50) top = position.y + MARGIN + 48; // якщо мало місця зверху — знизу

    // Горизонтальна позиція: прив'язуємо до сторони повідомлення
    let left = position.isMine
      ? position.x - PICKER_WIDTH + 16   // моє — правий край
      : position.x - 16;                 // чуже — лівий край

    // Не виходимо за межі екрану
    left = Math.max(8, Math.min(left, SCREEN_WIDTH - PICKER_WIDTH - 8));

    return { top, left };
  };

  const pickerStyle = getPickerStyle();

  // Точка "хвостика" пікера (трикутник), де він з'являється
  const transformOriginX = position?.isMine ? "100%" : "0%";

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Напівпрозора підкладка */}
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }}
        onPress={onClose}
      />

      {/* Picker бабл — абсолютно позиціонований */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: pickerStyle.top,
            left: pickerStyle.left,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#1C1C1E",
            borderRadius: 32,
            paddingHorizontal: 8,
            paddingVertical: 6,
            gap: 2,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.5,
            shadowRadius: 16,
            elevation: 24,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
            transformOrigin: `${transformOriginX} 100%`,
          },
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {POPULAR_EMOJIS.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            activeOpacity={0.65}
            onPress={() => handleSelect(emoji)}
            style={{
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 20,
            }}
          >
            <Text style={{ fontSize: 24 }}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </Modal>
  );
};
