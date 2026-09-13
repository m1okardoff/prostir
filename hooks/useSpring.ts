import {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

export function useSpring() {
  const springScale = useSharedValue(1);

  const springAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: springScale.value }],
  }));

  const animateSpring = (checked: boolean) => {
    cancelAnimation(springScale);

    if (!checked) {
      springScale.value = 1;
      return;
    }

    springScale.value = 1;

    springScale.value = withSequence(
      withSpring(1.2, {
        damping: 14,
        stiffness: 650,
      }),
      withSpring(0.96, {
        damping: 16,
        stiffness: 650,
      }),
      withSpring(1, {
        damping: 16,
        stiffness: 650,
      }),
    );
  };

  return [animateSpring, springAnimatedStyle, springScale] as const;
}
