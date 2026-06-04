import { FormEvent } from "react";
import {
  Users,
  ExternalLink,
  ChevronDown,
  Edit2,
  MapPin,
  Trash2,
} from "lucide-react";
import Header from "../components/layout/Header";
import RoomStatusBadge from "../components/room/RoomStatusBadge";
import OrderProgress from "../components/room/OrderProgress";
import MemberOrderList from "../components/order/MemberOrderList";
import SettlementSummary from "../components/settlement/SettlementSummary";
import { cn, formatCurrency, formatDate } from "../lib/utils";
import { Room } from "../types";
import MannerStars from "../components/room/MannerStars";
import ReviewModal from "../components/room/ReviewModal";
import UserProfileModal from "../components/room/UserProfileModal";
import { useRoomDetail } from "../hooks/useRoomDetail";

type Tab = "order" | "chat" | "settlement";

export default function RoomDetail() {
  const {
    id,
    user,
    messages,
    tab,
    setTab,
    chatInput,
    setChatInput,
    chatEndRef,
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
      <div className="min-h-screen bg-gray-50">
        <Header title="로딩 중..." showBack showHome />
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl h-24 animate-pulse border border-gray-100"
            />
          ))}
        </div>
      </div>
    );
  }

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="min-h-screen bg-gray-50">
      <Header
        title={room.restaurantName}
        showBack
        showHome
        right={
          !isMember && canJoin ? (
            <button
              onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
              className="bg-primary-500 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-primary-600 transition-colors"
            >
              참여하기
            </button>
          ) : isMember && !isHost ? (
            <button
              onClick={handleLeave}
              disabled={room.status !== "OPEN"}
              className={cn(
                "text-sm px-2 py-1 transition-colors",
                room.status === "OPEN"
                  ? "text-gray-400 hover:text-gray-600"
                  : "text-gray-300 cursor-not-allowed opacity-50 font-medium",
              )}
            >
              나가기
            </button>
          ) : isHost &&
            !["ORDERED", "SETTLED", "CANCELLED"].includes(room.status) ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleEdit}
                className="p-2 text-gray-400 hover:text-primary-500 transition-colors"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ) : null
        }
      />

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <RoomStatusBadge
                  status={room.status}
                  deadline={room.deadline}
                />
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Users size={12} />
                  {room.members?.length ?? 0}명
                </span>
                {room.pickupLocation && (
                  <span className="text-xs text-gray-500 bg-gray-100/80 rounded px-1.5 py-0.5 flex items-center gap-1 max-w-[150px] truncate">
                    <MapPin size={10} className="flex-shrink-0" />
                    <span className="truncate">{room.pickupLocation}</span>
                  </span>
                )}
              </div>
              <h2 className="font-bold text-gray-900 mt-1">{room.title}</h2>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>방장:</span>
                <button
                  onClick={() => {
                    setSelectedProfileUserId(room.host.id);
                    setIsUserProfileModalOpen(true);
                  }}
                  className="font-bold text-gray-600 hover:underline hover:text-primary-600 cursor-pointer transition-colors"
                >
                  {room.host.nickname}
                </button>
                <MannerStars
                  rating={(room.host.trustScore || 10.0) / 2}
                  size={12}
                  showText={true}
                />
                <span>· 마감 {formatDate(room.deadline)}</span>
              </p>
            </div>
            {room.restaurantUrl && (
              <a
                href={room.restaurantUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-1 text-xs text-primary-600 bg-primary-50 px-2.5 py-1.5 rounded-lg font-medium hover:bg-primary-100 transition-colors"
              >
                <ExternalLink size={12} />
                메뉴 보기
              </a>
            )}
          </div>

          <OrderProgress
            current={totals.totalMenuAmount}
            minimum={totals.minimumOrder}
          />

          <div className="flex gap-2 text-xs text-gray-500">
            <span>배달비 {formatCurrency(room.deliveryFee)}</span>
            <span>·</span>
            <span>
              1인당 약{" "}
              {formatCurrency(
                Math.ceil(room.deliveryFee / (room.members?.length || 1)),
              )}
            </span>
          </div>
        </div>

        {/* 리뷰 작성 권장 배너 */}
        {room.status === "SETTLED" && isMember && !hasReviewed && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm animate-in slide-in-from-top-4 duration-300">
            <div>
              <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-1.5">
                배달이 완료되었나요?
              </h3>
              <p className="text-xs text-emerald-600 mt-0.5">
                음식을 안전하게 받으셨다면, 이웃들의 신뢰도를 평가하고 정산을
                최종 마감해보세요.
              </p>
            </div>
            <button
              onClick={() => setIsReviewModalOpen(true)}
              className="w-full sm:w-auto text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-1 flex-shrink-0 cursor-pointer"
            >
              음식 수령 & 이웃 평가하기
            </button>
          </div>
        )}

        {isHost && room.status === "OPEN" && (
          <div
            className={cn(
              "rounded-2xl p-3 flex items-center justify-between",
              isOrderStartEnabled
                ? "bg-amber-50 border border-amber-200"
                : "bg-gray-50 border border-gray-200",
            )}
          >
            <span
              className={cn(
                "text-sm font-medium",
                isOrderStartEnabled ? "text-amber-800" : "text-gray-500",
              )}
            >
              {getOrderStatusMessage()}
            </span>
            <button
              onClick={() => statusMutation.mutate("ORDERING")}
              disabled={!isOrderStartEnabled}
              className={cn(
                "text-xs text-white px-3 py-1.5 rounded-full font-bold transition-colors",
                isOrderStartEnabled
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-gray-300 cursor-not-allowed opacity-70",
              )}
            >
              주문 시작
            </button>
          </div>
        )}

        {isHost && room.status === "ORDERING" && !room.settlement && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-violet-800 font-semibold">
                정산을 생성할까요?
              </p>
              <p className="text-xs text-violet-600 mt-0.5">
                {totals.isMinimumMet
                  ? "최소금액 달성! 주문 가능합니다."
                  : "아직 최소금액 미달성"}
              </p>
            </div>
            <button
              onClick={() => settleMutation.mutate()}
              disabled={settleMutation.isPending}
              className="flex-shrink-0 text-xs bg-violet-500 text-white px-3 py-1.5 rounded-full font-bold hover:bg-violet-600 transition-colors disabled:opacity-60"
            >
              {settleMutation.isPending ? "..." : "정산 생성"}
            </button>
          </div>
        )}

        {isHost &&
          (["ORDERING", "ORDERED"].includes(room.status) ||
            (room.status === "SETTLED" && !hasReviewed)) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-amber-800 flex items-center gap-1.5">
                🛵 배달 도착 알림 제어
              </h3>
              <p className="text-xs text-amber-600 mt-0.5">
                이웃들에게 배달 도착 예정 소식을 실시간 알림 및 푸시로 보냅니다.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  sendDeliveryArriving(id!, 10);
                  alert("10분 전 도착 알림을 발송했습니다.");
                }}
                className="bg-white border border-amber-200 text-amber-800 hover:bg-amber-100/50 text-xs py-2.5 px-1 rounded-xl font-semibold transition-all flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 duration-100"
              >
                <span className="text-base">10분 전</span>
              </button>
              <button
                onClick={() => {
                  sendDeliveryArriving(id!, 5);
                  alert("5분 전 도착 알림을 발송했습니다.");
                }}
                className="bg-white border border-amber-200 text-amber-800 hover:bg-amber-100/50 text-xs py-2.5 px-1 rounded-xl font-semibold transition-all flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 duration-100"
              >
                <span className="text-base">5분 전</span>
              </button>
              <button
                onClick={() => {
                  sendDeliveryArriving(id!, 0);
                  alert("도착 완료 알림을 발송했습니다.");
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs py-2.5 px-1 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-1 shadow-md active:scale-95 duration-100"
              >
                <span className="text-base">도착 완료!</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="sticky top-14 z-30 bg-white border-b border-gray-100 px-4 mt-3">
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 py-3 text-sm font-semibold border-b-2 transition-colors",
                tab === t.key
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-400 hover:text-gray-600",
              )}
            >
              {t.label}
              {t.key === "chat" && isMember && messages.length > 0 && (
                <span className="ml-1 text-xs text-gray-400">
                  ({messages.length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("px-4 pt-4", tab === "chat" ? "pb-4" : "pb-24")}>
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
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100 min-h-[300px]">
              방 참여자만 채팅을 볼 수 있습니다.
            </div>
          ) : (
            <div
              className="flex flex-col"
              style={{ height: "calc(100dvh - 360px)" }}
            >
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {messages.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-8">
                    아직 메시지가 없습니다.
                  </p>
                )}
                {messages.map((msg) => {
                  if (msg.type === "SYSTEM") {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }
                  const isMe =
                    msg.userId === user?.id || msg.user?.id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={cn("flex gap-2", isMe && "flex-row-reverse")}
                    >
                      {!isMe && (
                        <button
                          onClick={() => {
                            setSelectedProfileUserId(
                              msg.userId || msg.user?.id || null,
                            );
                            setIsUserProfileModalOpen(true);
                          }}
                          className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-primary-700 text-xs font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        >
                          {msg.user?.nickname?.[0] ?? "?"}
                        </button>
                      )}
                      <div
                        className={cn(
                          "max-w-[70%]",
                          isMe && "items-end flex flex-col",
                        )}
                      >
                        {!isMe && (
                          <button
                            onClick={() => {
                              setSelectedProfileUserId(
                                msg.userId || msg.user?.id || null,
                              );
                              setIsUserProfileModalOpen(true);
                            }}
                            className="text-xs text-gray-500 mb-1 ml-1 hover:underline hover:text-primary-600 font-semibold cursor-pointer"
                          >
                            {msg.user?.nickname}
                          </button>
                        )}
                        <div
                          className={cn(
                            "px-3 py-2 rounded-2xl text-sm",
                            isMe
                              ? "bg-primary-500 text-white rounded-tr-sm"
                              : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm",
                          )}
                        >
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {isMember && (
                <form
                  onSubmit={handleSendChat}
                  className="flex gap-2 mt-3 pb-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="메시지 입력..."
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="bg-primary-500 text-white px-4 rounded-xl text-sm font-bold hover:bg-primary-600 disabled:opacity-40 transition-colors"
                  >
                    전송
                  </button>
                </form>
              )}
            </div>
          ))}

        {tab === "settlement" && (
          <div>
            {room.settlement || settlement ? (
              <SettlementSummary
                settlement={settlement || room.settlement!}
                currentUserId={user!.id}
                host={room.host}
                roomId={id!}
              />
            ) : (
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ChevronDown size={24} className="text-gray-300" />
                </div>
                <p className="font-semibold text-gray-600">
                  아직 정산이 시작되지 않았어요
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {isHost
                    ? "주문 탭에서 정산을 생성해주세요."
                    : "방장이 정산을 생성하면 여기에 표시됩니다."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

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
    </div>
  );
}
