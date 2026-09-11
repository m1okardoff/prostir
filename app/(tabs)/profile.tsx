import { EditProfileModal } from "@/components/EditProfileModal";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { Ionicons } from "@expo/vector-icons";
import { usePaginatedQuery, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const PROFILE_PAGE_SIZE = 12;

export default function ProfileScreen() {
    const router = useRouter();
    const { signOut } = useAuthActions();

    const user = useQuery(api.users.currentUser);

    const [isEditModalVisible, setIsEditModalVisible] = useState(false);

    const {
        results: posts,
        status,
        loadMore,
        isLoading,
    } = usePaginatedQuery(
        api.posts.getPaginatedPostsByUser,
        {},
        { initialNumItems: PROFILE_PAGE_SIZE },
    );

    const handleLoadMore = () => {
        if (status === "CanLoadMore") {
            loadMore(PROFILE_PAGE_SIZE);
        }
    };

    if (user === undefined || (isLoading && posts.length === 0)) {
        return (
            <View className="flex-1 bg-black justify-center items-center">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (user === null) {
        return (
            <View className="flex-1 bg-black justify-center items-center p-6">
                <Text className="text-white text-base text-center">
                    Будь ласка, увійдіть у додаток
                </Text>
            </View>
        );
    }

    const renderHeader = () => (
        <View>
            <View className="p-4">
                {/* Аватар та статистика */}
                <View className="flex-row items-center justify-between mb-4">
                    <TouchableOpacity
                        onPress={() => setIsEditModalVisible(true)}
                        className="relative"
                        activeOpacity={0.8}
                    >
                        {user.image ? (
                            <Image
                                source={{ uri: user.image }}
                                className="w-20 h-20 rounded-full border-2 border-surfaceLight"
                            />
                        ) : (
                            <View className="w-20 h-20 rounded-full bg-surface border-2 border-surfaceLight items-center justify-center">
                                <Ionicons
                                    name="person"
                                    size={38}
                                    color={COLORS.primary}
                                />
                            </View>
                        )}
                        <View className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary items-center justify-center border-2 border-black">
                            <Ionicons name="pencil" size={12} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>

                    <View className="flex-row items-center flex-1 justify-around ml-4">
                        <View className="items-center">
                            <Text className="text-white text-lg font-bold">
                                {user.posts ?? posts.length}
                            </Text>
                            <Text className="text-grey text-xs">
                                Публікації
                            </Text>
                        </View>

                        <View className="items-center">
                            <Text className="text-white text-lg font-bold">
                                {user.followers ?? 0}
                            </Text>
                            <Text className="text-grey text-xs">Читачі</Text>
                        </View>

                        <View className="items-center">
                            <Text className="text-white text-lg font-bold">
                                {user.following ?? 0}
                            </Text>
                            <Text className="text-grey text-xs">Стежить</Text>
                        </View>
                    </View>
                </View>

                {/* Ім'я та Bio */}
                <View className="mb-4">
                    <Text className="text-white font-bold text-base">
                        {user.fullname ?? user.name ?? "Без імені"}
                    </Text>
                    {user.bio ? (
                        <Text className="text-white/90 text-sm mt-1 leading-5">
                            {user.bio}
                        </Text>
                    ) : null}
                </View>

                {/* Кнопки дій */}
                <View className="flex-row gap-2">
                    <TouchableOpacity
                        onPress={() => setIsEditModalVisible(true)}
                        className="flex-1 bg-surface border border-surfaceLight py-2.5 rounded-xl items-center active:bg-surfaceLight"
                        activeOpacity={0.8}
                    >
                        <Text className="text-white font-semibold text-sm">
                            Редагувати профіль
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={async () => await signOut()}
                        className="px-4 bg-red-600/20 border border-red-500/30 py-2.5 rounded-xl items-center justify-center active:bg-red-600/30"
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="log-out-outline"
                            size={18}
                            color="#EF4444"
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Розділювач та таб сітки */}
            <View className="flex-row border-t border-b border-surface py-3 justify-center items-center">
                <Ionicons name="grid" size={20} color={COLORS.primary} />
                <Text className="text-white text-xs font-semibold uppercase ml-2 tracking-wider">
                    Публікації
                </Text>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-black">
            {/* Хедер сторінки */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface">
                <Text className="text-xl font-bold text-white">
                    {user.username
                        ? `@${user.username}`
                        : (user.fullname ?? user.name ?? "Мій профіль")}
                </Text>

                <TouchableOpacity
                    onPress={() => setIsEditModalVisible(true)}
                    className="p-1 active:opacity-70"
                >
                    <Ionicons
                        name="settings-outline"
                        size={22}
                        color={COLORS.white}
                    />
                </TouchableOpacity>
            </View>

            {/* Оптимізована сітка 3x3 через FlatList з віртуалізацією */}
            <FlatList
                data={posts}
                keyExtractor={(item) => item._id}
                numColumns={3}
                ListHeaderComponent={renderHeader}
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
                            <ActivityIndicator
                                size="small"
                                color={COLORS.primary}
                            />
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <View className="py-16 items-center px-6">
                            <Ionicons
                                name="camera-outline"
                                size={48}
                                color={COLORS.grey}
                            />
                            <Text className="text-white text-base font-bold mt-2">
                                Ще немає публікацій
                            </Text>
                            <Text className="text-grey text-sm text-center mt-1">
                                Коли ви опублікуєте свої перші фотографії, вони
                                з'являться тут.
                            </Text>
                        </View>
                    ) : null
                }
            />

            {/* Модальне вікно редагування */}
            <EditProfileModal
                visible={isEditModalVisible}
                onClose={() => setIsEditModalVisible(false)}
                user={{
                    fullname: user.fullname ?? user.name,
                    username: user.username,
                    bio: user.bio,
                    image: user.image,
                }}
            />
        </View>
    );
}
