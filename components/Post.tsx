import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";
import { Id } from "@/convex/_generated/dataModel";

export type PostProps = {
  post: {
    _id: Id<"posts">;
    imageUrl: string;
    caption?: string;
    likes: number;
    comments: number;
    _creationTime: number;
    isLiked: boolean;
    isBookmarked: boolean;
    author: {
      _id?: Id<"users">;
      username: string;
      image: string;
    };
  };
};

export const Post = ({ post }: PostProps) => {
  return (
    <View className="mb-4 bg-black">
      {/* Хедер поста: автор та аватар */}
      <View className="flex-row items-center justify-between p-3">
        <View className="flex-row items-center">
          <Image
            source={{ uri: post.author.image }}
            className="w-8 h-8 rounded-full mr-2.5 border border-surfaceLight"
          />
          <Text className="text-white text-sm font-semibold">
            {post.author.username}
          </Text>
        </View>
      </View>

      {/* Зображення поста */}
      <Image
        source={{ uri: post.imageUrl }}
        className="w-full aspect-square bg-surface"
        resizeMode="cover"
      />

      {/* Рядок дій (кнопки лайка, коментаря, закладки) */}
      <View className="flex-row items-center justify-between px-3 py-3">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons name="heart-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons
              name="chatbubble-outline"
              size={22}
              color={COLORS.white}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity activeOpacity={0.7}>
          <Ionicons name="bookmark-outline" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Інформація про пост: лічильник лайків та опис */}
      <View className="px-3">
        <Text className="text-white text-sm font-semibold mb-1.5">
          {post.likes > 0
            ? `${post.likes.toLocaleString()} вподобань`
            : "Будьте першим, кому це сподобалося"}
        </Text>

        {post.caption ? (
          <View className="flex-row flex-wrap mb-1.5">
            <Text className="text-white text-sm font-semibold mr-1.5">
              {post.author.username}
            </Text>
            <Text className="text-white text-sm flex-1">{post.caption}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};