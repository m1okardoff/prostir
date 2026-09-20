import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface VideoNotePlayerProps {
  videoUrl: string;
  duration?: number;
  size?: number;
}

export const VideoNotePlayer: React.FC<VideoNotePlayerProps> = ({
  videoUrl,
  duration = 0,
  size = 220,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);

  // Створюємо та налаштовуємо плеєр
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
    p.muted = false;
    p.timeUpdateEventInterval = 0.1;
  });

  useEffect(() => {
    // Слухаємо зміну часу відтворення для оновлення кругового прогресу
    const timeSub = player.addListener("timeUpdate", (event) => {
      const effectiveDuration =
        player.duration > 0 ? player.duration : duration;
      if (effectiveDuration > 0) {
        setProgress(event.currentTime / effectiveDuration);
      }
    });

    const playingSub = player.addListener("playingChange", (event) => {
      setIsPlaying(event.isPlaying);
    });

    return () => {
      timeSub.remove();
      playingSub.remove();
    };
  }, [player, duration]);

  const handleTogglePlay = () => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleToggleMute = () => {
    player.muted = !player.muted;
    setIsMuted(player.muted);
  };

  const handleToggleSpeed = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const speeds: (1 | 1.5 | 2)[] = [1, 1.5, 2];
    const nextIndex = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    setPlaybackSpeed(nextSpeed);
    try {
      if (typeof (player as any).setPlaybackRate === "function") {
        (player as any).setPlaybackRate(nextSpeed);
      } else {
        player.playbackRate = nextSpeed;
      }
    } catch (e) {
      console.warn("Помилка зміни швидкості відео:", e);
    }
  };

  // Розрахунок геометрії кола
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - Math.min(Math.max(progress, 0), 1) * circumference;

  const innerSize = size - 10;
  const isAndroid = Platform.OS === "android";

  return (
    <View
      style={{ width: size, height: size }}
      className="relative items-center justify-center my-1"
    >
      {/* Круговий SVG-контур прогресу навколо відео */}
      <Svg
        width={size}
        height={size}
        style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
      >
        {/* Фоновий контур */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Активна лінія прогресу */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={COLORS.primary}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>

      {/* Кругле вікно самого відео */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleTogglePlay}
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          overflow: "hidden",
        }}
        className="bg-black relative items-center justify-center border border-surfaceLight"
      >
        <VideoView
          player={player}
          style={{
            width: innerSize,
            height: innerSize,
          }}
          contentFit="cover"
          surfaceType={isAndroid ? "textureView" : undefined}
          nativeControls={false}
        />

        {/* Іконка паузи по центру */}
        {!isPlaying && (
          <View className="absolute w-12 h-12 rounded-full bg-black/60 items-center justify-center">
            <Ionicons
              name="play"
              size={24}
              color="#FFFFFF"
              style={{ marginLeft: 2 }}
            />
          </View>
        )}

        {/* Бейдж перемикання звуку */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            handleToggleMute();
          }}
          className="absolute bottom-2.5 bg-black/70 px-2.5 py-1 rounded-full flex-row items-center gap-1 border border-white/15"
        >
          <Ionicons
            name={isMuted ? "volume-mute" : "volume-high"}
            size={13}
            color="#FFFFFF"
          />
          {duration > 0 && (
            <Text className="text-white text-[10px] font-semibold">
              {Math.round(duration)}с
            </Text>
          )}
        </TouchableOpacity>
        {/* Бейдж перемикання швидкості */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            handleToggleSpeed();
          }}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ zIndex: 10 }}
          className={`absolute top-2.5 px-2.5 py-0.5 rounded-full border ${
            playbackSpeed > 1
              ? "bg-primary border-primary"
              : "bg-black/70 border-white/20"
          }`}
        >
          <Text className="text-white text-[10px] font-bold">
            {playbackSpeed}x
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};
