import { useEffect, useRef, useState } from "react";
import { ScrollView, Alert } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { roomsApi } from "../api/rooms";
import { ordersApi } from "../api/orders";
import { reviewsApi } from "../api/reviews";
import { useAuthStore } from "../store/authStore";
import { useRoomStore } from "../store/roomStore";
import { useSocket } from "./useSocket";
import { ChatMessage, Room } from "../types";

export function useRoomDetail() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { id } = route.params;
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { messages, setMessages, orderTotals, setOrderTotals } = useRoomStore();

  const [chatInput, setChatInput] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);

  const initialTab = route.params?.tab || "order";
  const [tab, setTab] = useState<"order" | "chat" | "settlement">(initialTab);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<
    string | null
  >(null);
  const [hasReviewed, setHasReviewed] = useState(true);

  const { data: room, isLoading } = useQuery({
    queryKey: ["room", id],
    queryFn: () => roomsApi.get(id!),
    enabled: !!id,
  });

  const isMember = room ? (room.members || []).some((m) => m.userId === user?.id) : false;
  const { sendMessage, sendDeliveryArriving } = useSocket(id, isMember);

  const { data: settlement } = useQuery({
    queryKey: ["settlement", id],
    queryFn: () => roomsApi.getSettlement(id!),
    enabled: !!id && !!room?.settlement,
    retry: false,
  });

  useEffect(() => {
    if (route.params?.tab) {
      setTab(route.params.tab);
    }
  }, [route.params?.tab]);

  useEffect(() => {
    if (!id || !isMember) {
      setMessages([]);
      return;
    }
    roomsApi.getChat(id).then((msgs: ChatMessage[]) => setMessages(msgs));
  }, [id, isMember, setMessages]);

  useEffect(() => {
    const isRoomMember = (room?.members || []).some(
      (m) => m.userId === user?.id,
    );
    if (id && room?.status === "SETTLED" && isRoomMember) {
      reviewsApi
        .getReviewStatus(id)
        .then((data) => setHasReviewed(data.hasReviewed));
    }
  }, [id, room?.status, room?.members, user?.id]);

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
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["room", id] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      navigation.navigate("Home");
    },
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

  const handleLeave = () => {
    Alert.alert("알림", "방에서 나가시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "나가기",
        style: "destructive",
        onPress: () => {
          leaveMutation.mutate();
        },
      },
    ]);
  };

  const handleEdit = () => {
    navigation.navigate("RoomEdit", { id });
  };

  const handleDelete = () => {
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
      ]
    );
  };

  const handleReviewSuccess = () => {
    setHasReviewed(true);
    Alert.alert("알림", "상호 평가가 정상 등록되었습니다! 🌟");
    queryClient.invalidateQueries({ queryKey: ["room", id] });
  };

  const isExpired = room?.deadline
    ? new Date(room.deadline).getTime() < Date.now()
    : false;
  const isHost = room?.hostId === user?.id;
  const canJoin = !isMember && room?.status === "OPEN" && !isExpired;
  const canOrder =
    isMember &&
    (room?.status === "OPEN" || room?.status === "ORDERING") &&
    !isExpired;
  const canEdit =
    isMember &&
    (room?.status === "OPEN" || room?.status === "ORDERING") &&
    !isExpired;
  const totals = orderTotals ?? {
    totalMenuAmount: 0,
    minimumOrder: room?.minimumOrder || 0,
    deliveryFee: room?.deliveryFee || 0,
    isMinimumMet: false,
    allMembersHaveOrders: false,
    achievementRate: 0,
  };

  return {
    id,
    user,
    messages,
    tab,
    setTab,
    chatInput,
    setChatInput,
    scrollViewRef,
    isReviewModalOpen,
    setIsReviewModalOpen,
    isUserProfileModalOpen,
    setIsUserProfileModalOpen,
    selectedProfileUserId,
    setSelectedProfileUserId,
    hasReviewed,
    room,
    isLoading,
    isMember,
    sendMessage,
    sendDeliveryArriving,
    settlement,
    isExpired,
    isHost,
    canJoin,
    canOrder,
    canEdit,
    totals,
    joinMutation,
    statusMutation,
    settleMutation,
    addOrderMutation,
    editOrderMutation,
    deleteOrderMutation,
    handleLeave,
    handleEdit,
    handleDelete,
    handleReviewSuccess,
    isDeleting: deleteRoomMutation.isPending,
  };
}
