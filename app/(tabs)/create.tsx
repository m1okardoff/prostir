import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { fetch } from "expo/fetch";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function CreateScreen() {
  const router = useRouter();

  // Отримуємо поточного користувача з Convex Auth
  const currentUser = useQuery(api.users.currentUser);

  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const createPost = useMutation(api.posts.createPost);

  const [caption, setCaption] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Функція вибору зображення з галереї
  const pickImageFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // Функція створення фото з камери
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Дозвіл відхилено",
        "Для створення знімку потрібен доступ до камери.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      // aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // Головна функція для вибору способу додавання зображення
  const pickImage = () => {
    Alert.alert("Оберіть дію", "Оберіть джерело для додавання зображення", [
      {
        text: "Зробити фото",
        onPress: takePhoto,
      },
      {
        text: "Обрати з галереї",
        onPress: pickImageFromLibrary,
      },
      {
        text: "Скасувати",
        style: "cancel",
      },
    ]);
  };

  // Завантаження зображення у Convex Storage та публікація поста
  const handleShare = async () => {
    if (!selectedImage) return;

    try {
      setIsSharing(true);

      // 1. Отримуємо одноразове посилання для завантаження файлу
      const uploadUrl = await generateUploadUrl();

      // 2. Створюємо інстанс файлу з URI зображення через expo-file-system
      const file = new File(selectedImage);

      // 3. Завантажуємо зображення через expo/fetch API
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        body: file,
        headers: {
          "Content-Type": "image/jpeg",
        },
      });

      if (!uploadResult.ok) throw new Error("Upload failed");

      // 4. Отримуємо унікальний storageId файлу
      const { storageId } = await uploadResult.json();

      // 5. Створюємо пост із посиланням на цей файл у БД
      await createPost({ storageId, caption });

      // 6. Очищаємо форму та перенаправляємо на головний екран
      setSelectedImage(null);
      setCaption("");
      router.push("/(tabs)");
    } catch (error) {
      console.error("Error sharing post:", error);
      Alert.alert(
        "Помилка",
        "Не вдалося завантажити зображення або створити пост.",
      );
    } finally {
      setIsSharing(false);
    }
  };

  // Якщо картинка ще не обрана, показуємо екран вибору
  if (!selectedImage) {
    return (
      <View className="flex-1 bg-black">
        {/* Хедер */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-1 -ml-1 rounded-full active:opacity-70"
          >
            <Ionicons name="arrow-back" size={26} color={COLORS.primary} />
          </TouchableOpacity>
          <Text className="text-white text-lg font-semibold tracking-tight">
            Новий пост
          </Text>
          <View className="w-8" />
        </View>

        {/* Контейнер вибору зображення */}
        <View className="flex-1 justify-center px-6 pb-20">
          <TouchableOpacity
            className="border-2 border-dashed border-surfaceLight bg-surface/30 rounded-3xl p-8 items-center justify-center active:opacity-80"
            onPress={pickImage}
            activeOpacity={0.8}
          >
            <View className="w-20 h-20 rounded-full bg-surface border border-surfaceLight items-center justify-center mb-4">
              <Ionicons name="image-outline" size={38} color={COLORS.primary} />
            </View>

            <Text className="text-white text-lg font-bold mb-1 text-center">
              Додайте фотографію
            </Text>
            <Text className="text-grey text-sm text-center mb-6 px-4">
              Зробіть знімок на камеру або виберіть фото із галереї
            </Text>

            <View className="flex-row items-center bg-primary px-5 py-3 rounded-2xl gap-2 shadow-lg shadow-primary/30">
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text className="text-white font-bold text-sm">Обрати фото</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Екран заповнення опису та відправки поста
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-black"
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <View className="flex-1">
        {/* Хедер */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface bg-black">
          <TouchableOpacity
            onPress={() => {
              setSelectedImage(null);
              setCaption("");
            }}
            disabled={isSharing}
            className="p-1 -ml-1 rounded-full active:opacity-70"
          >
            <Ionicons
              name="close-outline"
              size={28}
              color={isSharing ? COLORS.grey : "#FFFFFF"}
            />
          </TouchableOpacity>

          <Text className="text-white text-lg font-semibold tracking-tight">
            Новий пост
          </Text>

          <View className="w-8" />
        </View>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className={`flex-1 ${isSharing ? "opacity-70" : ""}`}>
            {/* Секція зображення */}
            <View className="mx-4 mt-4 rounded-3xl overflow-hidden bg-surface border border-surfaceLight relative aspect-square max-h-[380px] shadow-lg shadow-black/50">
              <Image
                source={{ uri: selectedImage }}
                className="w-full h-full"
                resizeMode="cover"
              />
              <TouchableOpacity
                className="absolute bottom-3 right-3 bg-black/75 px-3.5 py-2 rounded-full flex-row items-center gap-1.5 border border-white/20 active:opacity-80"
                onPress={pickImage}
                disabled={isSharing}
                activeOpacity={0.8}
              >
                <Ionicons name="images-outline" size={16} color="#FFFFFF" />
                <Text className="text-white text-xs font-semibold">
                  Змінити
                </Text>
              </TouchableOpacity>
            </View>

            {/* Секція опису */}
            <View className="px-4 pt-4">
              <View className="bg-surface/60 border border-surfaceLight rounded-2xl p-3.5">
                <View className="flex-row items-start">
                  {currentUser?.image ? (
                    <Image
                      source={{ uri: currentUser.image }}
                      className="w-10 h-10 rounded-full mr-3 border border-surfaceLight"
                    />
                  ) : (
                    <View className="w-10 h-10 rounded-full mr-3 bg-surface border border-surfaceLight items-center justify-center">
                      <Ionicons
                        name="person"
                        size={20}
                        color={COLORS.primary}
                      />
                    </View>
                  )}
                  <TextInput
                    className="flex-1 text-white text-base pt-1 min-h-[80px]"
                    placeholder="Напишіть опис до публікації..."
                    placeholderTextColor={COLORS.grey}
                    multiline
                    textAlignVertical="top"
                    value={caption}
                    onChangeText={setCaption}
                    editable={!isSharing}
                  />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Закріплена панель із кнопкою «Опублікувати» внизу */}
        <View className="px-4 pt-3 pb-[74px] border-t border-surface bg-black">
          <TouchableOpacity
            className={`w-full py-3.5 rounded-2xl flex-row items-center justify-center gap-2 bg-primary active:opacity-85 shadow-lg ${
              isSharing || !selectedImage ? "opacity-50" : ""
            }`}
            disabled={isSharing || !selectedImage}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            {isSharing ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text className="text-white text-base font-bold ml-2">
                  Публікація...
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="paper-plane-outline"
                  size={20}
                  color="#FFFFFF"
                />
                <Text className="text-white text-base font-bold tracking-wide">
                  Опублікувати
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
