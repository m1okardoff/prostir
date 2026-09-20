import { Post } from "@/components/Post";
import { StoriesSection } from "@/components/StoriesSection";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { Ionicons } from "@expo/vector-icons";
import { usePaginatedQuery } from "convex/react";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

const PAGE_SIZE = 5;

export default function FeedScreen() {
  const { signOut } = useAuthActions();
  const [refreshing, setRefreshing] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

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
        ref={flatListRef}
        data={results}
        renderItem={({ item }) => <Post post={item} />}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        ListHeaderComponent={<StoriesSection />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          if (offsetY > 400 && !showScrollTop) {
            setShowScrollTop(true);
          } else if (offsetY <= 400 && showScrollTop) {
            setShowScrollTop(false);
          }
        }}
        scrollEventThrottle={16}
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
                Ви переглянули всі публікації 🎉
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

      {/* Плаваюча кнопка повернення до останнього (найновішого) посту */}
      {showScrollTop && (
        <Animated.View
          entering={FadeInDown.duration(200)}
          exiting={FadeOutDown.duration(200)}
          className="absolute bottom-20 right-4 z-30"
        >
          <TouchableOpacity
            onPress={scrollToTop}
            activeOpacity={0.8}
            className="flex-row items-center gap-1.5 bg-surface/95 border border-surfaceLight px-3.5 py-2.5 rounded-full shadow-lg shadow-black/70"
          >
            <Ionicons name="arrow-up" size={16} color={COLORS.primary} />
            <Text className="text-white text-xs font-semibold">
              До останнього
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}
