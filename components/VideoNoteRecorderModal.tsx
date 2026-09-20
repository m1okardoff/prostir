import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "@/constants/theme";

interface VideoNoteRecorderModalProps {
  visible: boolean;
  onClose: () => void;
  onFinishRecording: (uri: string, durationSeconds: number) => Promise<void>;
}

const MAX_RECORDING_DURATION = 60; // Максимальна тривалість кружечка — 60 секунд

export const VideoNoteRecorderModal: React.FC<VideoNoteRecorderModalProps> = ({
  visible,
  onClose,
  onFinishRecording,
}) => {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [facing, setFacing] = useState<"front" | "back">("front");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);

  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleStartRecording = async () => {
    if (!cameraPermission?.granted) {
      const cam = await requestCameraPermission();
      if (!cam.granted) {
        Alert.alert(
          "Потрібен дозвіл",
          "Надайте додатку доступ до камери для запису відеокружечка."
        );
        return;
      }
    }

    if (!micPermission?.granted) {
      const mic = await requestMicPermission();
      if (!mic.granted) {
        Alert.alert(
          "Потрібен дозвіл",
          "Надайте додатку доступ до мікрофона для запису звуку."
        );
        return;
      }
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsRecording(true);
      setRecordedSeconds(0);

      // Запускаємо щосекундний відлік
      timerRef.current = setInterval(() => {
        setRecordedSeconds((prev) => {
          if (prev >= MAX_RECORDING_DURATION - 1) {
            handleStopRecording();
            return MAX_RECORDING_DURATION;
          }
          return prev + 1;
        });
      }, 1000);

      if (cameraRef.current) {
        const video = await cameraRef.current.recordAsync({
          maxDuration: MAX_RECORDING_DURATION,
        });

        if (video?.uri) {
          setIsProcessing(true);
          const duration = recordedSeconds > 0 ? recordedSeconds : 1;
          await onFinishRecording(video.uri, duration);
          setIsProcessing(false);
          onClose();
        }
      }
    } catch (error: any) {
      console.error("Помилка запису відео:", error);
      Alert.alert("Помилка", "Не вдалося записати відеоповідомлення.");
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsRecording(false);
    cameraRef.current?.stopRecording();
  };

  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (isRecording) {
      cameraRef.current?.stopRecording();
    }
    setIsRecording(false);
    setRecordedSeconds(0);
    onClose();
  };

  const toggleCameraFacing = () => {
    setFacing((prev) => (prev === "front" ? "back" : "front"));
  };

  // Параметри кругового таймера
  const circleSize = 270;
  const strokeWidth = 5;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = recordedSeconds / MAX_RECORDING_DURATION;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={handleCancel}
    >
      <View className="flex-1 bg-black justify-between items-center py-12 px-6">
        {/* Верхній блок: кнопка закриття та таймер */}
        <View className="w-full flex-row items-center justify-between pt-4">
          <TouchableOpacity
            onPress={handleCancel}
            disabled={isProcessing}
            className="w-10 h-10 rounded-full bg-surface/80 items-center justify-center"
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View className="bg-surface/80 px-4 py-1.5 rounded-full border border-surfaceLight">
            <Text className="text-white font-semibold text-sm">
              {Math.floor(recordedSeconds / 60)}:
              {recordedSeconds % 60 < 10 ? "0" : ""}
              {recordedSeconds % 60} / 1:00
            </Text>
          </View>

          <TouchableOpacity
            onPress={toggleCameraFacing}
            disabled={isRecording || isProcessing}
            className={`w-10 h-10 rounded-full bg-surface/80 items-center justify-center ${
              isRecording ? "opacity-30" : ""
            }`}
          >
            <Ionicons name="camera-reverse" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Центральний блок: круглий видошукач камери */}
        <View
          style={{ width: circleSize, height: circleSize }}
          className="relative items-center justify-center"
        >
          {/* SVG-контур таймера навколо кружечка */}
          <Svg
            width={circleSize}
            height={circleSize}
            style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
          >
            <Circle
              cx={circleSize / 2}
              cy={circleSize / 2}
              r={radius}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {isRecording && (
              <Circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius}
                stroke={COLORS.primary}
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            )}
          </Svg>

          {/* Вікно камери з круглою маскою */}
          <View
            style={{ width: circleSize - 16, height: circleSize - 16, borderRadius: (circleSize - 16) / 2, overflow: "hidden" }}
            className="bg-zinc-900 border border-surfaceLight relative items-center justify-center"
          >
            <CameraView
              ref={cameraRef}
              style={{ width: "100%", height: "100%" }}
              facing={facing}
              mode="video"
            />

            {isProcessing && (
              <View className="absolute inset-0 bg-black/70 items-center justify-center">
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text className="text-white text-xs mt-2 font-medium">
                  Обробка відео...
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Нижня панель керування */}
        <View className="items-center pb-6">
          <Text className="text-grey text-xs mb-4 text-center">
            {isRecording
              ? "Натисніть кнопку, щоб завершити та надіслати"
              : "Натисніть для початку запису (до 60 секунд)"}
          </Text>

          {isRecording ? (
            <TouchableOpacity
              onPress={handleStopRecording}
              disabled={isProcessing}
              activeOpacity={0.8}
              className="w-20 h-20 rounded-full bg-primary items-center justify-center shadow-lg shadow-primary/50"
            >
              <Ionicons name="stop" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleStartRecording}
              disabled={isProcessing}
              activeOpacity={0.8}
              className="w-20 h-20 rounded-full border-4 border-white items-center justify-center p-1.5"
            >
              <View className="w-full h-full rounded-full bg-red-500 items-center justify-center">
                <Ionicons name="videocam" size={28} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};