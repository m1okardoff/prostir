import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ChatInputProps {
  onSendMessage: (text: string, selectedImageUri?: string) => Promise<void>;
  onSendAudio?: (audioUri: string, durationSeconds: number) => Promise<void>;
  isSending: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onSendAudio,
  isSending,
}) => {
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Рекордер з бібліотеки expo-audio
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Очищення таймера при демонтажі
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 1. Початок запису аудіо
  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Потрібен доступ",
          "Надайте додатку дозвіл на використання мікрофона.",
        );
        return;
      }

      // Налаштування аудіорежиму для запису
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setIsRecording(true);
      setRecordingDuration(0);

      // Запуск таймера тривалості запису
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Помилка старту запису:", error);
      Alert.alert("Помилка", "Не вдалося розпочати запис аудіо.");
    }
  };

  // 2. Скасування запису (видалення без надсилання)
  const cancelRecording = async () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      await audioRecorder.stop();
    } catch (error) {
      console.error("Помилка скасування запису:", error);
    } finally {
      setIsRecording(false);
      setRecordingDuration(0);
    }
  };

  // 3. Зупинка запису та його відправка
  const stopAndSendRecording = async () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);

      const duration = recordingDuration;
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      setIsRecording(false);
      setRecordingDuration(0);

      if (uri && onSendAudio) {
        await onSendAudio(uri, duration);
      }
    } catch (error) {
      console.error("Помилка завершення запису:", error);
      Alert.alert("Помилка", "Не вдалося зберегти аудіозапис.");
    }
  };

  // Вибір зображення з галереї
  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Потрібен доступ",
          "Надайте доступ до галереї, щоб надсилати фото.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  };

  // Відправка звичайного тексту/фото
  const handleSend = async () => {
    if ((!text.trim() && !selectedImage) || isSending) return;

    const currentText = text;
    const currentImage = selectedImage ?? undefined;

    setText("");
    setSelectedImage(null);

    await onSendMessage(currentText, currentImage);
  };

  // Форматування таймера запису (наприклад, "0:05")
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <View className="bg-black border-t border-surface px-3 py-2">
      {/* Прев'ю прикріпленого фото */}
      {selectedImage && (
        <View className="mb-2 relative w-16 h-16 rounded-xl overflow-hidden border border-primary">
          <Image
            source={{ uri: selectedImage }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
          <TouchableOpacity
            onPress={() => setSelectedImage(null)}
            className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5"
          >
            <Ionicons name="close" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* РЕЖИМ 1: ЙДЕ ЗАПИС АУДІО */}
      {isRecording ? (
        <View className="flex-row items-center bg-surface border border-red-500/50 rounded-full px-4 py-2 justify-between">
          {/* Кнопка скасувати (смітник) */}
          <TouchableOpacity
            onPress={cancelRecording}
            className="p-1 active:opacity-70"
          >
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </TouchableOpacity>

          {/* Червоний пульсуючий індикатор та таймер */}
          <View className="flex-row items-center gap-2">
            <View className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <Text className="text-white font-mono font-bold text-base">
              {formatTimer(recordingDuration)}
            </Text>
          </View>

          {/* Кнопка надіслати запис */}
          <TouchableOpacity
            onPress={stopAndSendRecording}
            className="bg-primary p-2 rounded-full active:opacity-80"
          >
            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : (
        /* РЕЖИМ 2: СТАНДАРТНЕ ПОЛЕ ВВОДУ */
        <View className="flex-row items-center bg-surface border border-surfaceLight rounded-full px-3 py-1">
          {/* Кнопка вибору зображення */}
          <TouchableOpacity
            onPress={pickImage}
            disabled={isSending}
            className="p-1 mr-1"
          >
            <Ionicons name="image-outline" size={22} color={COLORS.grey} />
          </TouchableOpacity>

          {/* Текстовий інпут */}
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Повідомлення..."
            placeholderTextColor={COLORS.grey}
            multiline
            maxLength={1000}
            className="flex-1 text-white text-base max-h-24 py-1"
          />

          {/* Якщо є текст або фото — показуємо кнопку відправки, якщо поле порожнє — мікрофон */}
          {text.trim() || selectedImage ? (
            <TouchableOpacity
              onPress={handleSend}
              disabled={isSending}
              className="bg-primary p-1.5 rounded-full ml-1"
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={startRecording}
              disabled={isSending}
              className="p-1.5 ml-1 active:opacity-70"
            >
              <Ionicons name="mic" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};
