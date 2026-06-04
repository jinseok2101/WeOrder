import React from "react";
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
import {
  Users,
  ExternalLink,
  ChevronDown,
  Edit2,
  MapPin,
  Trash2,
} from "lucide-react-native";
import Header from "../components/layout/Header";
import RoomStatusBadge from "../components/room/RoomStatusBadge";
import OrderProgress from "../components/room/OrderProgress";
import MemberOrderList from "../components/order/MemberOrderList";
import SettlementSummary from "../components/settlement/SettlementSummary";
import { formatCurrency, formatDate } from "../lib/utils";
import { Room } from "../types";
import MannerStars from "../components/room/MannerStars";
import ReviewModal from "../components/room/ReviewModal";
import UserProfileModal from "../components/room/UserProfileModal";
import { useRoomDetail } from "../hooks/useRoomDetail";

type Tab = "order" | "chat" | "settlement";

export default function RoomDetailScreen() {
  const {
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
    isDeleting,
  } = useRoomDetail();

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
              onPress={handleLeave}
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
                onPress={handleEdit}
                className="p-2"
              >
                <Edit2 size={18} color="#9ca3af" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                disabled={isDeleting}
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
                <View className="flex-row items-center gap-1 mt-0.5 flex-wrap">
                  <Text className="text-xs text-gray-400">방장: </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedProfileUserId(room.host.id);
                      setIsUserProfileModalOpen(true);
                    }}
                  >
                    <Text className="text-xs text-gray-600 font-bold underline">
                      {room.host.nickname}
                    </Text>
                  </TouchableOpacity>
                  <MannerStars
                    rating={(room.host.trustScore || 10.0) / 2}
                    size={10}
                    showText={true}
                  />
                  <Text className="text-xs text-gray-400">
                    {" "}
                    · 마감 {formatDate(room.deadline)}
                  </Text>
                </View>
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

          {/* 리뷰 작성 권장 배너 카드 */}
          {room.status === "SETTLED" && isMember && !hasReviewed && (
            <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 gap-3 flex-col sm:flex-row items-center justify-between">
              <View className="flex-1 mr-2 w-full">
                <Text className="text-sm font-bold text-emerald-800">
                  배달이 완료되었나요?
                </Text>
                <Text
                  className="text-xs text-emerald-600 mt-1"
                  numberOfLines={2}
                >
                  음식을 안전하게 받으셨다면, 이웃들의 신뢰도를 평가하고 정산을
                  최종 마감해보세요.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsReviewModalOpen(true)}
                className="bg-emerald-500 px-4 py-2.5 rounded-xl shadow-sm active:opacity-70 mt-2 w-full items-center"
              >
                <Text className="text-white text-xs font-bold">
                  음식 수령 & 이웃 평가하기
                </Text>
              </TouchableOpacity>
            </View>
          )}

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

          {isHost &&
            (["ORDERING", "ORDERED"].includes(room.status) ||
              (room.status === "SETTLED" && !hasReviewed)) && (
              <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 gap-3">
                <View>
                  <Text className="text-sm font-bold text-amber-800">
                    🛵 배달 도착 알림 제어
                  </Text>
                  <Text className="text-xs text-amber-600 mt-0.5">
                    이웃들에게 배달 도착 예정 소식을 실시간 알림 및 푸시로
                    보냅니다.
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => {
                      sendDeliveryArriving(id!, 10);
                      Alert.alert("알림", "10분 전 도착 알림을 발송했습니다.");
                    }}
                    className="flex-1 bg-white border border-amber-200 py-3 rounded-xl items-center justify-center gap-1 shadow-sm active:opacity-75"
                  >
                    <Text className="text-sm font-semibold text-amber-800">
                      10분 전
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      sendDeliveryArriving(id!, 5);
                      Alert.alert("알림", "5분 전 도착 알림을 발송했습니다.");
                    }}
                    className="flex-1 bg-white border border-amber-200 py-3 rounded-xl items-center justify-center gap-1 shadow-sm active:opacity-75"
                  >
                    <Text className="text-sm font-semibold text-amber-800">
                      5분 전
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      sendDeliveryArriving(id!, 0);
                      Alert.alert("알림", "도착 완료 알림을 발송했습니다.");
                    }}
                    className="flex-1 bg-amber-500 py-3 rounded-xl items-center justify-center gap-1 shadow-md active:opacity-75"
                  >
                    <Text className="text-sm font-bold text-white">
                      도착 완료!
                    </Text>
                  </TouchableOpacity>
                </View>
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
                          <TouchableOpacity
                            onPress={() => {
                              setSelectedProfileUserId(
                                msg.userId || msg.user?.id || null,
                              );
                              setIsUserProfileModalOpen(true);
                            }}
                            activeOpacity={0.7}
                            className="w-8 h-8 rounded-full bg-primary-100 items-center justify-center"
                          >
                            <Text className="text-primary-700 text-xs font-bold">
                              {msg.user?.nickname?.[0] ?? "?"}
                            </Text>
                          </TouchableOpacity>
                        )}
                        <View
                          className={`max-w-[70%] ${isMe ? "items-end" : ""}`}
                        >
                          {!isMe && (
                            <TouchableOpacity
                              onPress={() => {
                                setSelectedProfileUserId(
                                  msg.userId || msg.user?.id || null,
                                );
                                setIsUserProfileModalOpen(true);
                              }}
                            >
                              <Text className="text-xs text-gray-500 mb-1 ml-1 font-semibold underline">
                                {msg.user?.nickname}
                              </Text>
                            </TouchableOpacity>
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

      {/* 신뢰도 평가 모달 */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        roomId={id!}
        members={room.members || []}
        currentUserId={user!.id}
        onSuccess={handleReviewSuccess}
      />

      {/* 신뢰도 프로필 모달 */}
      {selectedProfileUserId && (
        <UserProfileModal
          isOpen={isUserProfileModalOpen}
          onClose={() => {
            setIsUserProfileModalOpen(false);
            setSelectedProfileUserId(null);
          }}
          userId={selectedProfileUserId}
        />
      )}
    </KeyboardAvoidingView>
  );
}
