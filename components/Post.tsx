import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "expo-router";
import Animated, { cancelAnimation } from "react-native-reanimated";
import { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { CommentsModal } from "./CommentsModal";
import { useSpring } from "@/hooks/useSpring";

export type PostProps = {
  post: {
    _id: Id<"posts">;
    userId?: Id<"users">;
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

  const [commentsCount, setCommentsCount] = useState(post.comments);
  const [showComments, setShowComments] = useState(false);

  const currentUser = useQuery(api.users.currentUser);
  const deletePost = useMutation(api.posts.deletePost);

  const isOwner = currentUser?._id === post.userId;

  const router = useRouter();

  const toggleLike = useMutation(api.likes.toggleLike);
  const toggleBookmark = useMutation(api.bookmarks.toggleBookmark);

  const [animateLike, likeAnimatedStyle, likeScale] = useSpring();
  const [animateBookmark, bookmarkAnimatedStyle, bookmarkScale] = useSpring();

  const handleDelete = () => {
    Alert.alert("Видалити пост", "Ви впевнені, що хочете видалити цей пост?", [
      {
        text: "Скасувати",
        style: "cancel",
      },
      {
        text: "Видалити",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost({
              postId: post._id,
            });
          } catch (error) {
            console.error("Помилка видалення поста:", error);

            Alert.alert("Помилка", "Не вдалося видалити пост.");
          }
        },
      },
    ]);
  };

  const handleLike = async () => {
    const nextIsLiked = !isLiked;
    const previousLikesCount = likesCount;

    animateLike(nextIsLiked);

    setIsLiked(nextIsLiked);

    setLikesCount((prev) => (nextIsLiked ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const serverIsLiked = await toggleLike({
        postId: post._id,
      });

      if (serverIsLiked !== nextIsLiked) {
        setIsLiked(serverIsLiked);

        setLikesCount((prev) =>
          serverIsLiked ? prev + 1 : Math.max(0, prev - 1),
        );

        animateLike(serverIsLiked);
      }
    } catch (error) {
      console.error("Помилка оновлення лайка:", error);

      setIsLiked(post.isLiked);
      setLikesCount(previousLikesCount);

      cancelAnimation(likeScale);
      likeScale.value = 1;
    }
  };

  const handleBookmark = async () => {
    const nextIsBookmarked = !isBookmarked;

    animateBookmark(nextIsBookmarked);

    setIsBookmarked(nextIsBookmarked);

    try {
      const serverIsBookmarked = await toggleBookmark({
        postId: post._id,
      });

      if (serverIsBookmarked !== nextIsBookmarked) {
        setIsBookmarked(serverIsBookmarked);

        animateBookmark(serverIsBookmarked);
      }
    } catch (error) {
      console.error("Помилка збереження в закладки:", error);

      setIsBookmarked(post.isBookmarked);

      cancelAnimation(bookmarkScale);
      bookmarkScale.value = 1;
    }
  };

  return (
    <View className="mb-4 bg-black">
      {/* Хедер поста */}
      <View className="flex-row items-center justify-between p-3">
        <TouchableOpacity
          onPress={() => {
            if (post.author._id) {
              if (currentUser?._id === post.author._id) {
                router.push("/profile");
              } else {
                router.push(`/user/${post.author._id}`);
              }
            }
          }}
          activeOpacity={0.8}
          className="flex-row items-center"
        >
          <Image
            source={{
              uri: post.author.image,
            }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
            }}
            className="w-8 h-8 rounded-full mr-2.5 border border-surfaceLight"
            contentFit="cover"
          />

          <Text className="text-white text-sm font-semibold">
            {post.author.username}
          </Text>
        </TouchableOpacity>

        {isOwner && (
          <TouchableOpacity
            onPress={handleDelete}
            className="p-1 active:opacity-70"
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Изображение поста */}
      <Image
        source={{ uri: post.imageUrl }}
        style={{
          width: "100%",
          aspectRatio: 1,
        }}
        className="w-full aspect-square bg-surface"
        contentFit="cover"
        transition={200}
      />

      {/* Рядок дій */}
      <View className="flex-row items-center justify-between px-3 py-3">
        <View className="flex-row items-center gap-4">
          {/* Лайк */}
          <TouchableOpacity onPress={handleLike} activeOpacity={0.7}>
            <Animated.View
              style={[
                likeAnimatedStyle,
                {
                  width: 24,
                  height: 24,
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={24}
                color={isLiked ? "#EF4444" : COLORS.white}
              />
            </Animated.View>
          </TouchableOpacity>

          {/* Коментарі */}
          <TouchableOpacity
            onPress={() => setShowComments(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chatbubble-outline"
              size={22}
              color={COLORS.white}
            />
          </TouchableOpacity>
        </View>

        {/* Закладка */}
        <TouchableOpacity onPress={handleBookmark} activeOpacity={0.7}>
          <Animated.View
            style={[
              bookmarkAnimatedStyle,
              {
                width: 22,
                height: 22,
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <Ionicons
              name={isBookmarked ? "bookmark" : "bookmark-outline"}
              size={22}
              color={COLORS.white}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Информация о посте */}
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

        {commentsCount > 0 && (
          <TouchableOpacity
            onPress={() => setShowComments(true)}
            className="mt-0.5 mb-1"
          >
            <Text className="text-grey text-sm">
              Переглянути всі {commentsCount} коментарів
            </Text>
          </TouchableOpacity>
        )}

        <Text className="text-grey text-xs mb-2">
          {formatDistanceToNow(post._creationTime, {
            addSuffix: true,
          })}
        </Text>
      </View>

      {/* Модальне вікно коментарів */}
      {showComments && (
        <CommentsModal
          postId={post._id}
          visible={showComments}
          onClose={() => setShowComments(false)}
          onCommentsCountChange={setCommentsCount}
        />
      )}
    </View>
  );
};
