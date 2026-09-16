import React, { useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";

export interface ReactionItem {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface MessageReactionsProps {
  reactions?: ReactionItem[];
  onToggleReaction: (emoji: string) => void;
  isMine: boolean;
}

const ReactionPill: React.FC<{
  item: ReactionItem;
  onToggle: () => void;
}> = ({ item, onToggle }) => {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 12,
        stiffness: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggle}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 20,
          borderWidth: 1,
          gap: 3,
          backgroundColor: item.hasReacted
            ? "rgba(99, 102, 241, 0.20)"
            : "rgba(255,255,255,0.07)",
          borderColor: item.hasReacted
            ? "rgba(99, 102, 241, 0.7)"
            : "rgba(255,255,255,0.12)",
        }}
      >
        <Text style={{ fontSize: 14 }}>{item.emoji}</Text>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: item.hasReacted ? "#818CF8" : "#9CA3AF",
          }}
        >
          {item.count}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  onToggleReaction,
  isMine,
}) => {
  if (!reactions || reactions.length === 0) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 4,
        marginTop: 4,
        justifyContent: isMine ? "flex-end" : "flex-start",
      }}
    >
      {reactions.map((item) => (
        <ReactionPill
          key={item.emoji}
          item={item}
          onToggle={() => onToggleReaction(item.emoji)}
        />
      ))}
    </View>
  );
};
