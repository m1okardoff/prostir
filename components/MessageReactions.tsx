import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

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

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  onToggleReaction,
  isMine,
}) => {
  if (!reactions || reactions.length === 0) return null;

  return (
    <View
      className={`flex-row flex-wrap gap-1 mt-1.5 ${
        isMine ? "justify-end" : "justify-start"
      }`}
    >
      {reactions.map((item) => (
        <TouchableOpacity
          key={item.emoji}
          activeOpacity={0.7}
          onPress={() => onToggleReaction(item.emoji)}
          className={`flex-row items-center px-2 py-0.5 rounded-full border ${
            item.hasReacted
              ? "bg-primary/20 border-primary"
              : "bg-surface border-surfaceLight"
          }`}
        >
          <Text className="text-xs mr-1">{item.emoji}</Text>
          <Text
            className={`text-[11px] font-semibold ${
              item.hasReacted ? "text-primary" : "text-grey"
            }`}
          >
            {item.count}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
