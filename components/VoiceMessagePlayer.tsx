import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import React, { useEffect } from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration?: number;
  isMine: boolean;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  audioUrl,
  duration = 0,
  isMine,
}) => {
  const player = useAudioPlayer(audioUrl || null);
  const status = useAudioPlayerStatus(player);

  const isPlaying = status?.playing ?? false;
  const currentTime = status?.currentTime ?? 0;
  // Якщо статус ще не завантажив тривалість або вона 0, використовуємо тривалість з пропсів
  const totalDuration =
    status?.duration && status.duration > 0 ? status.duration : duration || 0;

  // Коли відтворення добігло кінця — повертаємо на початок
  useEffect(() => {
    if (status?.didJustFinish) {
      player.seekTo(0);
    }
  }, [status?.didJustFinish, player]);

  // Обробник натискання кнопки відтворення/паузи
  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        player.pause();
      } else {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
        });

        // Якщо аудіо добігло кінця або майже в кінці — починаємо спочатку
        if (totalDuration > 0 && currentTime >= totalDuration - 0.1) {
          await player.seekTo(0);
        }
        player.play();
      }
    } catch (error) {
      console.error("Помилка відтворення аудіо:", error);
    }
  };

  // Розрахунок відсотка завершеності для прогрес-бару (0..1)
  const progress =
    totalDuration > 0
      ? Math.min(1, Math.max(0, currentTime / totalDuration))
      : 0;

  // Форматування секунд у хвилини та секунди (наприклад "0:14")
  const formatTime = (secs: number) => {
    const totalSeconds = Math.max(0, Math.floor(secs));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const displayTime = isPlaying
    ? formatTime(currentTime)
    : formatTime(totalDuration);

  return (
    <View className="flex-row items-center py-1 w-[210px]">
      {/* Кнопка Play / Pause */}
      <TouchableOpacity
        onPress={handlePlayPause}
        className={`w-9 h-9 rounded-full items-center justify-center mr-2.5 ${
          isMine ? "bg-white" : "bg-primary"
        }`}
        activeOpacity={0.8}
      >
        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={18}
          color={isMine ? COLORS.primary : "#FFFFFF"}
          style={{ marginLeft: isPlaying ? 0 : 2 }}
        />
      </TouchableOpacity>

      {/* Смуга прогресу та час */}
      <View className="flex-1 justify-center">
        {/* Прогрес-бар */}
        <View
          className={`h-1.5 rounded-full overflow-hidden mb-1 ${
            isMine ? "bg-white/30" : "bg-surfaceLight"
          }`}
        >
          <View
            style={{ width: `${progress * 100}%` }}
            className={`h-full rounded-full ${
              isMine ? "bg-white" : "bg-primary"
            }`}
          />
        </View>

        {/* Час та іконка мікрофона */}
        <View className="flex-row justify-between items-center">
          <Text
            className={`text-[11px] font-medium ${
              isMine ? "text-white/80" : "text-grey"
            }`}
          >
            {displayTime}
          </Text>
          <Ionicons
            name="mic"
            size={12}
            color={isMine ? "rgba(255,255,255,0.7)" : COLORS.grey}
          />
        </View>
      </View>
    </View>
  );
};
