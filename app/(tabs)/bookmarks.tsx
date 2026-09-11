import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { usePaginatedQuery } from "convex/react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function BookmarksScreen() {
  // Кількість публікацій на одну сторінку (кратно 3)
  const BOOKMARKS_PAGE_SIZE = 24;

  // Пагіноване завантаження збережених постів
  const {
    results: bookmarkedPosts,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.bookmarks.getPaginatedBookmarks,
    {},
    { initialNumItems: BOOKMARKS_PAGE_SIZE },
  );

  const handleLoadMore = () => {
    if (status === "CanLoadMore") {
      loadMore(BOOKMARKS_PAGE_SIZE);
    }
  };
  const router = useRouter();

  if (bookmarkedPosts === undefined) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Хедер сторінки */}
      <View className="px-4 py-3 border-b border-surface">
        <Text className="text-2xl font-bold text-primary">Закладки</Text>
      </View>

      {/* Оптимізована сітка 3x3 з віртуалізацією через FlatList */}
      <FlatList
        data={bookmarkedPosts}
        keyExtractor={(item) => item._id}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <View className="w-1/3 aspect-square p-0.5">
            <TouchableOpacity
              activeOpacity={0.8}
              className="w-full h-full bg-surface"
              onPress={() => router.push(`/post/${item._id}`)}
            >
              <Image
                source={{ uri: item.imageUrl }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </TouchableOpacity>
          </View>
        )}
        ListFooterComponent={
          status === "LoadingMore" ? (
            <View className="py-4 items-center w-full">
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="py-20 justify-center items-center px-6">
              <Ionicons
                name="bookmark-outline"
                size={52}
                color={COLORS.grey}
                style={{ marginBottom: 12 }}
              />
              <Text className="text-white text-lg font-semibold mb-1">
                Немає збережених публікацій
              </Text>
              <Text className="text-grey text-sm text-center">
                Публікації, які ви додасте у закладки, з'являться тут.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
