import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";
import { roomsApi } from "../api/rooms";
import { useGeolocation } from "../hooks/useGeolocation";
import Header from "../components/layout/Header";

interface InputFieldProps {
  label: string;
  children: React.ReactNode;
  hint?: string;
}

const InputField = ({ label, children, hint }: InputFieldProps) => (
  <View className="mb-4">
    <Text className="text-sm font-semibold text-gray-700 mb-1.5">{label}</Text>
    {children}
    {hint && <Text className="text-[11px] text-gray-400 mt-1">{hint}</Text>}
  </View>
);

export default function CreateRoomScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isEdit = route.name === "RoomEdit";
  const roomId = route.params?.id;

  const queryClient = useQueryClient();
  const { latitude, longitude } = useGeolocation();

  const [form, setForm] = useState({
    title: "",
    restaurantName: "",
    restaurantUrl: "",
    deliveryFee: "",
    minimumOrder: "",
    pickupLocation: "",
  });
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState("");

  const { data: roomData, isFetching } = useQuery({
    queryKey: ["room", roomId],
    queryFn: () => roomsApi.get(roomId!),
    enabled: isEdit && !!roomId,
  });

  useEffect(() => {
    if (isEdit && roomData) {
      setForm({
        title: roomData.title,
        restaurantName: roomData.restaurantName,
        restaurantUrl: roomData.restaurantUrl || "",
        deliveryFee: roomData.deliveryFee.toString(),
        minimumOrder: roomData.minimumOrder.toString(),
        pickupLocation: roomData.pickupLocation || "",
      });
      setDeadline(new Date(roomData.deadline));
    }
  }, [isEdit, roomData]);

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit ? roomsApi.update(roomId!, data) : roomsApi.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: ["room", roomId] });
      navigation.replace("RoomDetail", { id: isEdit ? roomId : data.id });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || "방 생성에 실패했습니다.";
      setError(msg);
    },
  });

  const handleSubmit = () => {
    setError("");

    if (!form.title.trim()) return setError("방 제목을 입력해주세요.");
    if (!form.restaurantName.trim())
      return setError("식당 이름을 입력해주세요.");
    if (form.deliveryFee === "") return setError("배달비를 입력해주세요.");
    if (form.minimumOrder === "")
      return setError("최소주문금액을 입력해주세요.");
    if (!form.pickupLocation.trim())
      return setError("수령 장소를 입력해주세요. (예: 기숙사 정문)");

    if (deadline.getTime() < Date.now()) {
      return setError("마감 시간은 현재 시간 이후로 설정해주세요.");
    }

    if (!isEdit && (!latitude || !longitude))
      return setError(
        "위치 정보를 가져오는 중입니다. 잠시 후 다시 시도해주세요.",
      );

    mutation.mutate({
      title: form.title.trim(),
      restaurantName: form.restaurantName.trim(),
      restaurantUrl: form.restaurantUrl.trim() || undefined,
      deliveryFee: parseInt(form.deliveryFee),
      minimumOrder: parseInt(form.minimumOrder),
      pickupLocation: form.pickupLocation.trim(),
      dongName: undefined,
      latitude: latitude || (isEdit ? (roomData?.latitude ?? 0) : 0),
      longitude: longitude || (isEdit ? (roomData?.longitude ?? 0) : 0),
      deadline: deadline.toISOString(),
    });
  };

  const update = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  if (isEdit && (isFetching || !roomData)) {
    return (
      <View className="flex-1 bg-gray-50">
        <Header title="정보 불러오는 중.." showBack showHome />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Header title={isEdit ? "방 정보 수정" : "방 만들기"} showBack showHome />

      <ScrollView
        className="px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <Text className="font-bold text-gray-700 text-xs uppercase tracking-wide mb-4">
            식당 정보
          </Text>

          <InputField label="식당 이름">
            <TextInput
              value={form.restaurantName}
              onChangeText={(text) => update("restaurantName", text)}
              placeholder="예: 홍콩반점"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-primary-500"
            />
          </InputField>

          <InputField label="방 제목">
            <TextInput
              value={form.title}
              onChangeText={(text) => update("title", text)}
              placeholder="예: 점심 같이 시켜요"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-primary-500"
            />
          </InputField>

          <InputField
            label="주문 링크"
            hint="배달앱 메뉴 링크를 붙여넣으면 멤버들이 바로 담을 수 있어요"
          >
            <TextInput
              value={form.restaurantUrl}
              onChangeText={(text) => update("restaurantUrl", text)}
              placeholder="https://..."
              keyboardType="url"
              autoCapitalize="none"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-primary-500"
            />
          </InputField>
        </View>

        <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <Text className="font-bold text-gray-700 text-xs uppercase tracking-wide mb-4">
            주문 조건
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <InputField label="배달비">
                <View className="relative justify-center">
                  <TextInput
                    value={form.deliveryFee}
                    onChangeText={(text) =>
                      update("deliveryFee", text.replace(/[^0-9]/g, ""))
                    }
                    placeholder="0"
                    keyboardType="numeric"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm pr-8 focus:border-primary-500"
                  />
                  <Text className="absolute right-3 text-xs text-gray-400">
                    원
                  </Text>
                </View>
              </InputField>
            </View>
            <View className="flex-1">
              <InputField label="최소주문금액">
                <View className="relative justify-center">
                  <TextInput
                    value={form.minimumOrder}
                    onChangeText={(text) =>
                      update("minimumOrder", text.replace(/[^0-9]/g, ""))
                    }
                    placeholder="0"
                    keyboardType="numeric"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm pr-8 focus:border-primary-500"
                  />
                  <Text className="absolute right-3 text-xs text-gray-400">
                    원
                  </Text>
                </View>
              </InputField>
            </View>
          </View>
        </View>

        <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <Text className="font-bold text-gray-700 text-xs uppercase tracking-wide mb-4">
            모집 설정
          </Text>

          <InputField
            label="수령 장소"
            hint="음식을 어디서 받을지 정확히 적어주세요"
          >
            <TextInput
              value={form.pickupLocation}
              onChangeText={(text) => update("pickupLocation", text)}
              placeholder="예: 기숙사 1층 로비, 정문 앞 정자"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-primary-500"
            />
          </InputField>

          <InputField label="마감 시간">
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3"
            >
              <Text className="text-sm text-gray-900">
                {deadline.toLocaleString("ko-KR", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={deadline}
                mode="datetime"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={new Date()}
                onChange={(_, selectedDate) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (selectedDate) setDeadline(selectedDate);
                }}
              />
            )}
            {Platform.OS === "ios" && showDatePicker && (
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                className="mt-2 items-end"
              >
                <Text className="text-primary-500 font-bold">확인</Text>
              </TouchableOpacity>
            )}
          </InputField>
        </View>

        {error ? (
          <View className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
            <Text className="text-sm text-red-600">{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={mutation.isPending}
          className={`w-full bg-primary-500 rounded-2xl py-4 items-center justify-center ${
            mutation.isPending ? "opacity-60" : ""
          }`}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">
              {isEdit ? "수정 완료" : "방 만들기"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
