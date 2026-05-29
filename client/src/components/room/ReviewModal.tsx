import { useState, useEffect } from 'react';
import { Star, X } from 'lucide-react';
import { reviewsApi } from '../../api/reviews';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  members: any[];
  currentUserId: string;
  onSuccess: () => void;
}

const praiseTags = [
  '⏰ 시간 약속을 잘 지켜요',
  '💸 정산(입금)이 정확하고 빨라요',
  '😊 친절하고 매너가 좋아요',
  '💬 채팅 응답이 빠르고 친절해요',
];

const dislikeTags = [
  '⏳ 시간 약속을 안 지켜요',
  '💸 정산(입금)이 늦어졌어요',
  '🔇 연락(채팅) 답장이 늦어요',
  '🙁 답변이나 태도가 불친절해요',
];

export default function ReviewModal({
  isOpen,
  onClose,
  roomId,
  members,
  currentUserId,
  onSuccess,
}: ReviewModalProps) {
  const [reviews, setReviews] = useState<
    Record<string, { rating: number; tags: string[]; comment: string }>
  >({});
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const reviewees = members.filter((m) => m.user.id !== currentUserId && m.userId !== currentUserId);

  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, { rating: number; tags: string[]; comment: string }> = {};
      reviewees.forEach((m) => {
        initial[m.user.id] = { rating: 5.0, tags: [], comment: '' };
      });
      setReviews(initial);
      setErrorMsg('');
    }
  }, [isOpen, members, currentUserId]);

  if (!isOpen) return null;

  const handleRatingChange = (userId: string, rating: number) => {
    const current = reviews[userId] || { rating: 5.0, tags: [], comment: '' };
    
    // 이전 평점의 분류(긍정 3.5 이상 / 부정 3.0 이하)가 변경되면 선택된 태그 목록을 자동 리셋
    const wasPositive = current.rating >= 3.5;
    const isPositive = rating >= 3.5;
    const newTags = wasPositive === isPositive ? current.tags : [];

    setReviews((prev) => ({
      ...prev,
      [userId]: { ...current, rating, tags: newTags },
    }));
  };

  const handleTagToggle = (userId: string, tag: string) => {
    const current = reviews[userId] || { rating: 5.0, tags: [], comment: '' };
    const isSelected = current.tags.includes(tag);
    const newTags = isSelected
      ? current.tags.filter((t) => t !== tag)
      : [...current.tags, tag];

    setReviews((prev) => ({
      ...prev,
      [userId]: { ...current, tags: newTags },
    }));
  };

  const handleCommentChange = (userId: string, comment: string) => {
    const current = reviews[userId] || { rating: 5.0, tags: [], comment: '' };
    setReviews((prev) => ({
      ...prev,
      [userId]: { ...current, comment },
    }));
  };

  const handleSubmit = async () => {
    setIsPending(true);
    setErrorMsg('');
    try {
      const payload = Object.entries(reviews).map(([key, val]) => ({
        revieweeId: key,
        rating: val.rating,
        tags: val.tags,
        comment: val.comment,
      }));

      await reviewsApi.submitReviews(roomId, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || '평가 제출 중 오류가 발생했습니다.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              이웃 매너 평가하기
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              이번 배달 파티는 어떠셨나요? 함께한 분들의 신뢰도를 매겨주세요.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 모달 본문 (스크롤 영역) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {reviewees.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">
              평가할 다른 참여자가 없습니다.
            </p>
          ) : (
            reviewees.map((member) => {
              const uId = member.user.id;
              const currentReview = reviews[uId] || { rating: 5.0, tags: [], comment: '' };
              const currentRating = currentReview.rating;
              const currentSelectedTags = currentReview.tags;
              const currentComment = currentReview.comment;

              const isPositive = currentRating >= 3.5;
              const availableTags = isPositive ? praiseTags : dislikeTags;

              return (
                <div
                  key={uId}
                  className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 space-y-4"
                >
                  {/* 유저 닉네임 */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-bold shadow-sm">
                      {member.user.nickname[0]}
                    </div>
                    <div>
                      <span className="font-bold text-gray-800 text-sm">
                        {member.user.nickname}
                      </span>
                      <span className="text-xs text-gray-400 ml-1.5">
                        {member.user.id === member.room?.hostId ? '방장' : '참여자'}
                      </span>
                    </div>
                  </div>

                  {/* 0.5단위 별점 조정 UI */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-gray-500">신뢰도 평가 별점</span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => {
                          const starValue = i + 1;
                          const isFull = currentRating >= starValue;
                          const isHalf = currentRating >= starValue - 0.5 && currentRating < starValue;
                          return (
                            <div
                              key={i}
                              className="relative cursor-pointer select-none active:scale-90 transition-transform"
                              style={{ width: 28, height: 28 }}
                            >
                              <Star size={28} className="text-gray-200 fill-gray-200" />
                              {isFull && (
                                <Star
                                  size={28}
                                  className="absolute top-0 left-0 fill-amber-400 text-amber-400"
                                />
                              )}
                              {isHalf && (
                                <div
                                  className="absolute top-0 left-0 overflow-hidden"
                                  style={{ width: '50%' }}
                                >
                                  <Star
                                    size={28}
                                    className="fill-amber-400 text-amber-400"
                                  />
                                </div>
                              )}
                              {/* 0.5단위 조절 터치 구역 */}
                              <div
                                className="absolute top-0 left-0 w-1/2 h-full z-10"
                                onClick={() => handleRatingChange(uId, starValue - 0.5)}
                              />
                              <div
                                className="absolute top-0 right-0 w-1/2 h-full z-10"
                                onClick={() => handleRatingChange(uId, starValue)}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <span className="text-sm font-bold text-gray-700">
                        {currentRating.toFixed(1)}점
                        <span className="text-xs text-gray-400 font-normal ml-1">
                          ({(currentRating * 2).toFixed(0)}점 / 10점 만점)
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* 칩 태그 모음 */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-gray-500">
                      신뢰 태그 선택 <span className="font-normal text-gray-400">(다중 선택 가능)</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map((tag) => {
                        const isSelected = currentSelectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleTagToggle(uId, tag)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-100 ${
                              isSelected
                                ? isPositive
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm scale-[1.03]'
                                  : 'bg-red-50 border-red-300 text-red-800 shadow-sm scale-[1.03]'
                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 한 줄평 (선택) */}
                  <div className="flex flex-col gap-1.5">
                    <input
                      type="text"
                      placeholder="한 줄 한마디 코멘트를 남겨주세요 (선택)"
                      value={currentComment}
                      onChange={(e) => handleCommentChange(uId, e.target.value)}
                      maxLength={50}
                      className="w-full text-xs bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 에러 피드백 */}
        {errorMsg && (
          <div className="px-6 py-2 bg-red-50 text-red-600 text-xs text-center border-t border-red-100 flex-shrink-0">
            {errorMsg}
          </div>
        )}

        {/* 모달 하단 버튼 */}
        <div className="p-6 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || reviewees.length === 0}
            className="flex-1 py-3 text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 rounded-2xl shadow-md transition-colors disabled:opacity-50"
          >
            {isPending ? '평가 전송 중...' : '평가 완료'}
          </button>
        </div>

      </div>
    </div>
  );
}
