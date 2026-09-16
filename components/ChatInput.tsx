import { ReplyPreviewBar } from "@/components/ReplyPreviewBar";
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

export interface ReplyingToData {
  messageId: string;
  senderName: string;
  text: string;
}

interface ChatInputProps {
  onSendMessage: (text: string, selectedImageUri?: string) => Promise<void>;
  onSendAudio?: (audioUri: string, durationSeconds: number) => Promise<void>;
  isSending: boolean;
  replyingTo?: ReplyingToData | null;
  onCancelReply?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onSendAudio,
  isSending,
  replyingTo,
  onCancelReply,
}) => {
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Помилка старту запису:", error);
      Alert.alert("Помилка", "Не вдалося розпочати запис аудіо.");
    }
  };

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

  const stopAndSendRecording = async () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      const duration = recordingDuration;
      await audioRecorder.stop();
      setIsRecording(false);
      setRecordingDuration(0);

      const uri = audioRecorder.uri;
      if (uri && onSendAudio) {
        await onSendAudio(uri, duration);
      }
    } catch (error) {
      console.error("Помилка зупинки запису:", error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Помилка вибору фото:", error);
    }
  };

  const handleSend = async () => {
    if ((!text.trim() && !selectedImage) || isSending) return;
    const currentText = text;
    const currentImage = selectedImage;
    setText("");
    setSelectedImage(null);
    await onSendMessage(currentText, currentImage || undefined);
  };

  return (
    <View className="bg-surface border-t border-surfaceLight">
      {/* &#x1f448; Відображаємо панель відповіді над інпутом */}
      {replyingTo && onCancelReply && (
        <ReplyPreviewBar
          senderName={replyingTo.senderName}
          text={replyingTo.text}
          onCancel={onCancelReply}
        />
      )}

      {/* Прев'ю вибраної фотографії */}
      {selectedImage && (
        <View className="p-3 flex-row items-center border-b border-surfaceLight">
          <View className="relative">
            <Image
              source={{ uri: selectedImage }}
              style={{ width: 60, height: 60, borderRadius: 8 }}
              contentFit="cover"
            />
            <TouchableOpacity
              onPress={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-primary rounded-full p-1"
            >
              <Ionicons name="close" size={12} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text className="text-grey text-xs ml-3 flex-1">Фото додано</Text>
        </View>
      )}

      {/* Панель вводу */}
      <View className="flex-row items-center px-4 py-3">
        {isRecording ? (
          <View className="flex-1 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-3 h-3 rounded-full bg-red-500 mr-2 animate-pulse" />
              <Text className="text-white font-semibold">
                {Math.floor(recordingDuration / 60)}:
                {recordingDuration % 60 < 10 ? "0" : ""}
                {recordingDuration % 60}
              </Text>
            </View>

            <TouchableOpacity onPress={cancelRecording} className="p-2">
              <Text className="text-grey font-medium">Скасувати</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={stopAndSendRecording}
              className="bg-primary p-2.5 rounded-full"
            >
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity onPress={pickImage} className="mr-3 p-1">
              <Ionicons name="image-outline" size={24} color={COLORS.grey} />
            </TouchableOpacity>

            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Напишіть повідомлення..."
              placeholderTextColor={COLORS.grey}
              multiline
              maxLength={1000}
              className="flex-1 text-white text-base max-h-24 py-1"
            />

            {text.trim() || selectedImage ? (
              <TouchableOpacity
                onPress={handleSend}
                disabled={isSending}
                className="bg-primary p-2.5 rounded-full ml-3"
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={startRecording}
                className="p-1 ml-3"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="mic-outline" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
};
