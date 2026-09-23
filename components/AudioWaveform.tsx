import React, { useMemo } from "react";
import { View, TouchableOpacity, GestureResponderEvent } from "react-native";
import { COLORS } from "@/constants/theme";

interface AudioWaveformProps {
  waveform?: number[];
  progress: number; // 0..1
  onSeek?: (progress: number) => void;
  isMine: boolean;
  barCount?: number;
  maxHeight?: number;
}

const DEFAULT_BAR_COUNT = 32;

/**
 * Генерує детерміновану природну звукову хвилю, якщо бекенд не надав масив
 */
export function generateFallbackWaveform(
  seed: number = 42,
  count: number = DEFAULT_BAR_COUNT,
): number[] {
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    // Плавна синусоїда + псевдовипадкова варіація
    const sinValue = Math.sin((i / count) * Math.PI * 3 + seed);
    const cosValue = Math.cos((i / count) * Math.PI * 5 + seed * 2);
    const raw = Math.abs(sinValue * 0.6 + cosValue * 0.4);
    // Нормалізуємо діапазон [0.15 .. 1.0]
    const clamped = Math.max(0.15, Math.min(1.0, raw));
    result.push(clamped);
  }
  return result;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  waveform,
  progress,
  onSeek,
  isMine,
  barCount = DEFAULT_BAR_COUNT,
  maxHeight = 24,
}) => {
  // Використовуємо надану хвилю або генеруємо стабільну резервну
  const bars = useMemo(() => {
    if (waveform && waveform.length > 0) {
      // Якщо довжина відрізняється — інтерполюємо або підганяємо розмір
      if (waveform.length === barCount) return waveform;
      return waveform.slice(0, barCount);
    }
    return generateFallbackWaveform(barCount);
  }, [waveform, barCount]);

  // Обробка натискання на хвилю для перемотування
  const handleTouch = (event: GestureResponderEvent) => {
    if (!onSeek) return;
    const { locationX } = event.nativeEvent;
    // Отримуємо ширину контейнера або обчислюємо відносну позицію
    // Для спрощення: ширина смуги розраховується з кількості стовпчиків
    const totalEstimatedWidth = barCount * 4.5;
    const clickRatio = Math.max(
      0,
      Math.min(1, locationX / totalEstimatedWidth),
    );
    onSeek(clickRatio);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handleTouch}
      className="flex-row items-center h-7 py-0.5"
    >
      {bars.map((amplitude, index) => {
        const barRatio = index / (bars.length - 1);
        const isActive = barRatio <= progress;

        // Висота стовпчика: мінімум 4px, максимум maxHeight
        const height = Math.max(4, Math.round(amplitude * maxHeight));

        return (
          <View
            key={index}
            style={{
              height,
              width: 2.5,
              marginRight: 2,
              borderRadius: 2,
            }}
            className={
              isActive
                ? isMine
                  ? "bg-white"
                  : "bg-primary"
                : isMine
                  ? "bg-white/30"
                  : "bg-surfaceLight"
            }
          />
        );
      })}
    </TouchableOpacity>
  );
};
