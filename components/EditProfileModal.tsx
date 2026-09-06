import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface EditProfileModalProps {
    visible: boolean;
    onClose: () => void;
    user: {
        fullname?: string;
        username?: string;
        bio?: string;
        image?: string;
    };
}

export function EditProfileModal({
    visible,
    onClose,
    user,
}: EditProfileModalProps) {
    const [fullname, setFullname] = useState(user.fullname ?? "");
    const [username, setUsername] = useState(user.username ?? "");
    const [bio, setBio] = useState(user.bio ?? "");
    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(
        null,
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
    const updateUserProfile = useMutation(api.users.updateUserProfile);

    // Вибір фото з галереї
    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0].uri) {
            setSelectedImageUri(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        try {
            setIsSubmitting(true);

            let imageStorageId = undefined;

            // Якщо користувач обрав новий аватар — завантажуємо його
            if (selectedImageUri) {
                const uploadUrl = await generateUploadUrl();
                const response = await fetch(selectedImageUri);
                const blob = await response.blob();

                const uploadResult = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": blob.type || "image/jpeg" },
                    body: blob,
                });

                const json = await uploadResult.json();
                imageStorageId = json.storageId;
            }

            await updateUserProfile({
                fullname,
                username,
                bio,
                imageStorageId,
            });

            onClose();
        } catch (error) {
            console.error("Помилка збереження профілю:", error);
            Alert.alert("Помилка", "Не вдалося зберегти зміни профілю.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                className="flex-1 justify-end bg-black/60"
            >
                <View className="bg-surface border-t border-surfaceLight rounded-t-3xl p-5 max-h-[88%]">
                    {/* Хедер модального вікна */}
                    <View className="flex-row items-center justify-between pb-4 border-b border-surfaceLight">
                        <TouchableOpacity
                            onPress={onClose}
                            disabled={isSubmitting}
                        >
                            <Text className="text-grey text-base">
                                Скасувати
                            </Text>
                        </TouchableOpacity>

                        <Text className="text-white font-bold text-lg">
                            Редагувати профіль
                        </Text>

                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator
                                    size="small"
                                    color={COLORS.primary}
                                />
                            ) : (
                                <Text className="text-primary font-bold text-base">
                                    Зберегти
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        className="pt-4"
                    >
                        {/* Аватар та кнопка зміни */}
                        <View className="items-center mb-6">
                            <TouchableOpacity
                                onPress={pickImage}
                                disabled={isSubmitting}
                                className="relative active:opacity-80"
                            >
                                {selectedImageUri || user.image ? (
                                    <Image
                                        source={{
                                            uri: selectedImageUri || user.image,
                                        }}
                                        className="w-24 h-24 rounded-full border-2 border-primary"
                                    />
                                ) : (
                                    <View className="w-24 h-24 rounded-full bg-surfaceLight items-center justify-center border-2 border-surfaceLight">
                                        <Ionicons
                                            name="person"
                                            size={44}
                                            color={COLORS.grey}
                                        />
                                    </View>
                                )}

                                <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary items-center justify-center border-2 border-surface">
                                    <Ionicons
                                        name="camera"
                                        size={16}
                                        color="#FFFFFF"
                                    />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={pickImage}
                                className="mt-2"
                            >
                                <Text className="text-primary text-sm font-semibold">
                                    Змінити фото профілю
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Поля вводу */}
                        <View className="gap-4 pb-10">
                            <View>
                                <Text className="text-grey text-xs font-semibold mb-1.5 uppercase">
                                    Повне ім'я
                                </Text>
                                <TextInput
                                    value={fullname}
                                    onChangeText={setFullname}
                                    placeholder="Введіть повне ім'я..."
                                    placeholderTextColor={COLORS.grey}
                                    className="bg-black text-white px-4 py-3 rounded-xl border border-surfaceLight text-base"
                                />
                            </View>

                            <View>
                                <Text className="text-grey text-xs font-semibold mb-1.5 uppercase">
                                    Ім'я користувача
                                </Text>
                                <TextInput
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                    placeholder="username"
                                    placeholderTextColor={COLORS.grey}
                                    className="bg-black text-white px-4 py-3 rounded-xl border border-surfaceLight text-base"
                                />
                            </View>

                            <View>
                                <Text className="text-grey text-xs font-semibold mb-1.5 uppercase">
                                    Про себе (Bio)
                                </Text>
                                <TextInput
                                    value={bio}
                                    onChangeText={setBio}
                                    multiline
                                    numberOfLines={4}
                                    placeholder="Розкажіть про себе..."
                                    placeholderTextColor={COLORS.grey}
                                    textAlignVertical="top"
                                    className="bg-black text-white px-4 py-3 rounded-xl border border-surfaceLight text-base h-28"
                                />
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
