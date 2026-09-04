import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

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
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked);

  // Підключення мутацій Convex
  const toggleLike = useMutation(api.likes.toggleLike);
  const toggleBookmark = useMutation(api.bookmarks.toggleBookmark);
  const handleLike = async () => {
    const nextIsLiked = !isLiked;
    const previousLikesCount = likesCount;

    // 1. Миттєво оновлюємо стан на екрані
    setIsLiked(nextIsLiked);
    setLikesCount((prev) => (nextIsLiked ? prev + 1 : Math.max(0, prev - 1)));

    try {
      // 2. Відправляємо запит на сервер
      const serverIsLiked = await toggleLike({ postId: post._id });

      // 3. Синхронізуємо у разі розбіжності з сервером
      if (serverIsLiked !== nextIsLiked) {
        setIsLiked(serverIsLiked);
        setLikesCount((prev) =>
          serverIsLiked ? prev + 1 : Math.max(0, prev - 1),
        );
      }
    } catch (error) {
      console.error("Помилка оновлення лайка:", error);
      // Відкочуємо стан назад у разі збою
      setIsLiked(post.isLiked);
      setLikesCount(previousLikesCount);
    }
  };

  // Обробник натискання на закладку
  const handleBookmark = async () => {
    const nextIsBookmarked = !isBookmarked;
    setIsBookmarked(nextIsBookmarked);

    try {
      const serverIsBookmarked = await toggleBookmark({ postId: post._id });
      if (serverIsBookmarked !== nextIsBookmarked) {
        setIsBookmarked(serverIsBookmarked);
      }
    } catch (error) {
      console.error("Помилка збереження в закладки:", error);
      setIsBookmarked(post.isBookmarked);
    }
  };

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
          <TouchableOpacity onPress={handleLike} activeOpacity={0.7}>
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={24}
              color={isLiked ? "#EF4444" : COLORS.white}
            />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons
              name="chatbubble-outline"
              size={22}
              color={COLORS.white}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleBookmark} activeOpacity={0.7}>
          <Ionicons
            name={isBookmarked ? "bookmark" : "bookmark-outline"}
            size={22}
            color={COLORS.white}
          />
        </TouchableOpacity>
      </View>

      {/* Інформація про пост: лічильник лайків та опис */}
      <View className="px-3">
        <Text className="text-white text-sm font-semibold mb-1.5">
          {likesCount > 0
            ? `${likesCount.toLocaleString()} вподобань`
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
