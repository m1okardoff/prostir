import { Post } from "@/components/Post";
import { StoriesSection } from "@/components/StoriesSection";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { Ionicons } from "@expo/vector-icons";
import { usePaginatedQuery } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PAGE_SIZE = 5;

export default function FeedScreen() {
  const { signOut } = useAuthActions();
  const [refreshing, setRefreshing] = useState(false);

  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.posts.getPaginatedPosts,
    {},
    { initialNumItems: PAGE_SIZE },
  );

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  const handleLoadMore = () => {
    if (status === "CanLoadMore") {
      loadMore(PAGE_SIZE);
    }
  };

  if (status === "LoadingFirstPage") {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Хедер додатку Prostir */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface">
        <Text className="text-2xl font-bold text-primary">Prostir</Text>

        <View className="flex-row items-center gap-3">
          {/* Іконка переходу до списку чатів */}
          <TouchableOpacity
            onPress={() => router.push("/messages")}
            className="p-1 active:opacity-70"
          >
            <Ionicons name="paper-plane-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Кнопка виходу */}
          <TouchableOpacity
            onPress={() => signOut()}
            className="p-1 active:opacity-70"
          >
            <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
      {/* Стрічка постів */}
      <FlatList
        data={results}
        renderItem={({ item }) => <Post post={item} />}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        ListHeaderComponent={<StoriesSection />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListFooterComponent={
          status === "LoadingMore" ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : status === "Exhausted" && results.length > 0 ? (
            <View className="py-6 items-center">
              <Text className="text-grey text-xs">
                Ви переглянули всі публікації &#x1f389;
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="flex-1 justify-center items-center mt-12 px-6">
              <Ionicons
                name="images-outline"
                size={48}
                color={COLORS.grey}
                style={{ marginBottom: 12 }}
              />
              <Text className="text-grey text-base text-center">
                Постів ще немає. Створіть перший у вкладці «+»
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
