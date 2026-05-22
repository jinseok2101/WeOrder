import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  ExternalLink,
  ChevronDown,
  Edit2,
  MapPin,
  Trash2,
} from "lucide-react-native";
import { roomsApi } from "../api/rooms";
import { ordersApi } from "../api/orders";
import { useAuthStore } from "../store/authStore";
import { useRoomStore } from "../store/roomStore";
import { useSocket } from "../hooks/useSocket";
import Header from "../components/layout/Header";
import RoomStatusBadge from "../components/room/RoomStatusBadge";
import OrderProgress from "../components/room/OrderProgress";
import MemberOrderList from "../components/order/MemberOrderList";
import SettlementSummary from "../components/settlement/SettlementSummary";
import { formatCurrency, formatDate } from "../lib/utils";
import { ChatMessage, Room } from "../types";

type Tab = "order" | "chat" | "settlement";

export default function RoomDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { id } = route.params;
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { messages, setMessages, orderTotals, setOrderTotals } = useRoomStore();
  const { sendMessage } = useSocket(id);

  const [tab, setTab] = useState<Tab>("order");
  const [chatInput, setChatInput] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);

  const { data: room, isLoading } = useQuery({
    queryKey: ["room", id],
    queryFn: () => roomsApi.get(id!),
    enabled: !!id,
  });

  const { data: settlement } = useQuery({
    queryKey: ["settlement", id],
    queryFn: () => roomsApi.getSettlement(id!),
    enabled: !!id && !!room?.settlement,
    retry: false,
  });

  useEffect(() => {
    if (!id) return;
    roomsApi.getChat(id).then((msgs: ChatMessage[]) => setMessages(msgs));
  }, [id, setMessages]);

  useEffect(() => {
    if (tab === "chat") {
      setTimeout(
        () => scrollViewRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    }
  }, [messages, tab]);

  useEffect(() => {
    if (room) {
      const items = room.orderItems || [];
      const members = room.members || [];

      const total = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      const allMembersHaveOrders = members.every((m) =>
        items.some((item) => item.userId === m.userId),
      );

      const rate =
        room.minimumOrder > 0
          ? Math.min(100, Math.round((total / room.minimumOrder) * 100))
          : 100;

      setOrderTotals({
        totalMenuAmount: total,
        minimumOrder: room.minimumOrder,
        deliveryFee: room.deliveryFee,
        isMinimumMet: total >= room.minimumOrder,
        allMembersHaveOrders,
        achievementRate: rate,
      });
    }
  }, [room, setOrderTotals]);

  const joinMutation = useMutation({
    mutationFn: () => roomsApi.join(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["room", id] }),
  });

  const leaveMutation = useMutation({
    mutationFn: () => roomsApi.leave(id!),
    onSuccess: () => navigation.navigate("Home"),
  });

  const statusMutation = useMutation({
    mutationFn: (status: Room["status"]) => roomsApi.updateStatus(id!, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["room", id] }),
  });

  const settleMutation = useMutation({
    mutationFn: () => roomsApi.createSettlement(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room", id] });
      queryClient.invalidateQueries({ queryKey: ["settlement", id] });
      setTab("settlement");
    },
  });

  const addOrderMutation = useMutation({
    mutationFn: (data: {
      name: string;
      price: number;
      quantity: number;
      options?: string;
    }) => roomsApi.addOrder(id!, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["room", id] }),
  });

  const editOrderMutation = useMutation({
    mutationFn: ({
      itemId,
      data,
    }: {
      itemId: string;
      data: { name: string; price: number; quantity: number; options?: string };
    }) => ordersApi.update(itemId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["room", id] }),
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (itemId: string) => ordersApi.delete(itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["room", id] }),
  });

  const deleteRoomMutation = useMutation({
    mutationFn: () => roomsApi.delete(id!),
    onSuccess: () => {
      Alert.alert("알림", "방이 삭제되었습니다.");
      navigation.navigate("Home");
    },
  });

  if (isLoading || !room) {
    return (
      <View className="flex-1 bg-gray-50">
        <Header title="로딩 중..." showBack showHome />
        <View className="p-4 gap-3">
          <ActivityIndicator size="large" color="#f97316" className="mt-10" />
        </View>
      </View>
    );
  }

  const isExpired = room.deadline
    ? new Date(room.deadline).getTime() < Date.now()
    : false;
  const isMember = (room.members || []).some((m) => m.userId === user?.id);
  const isHost = room.hostId === user?.id;
  const canJoin = !isMember && room.status === "OPEN" && !isExpired;
  const canOrder =
    isMember &&
    (room.status === "OPEN" || room.status === "ORDERING") &&
    !isExpired;
  const canEdit =
    isMember &&
    (room.status === "OPEN" || room.status === "ORDERING") &&
    !isExpired;
  const totals = orderTotals ?? {
    totalMenuAmount: 0,
    minimumOrder: room.minimumOrder,
    deliveryFee: room.deliveryFee,
    isMinimumMet: false,
    allMembersHaveOrders: false,
    achievementRate: 0,
  };

  const handleSendChat = () => {
    if (!chatInput.trim() || !id) return;
    sendMessage(id, chatInput.trim());
    setChatInput("");
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "order", label: "주문" },
    { key: "chat", label: "채팅" },
    { key: "settlement", label: "정산" },
  ];

  const getOrderStatusMessage = () => {
    if (!totals.isMinimumMet) return "최소주문금액을 채워야 주문이 가능해요";
    if (!totals.allMembersHaveOrders)
      return "모든 사람이 메뉴를 선택해야 주문이 가능합니다";
    return "주문을 시작할 준비가 됐나요?";
  };

  const isOrderStartEnabled =
    totals.isMinimumMet && totals.allMembersHaveOrders;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-gray-50"
    >
      <Header
        title={room.restaurantName}
        showBack
        showHome
        right={
          !isMember && canJoin ? (
            <TouchableOpacity
              onPress={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
              className="bg-primary-500 px-4 py-1.5 rounded-full"
            >
              <Text className="text-white text-sm font-bold">참여하기</Text>
            </TouchableOpacity>
          ) : isMember && !isHost ? (
            <TouchableOpacity
              onPress={() => {
                Alert.alert("알림", "방에서 나가시겠습니까?", [
                  { text: "취소", style: "cancel" },
                  {
                    text: "나가기",
                    style: "destructive",
                    onPress: () => {
                      leaveMutation.mutate();
                      navigation.navigate("Home");
                    },
                  },
                ]);
              }}
              disabled={room.status !== "OPEN"}
              className="px-2 py-1"
            >
              <Text
                className={`text-sm font-medium ${room.status === "OPEN" ? "text-gray-400" : "text-gray-200"}`}
              >
                나가기
              </Text>
            </TouchableOpacity>
          ) : isHost &&
            !["ORDERED", "SETTLED", "CANCELLED"].includes(room.status) ? (
            <View className="flex-row items-center gap-1">
              <TouchableOpacity
                onPress={() => navigation.navigate("RoomEdit", { id })}
                className="p-2"
              >
                <Edit2 size={18} color="#9ca3af" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    "경고",
                    "방을 삭제하시겠습니까? 방 안에 있는 모든 데이터가 사라집니다.",
                    [
                      { text: "취소", style: "cancel" },
                      {
                        text: "삭제",
                        style: "destructive",
                        onPress: () => deleteRoomMutation.mutate(),
                      },
                    ],
                  );
                }}
                disabled={deleteRoomMutation.isPending}
                className="p-2"
              >
                <Trash2 size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      <ScrollView
        className="flex-1"
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4 gap-4">
          <View className="bg-white rounded-2xl border border-gray-100 p-4 gap-3">
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1">
                <View className="flex-row items-center gap-2 flex-wrap">
                  <RoomStatusBadge
                    status={room.status}
                    deadline={room.deadline}
                  />
                  <View className="flex-row items-center gap-1">
                    <Users size={12} color="#9ca3af" />
                    <Text className="text-xs text-gray-400">
                      {room.members?.length ?? 0}명
                    </Text>
                  </View>
                  {room.pickupLocation && (
                    <View className="bg-gray-100 rounded px-1.5 py-0.5 flex-row items-center gap-1 max-w-[150px]">
                      <MapPin size={10} color="#6b7280" />
                      <Text className="text-xs text-gray-500" numberOfLines={1}>
                        {room.pickupLocation}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="font-bold text-gray-900 text-lg mt-1">
                  {room.title}
                </Text>
                <Text className="text-xs text-gray-400 mt-0.5">
                  방장: {room.host.nickname} · 마감 {formatDate(room.deadline)}
                </Text>
              </View>
              {room.restaurantUrl && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(room.restaurantUrl!)}
                  className="flex-row items-center gap-1 bg-primary-50 px-2.5 py-1.5 rounded-lg"
                >
                  <ExternalLink size={12} color="#f97316" />
                  <Text className="text-xs text-primary-600 font-medium">
                    메뉴 보기
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <OrderProgress
              current={totals.totalMenuAmount}
              minimum={totals.minimumOrder}
            />

            <View className="flex-row gap-2">
              <Text className="text-xs text-gray-500">
                배달비 {formatCurrency(room.deliveryFee)}
              </Text>
              <Text className="text-xs text-gray-400">·</Text>
              <Text className="text-xs text-gray-500">
                1인당 약{" "}
                {formatCurrency(
                  Math.ceil(room.deliveryFee / (room.members?.length || 1)),
                )}
              </Text>
            </View>
          </View>

          {isHost && room.status === "OPEN" && (
            <View
              className={`rounded-2xl p-4 flex-row items-center justify-between ${isOrderStartEnabled ? "bg-amber-50 border border-amber-200" : "bg-gray-50 border border-gray-200"}`}
            >
              <Text
                className={`text-xs font-medium flex-1 mr-2 ${isOrderStartEnabled ? "text-amber-800" : "text-gray-500"}`}
              >
                {getOrderStatusMessage()}
              </Text>
              <TouchableOpacity
                onPress={() => statusMutation.mutate("ORDERING")}
                disabled={!isOrderStartEnabled}
                className={`px-3 py-1.5 rounded-full ${isOrderStartEnabled ? "bg-amber-500" : "bg-gray-300"}`}
              >
                <Text className="text-white text-xs font-bold">주문 시작</Text>
              </TouchableOpacity>
            </View>
          )}

          {isHost && room.status === "ORDERING" && !room.settlement && (
            <View className="bg-violet-50 border border-violet-200 rounded-2xl p-4 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-sm text-violet-800 font-semibold mb-1">
                  정산을 생성할까요?
                </Text>
                <Text className="text-xs text-violet-600">
                  {totals.isMinimumMet
                    ? "최소금액 달성! 주문 가능합니다."
                    : "아직 최소금액 미달성"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => settleMutation.mutate()}
                disabled={settleMutation.isPending}
                className="bg-violet-500 px-4 py-2 rounded-full flex-row items-center ml-2"
              >
                {settleMutation.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white text-xs font-bold">
                    정산 생성
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View className="bg-white border-b border-gray-100 px-4 pt-1 flex-row bg-white z-10">
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              className={`flex-1 py-3 items-center border-b-2 ${tab === t.key ? "border-primary-500" : "border-transparent"}`}
            >
              <View className="flex-row items-center">
                <Text
                  className={`text-sm font-semibold ${tab === t.key ? "text-primary-600" : "text-gray-400"}`}
                >
                  {t.label}
                </Text>
                {t.key === "chat" && isMember && messages.length > 0 && (
                  <Text
                    className={`text-xs ml-1 ${tab === t.key ? "text-primary-500" : "text-gray-400"}`}
                  >
                    ({messages.length})
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View className="px-4 pt-4 pb-10 flex-1">
          {tab === "order" && (
            <MemberOrderList
              orderItems={room.orderItems || []}
              currentUserId={user!.id}
              roomId={id!}
              canAdd={canOrder}
              canEdit={canEdit}
              onAdd={(data) => addOrderMutation.mutateAsync(data)}
              onEdit={(itemId, data) =>
                editOrderMutation.mutateAsync({ itemId, data })
              }
              onDelete={(itemId) => deleteOrderMutation.mutateAsync(itemId)}
            />
          )}

          {tab === "chat" &&
            (!isMember ? (
              <View className="flex-1 items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 min-h-[300px]">
                <Text className="text-gray-400 text-sm">
                  방 참여자만 채팅을 볼 수 있습니다.
                </Text>
              </View>
            ) : (
              <View className="flex-1" style={{ minHeight: 300 }}>
                <ScrollView
                  ref={scrollViewRef}
                  className="flex-1 pr-1 mb-4"
                  contentContainerStyle={{ paddingBottom: 10, gap: 8 }}
                  showsVerticalScrollIndicator={false}
                >
                  {messages.length === 0 && (
                    <Text className="text-center text-sm text-gray-400 py-8">
                      아직 메시지가 없습니다.
                    </Text>
                  )}
                  {messages.map((msg) => {
                    if (msg.type === "SYSTEM") {
                      return (
                        <View key={msg.id} className="items-center my-1">
                          <View className="bg-gray-100 px-3 py-1 rounded-full">
                            <Text className="text-gray-500 text-xs">
                              {msg.content}
                            </Text>
                          </View>
                        </View>
                      );
                    }
                    const isMe =
                      msg.userId === user?.id || msg.user?.id === user?.id;
                    return (
                      <View
                        key={msg.id}
                        className={`flex-row gap-2 ${isMe ? "justify-end" : ""}`}
                      >
                        {!isMe && (
                          <View className="w-8 h-8 rounded-full bg-primary-100 items-center justify-center">
                            <Text className="text-primary-700 text-xs font-bold">
                              {msg.user?.nickname?.[0] ?? "?"}
                            </Text>
                          </View>
                        )}
                        <View
                          className={`max-w-[70%] ${isMe ? "items-end" : ""}`}
                        >
                          {!isMe && (
                            <Text className="text-xs text-gray-500 mb-1 ml-1">
                              {msg.user?.nickname}
                            </Text>
                          )}
                          <View
                            className={`px-3 py-2 rounded-2xl ${isMe ? "bg-primary-500 rounded-tr-sm" : "bg-white border border-gray-100 rounded-tl-sm"}`}
                          >
                            <Text
                              className={`text-sm ${isMe ? "text-white" : "text-gray-800"}`}
                            >
                              {msg.content}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>

                {isMember && (
                  <View className="flex-row gap-2 items-center bg-white border border-gray-200 rounded-2xl p-1.5">
                    <TextInput
                      value={chatInput}
                      onChangeText={setChatInput}
                      placeholder="메시지 입력..."
                      className="flex-1 px-3 py-2 text-sm max-h-24"
                      multiline
                    />
                    <TouchableOpacity
                      onPress={handleSendChat}
                      disabled={!chatInput.trim()}
                      className={`bg-primary-500 px-4 py-2.5 rounded-xl ${!chatInput.trim() ? "opacity-50" : ""}`}
                    >
                      <Text className="text-white text-sm font-bold">전송</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}

          {tab === "settlement" && (
            <View>
              {room.settlement || settlement ? (
                <SettlementSummary
                  settlement={settlement || room.settlement!}
                  currentUserId={user!.id}
                  host={room.host}
                  roomId={id!}
                />
              ) : (
                <View className="items-center py-12">
                  <View className="w-14 h-14 bg-gray-100 rounded-2xl items-center justify-center mb-3">
                    <ChevronDown size={24} color="#d1d5db" />
                  </View>
                  <Text className="font-semibold text-gray-600">
                    아직 정산이 시작되지 않았어요
                  </Text>
                  <Text className="text-sm text-gray-400 mt-1">
                    {isHost
                      ? "주문 탭에서 정산을 생성해주세요."
                      : "방장이 정산을 생성하면 여기에 표시됩니다."}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
