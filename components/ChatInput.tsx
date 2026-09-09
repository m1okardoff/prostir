import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { COLORS } from "@/constants/theme";

interface ChatInputProps {
  onSendMessage: (
    text: string,
    selectedImageUri?: string,
  ) => Promise<void>;
  isSending: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isSending,
}) => {
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
        allowsEditing: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];

        if (asset.uri) {
          setSelectedImage(asset.uri);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Помилка", "Не вдалося вибрати зображення");
    }
  };

  const handleSend = async () => {
    if ((!text.trim() && !selectedImage) || isSending) {
      return;
    }

    const currentText = text.trim();
    const currentImage = selectedImage ?? undefined;

    setText("");
    setSelectedImage(null);

    await onSendMessage(currentText, currentImage);
  };

  return (
    <View className="bg-black border-t border-surface px-3 py-2">
      {selectedImage && (
        <View className="mb-2 relative w-16 h-16 rounded-xl overflow-hidden border border-primary">
          <Image
            source={{ uri: selectedImage }}
            style={{
              width: "100%",
              height: "100%",
            }}
            contentFit="cover"
          />

          <TouchableOpacity
            onPress={() => setSelectedImage(null)}
            className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5"
          >
            <Ionicons
              name="close"
              size={14}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      )}

      <View className="flex-row items-center bg-surface border border-surfaceLight rounded-full px-3 py-1">
        <TouchableOpacity
          onPress={pickImage}
          disabled={isSending}
          className="p-1 mr-1"
        >
          <Ionicons
            name="image-outline"
            size={22}
            color={COLORS.grey}
          />
        </TouchableOpacity>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Повідомлення..."
          placeholderTextColor={COLORS.grey}
          multiline
          maxLength={1000}
          className="flex-1 text-white text-base max-h-24 py-1"
        />

        <TouchableOpacity
          onPress={handleSend}
          disabled={
            (!text.trim() && !selectedImage) || isSending
          }
          className={`p-1.5 rounded-full ml-1 ${
            (text.trim() || selectedImage) && !isSending
              ? "bg-primary"
              : "opacity-40"
          }`}
        >
          {isSending ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Ionicons
              name="arrow-up"
              size={18}
              color="#FFFFFF"
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
