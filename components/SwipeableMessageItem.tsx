import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  clamp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

interface SwipeableMessageItemProps {
  children: React.ReactNode;
  onReply: () => void;
  onDoubleTap: () => void;
  onLongPress: () => void;
  isMine: boolean;
}

const SWIPE_THRESHOLD = 50; // Поріг активації відповіді (пікселі)

export const SwipeableMessageItem: React.FC<SwipeableMessageItemProps> = ({
  children,
  onReply,
  onDoubleTap,
  onLongPress,
  isMine,
}) => {
  const translateX = useSharedValue(0);

  const triggerReply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onReply();
  };

  const triggerDoubleTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDoubleTap();
  };

  const triggerLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onLongPress();
  };

  // 1. Жест свайпу праворуч для відповіді
  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15]) // Не блокуємо вертикальний скрол списку
    .onUpdate((event) => {
      // Дозволяємо тягнути тільки вправо (від 0 до 70 пікселів)
      translateX.value = clamp(event.translationX, 0, 70);
    })
    .onEnd(() => {
      if (translateX.value >= SWIPE_THRESHOLD) {
        runOnJS(triggerReply)();
      }
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
    });

  // 2. Жест подвійного тапу для швидкого лайка ❤️
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(triggerDoubleTap)();
    });

  // 3. Жест довгого затискання для вибору емодзі
  const longPressGesture = Gesture.LongPress()
    .minDuration(350)
    .onEnd(() => {
      runOnJS(triggerLongPress)();
    });

  // Компонуємо тапи: дабл-тап має пріоритет над лонг-пресом
  const tapGestures = Gesture.Exclusive(doubleTapGesture, longPressGesture);
  const composedGesture = Gesture.Simultaneous(panGesture, tapGestures);

  // Анімований стиль зсуву бульбашки
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Анімована іконка стрілочки відповіді, що плавно з'являється зліва
  const replyIconStyle = useAnimatedStyle(() => ({
    opacity: clamp(translateX.value / SWIPE_THRESHOLD, 0, 1),
    transform: [{ scale: clamp(translateX.value / SWIPE_THRESHOLD, 0.5, 1.1) }],
  }));

  return (
    <GestureHandlerRootView>
    <View className="relative w-full my-1 justify-center">
      {/* Прихована іконка відповіді ліворуч */}
      <Animated.View
        style={[replyIconStyle]}
        className="absolute left-2 z-0 w-8 h-8 rounded-full bg-surface items-center justify-center"
      >
        <Ionicons name="arrow-undo" size={16} color={COLORS.primary} />
      </Animated.View>

      {/* Основний вміст повідомлення з жестами */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={animatedStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
    </GestureHandlerRootView>
  );
};
