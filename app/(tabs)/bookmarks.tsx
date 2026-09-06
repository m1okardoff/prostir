import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function BookmarksScreen() {
  const bookmarkedPosts = useQuery(api.bookmarks.getBookmarkedPosts);
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

      {bookmarkedPosts.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
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
      ) : (
        /* Сітка збережених постів */
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
          <View className="flex-row flex-wrap p-0.5">
            {bookmarkedPosts.map((post) => (
              <View key={post._id} className="w-1/3 aspect-square p-0.5">
                <TouchableOpacity
                  activeOpacity={0.8}
                  className="w-full h-full bg-surface"
                  onPress={() => router.push(`/post/${post._id}`)}
                >
                  <Image
                    source={{ uri: post.imageUrl }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
