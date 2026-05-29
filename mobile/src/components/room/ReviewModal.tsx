import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Star, X } from 'lucide-react-native';
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

  const reviewees = members.filter((m) => m.user.id !== currentUserId && m.userId !== currentUserId);

  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, { rating: number; tags: string[]; comment: string }> = {};
      reviewees.forEach((m) => {
        initial[m.user.id] = { rating: 5.0, tags: [], comment: '' };
      });
      setReviews(initial);
    }
  }, [isOpen, members, currentUserId]);

  const handleRatingChange = (userId: string, rating: number) => {
    const current = reviews[userId] || { rating: 5.0, tags: [], comment: '' };
    
    // 별점 분류(긍정 3.5 이상 / 부정 3.0 이하) 변경 시 태그 리셋
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
      const msg = err.response?.data?.message || '평가 제출 중 오류가 발생했습니다.';
      Alert.alert('오류', msg);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          
          {/* 헤더 */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>파티원 매너 평가하기</Text>
              <Text style={styles.headerSubtitle}>
                배달 파티원들의 신뢰도를 매겨주세요.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* 리스트 스크롤 */}
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {reviewees.length === 0 ? (
              <Text style={styles.emptyText}>평가할 다른 참여자가 없습니다.</Text>
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
                  <View key={uId} style={styles.card}>
                    {/* 사용자 정보 */}
                    <View style={styles.userInfo}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{member.user.nickname[0]}</Text>
                      </View>
                      <View>
                        <Text style={styles.nickname}>{member.user.nickname}</Text>
                        <Text style={styles.role}>
                          {member.user.id === member.room?.hostId ? '방장' : '참여자'}
                        </Text>
                      </View>
                    </View>

                    {/* 0.5단위 별점 조정 UI */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>신뢰도 평가 별점</Text>
                      <View style={styles.starsRow}>
                        <View style={styles.starsContainer}>
                          {Array.from({ length: 5 }).map((_, i) => {
                            const starValue = i + 1;
                            const isFull = currentRating >= starValue;
                            const isHalf = currentRating >= starValue - 0.5 && currentRating < starValue;
                            return (
                              <View key={i} style={styles.starTouchContainer}>
                                <Star size={28} color="#e5e7eb" fill="#e5e7eb" />
                                {isFull && (
                                  <Star
                                    size={28}
                                    color="#f59e0b"
                                    fill="#f59e0b"
                                    style={styles.starAbsolute}
                                  />
                                )}
                                {isHalf && (
                                  <View style={[styles.starAbsolute, styles.starHalfWidth]}>
                                    <Star size={28} color="#f59e0b" fill="#f59e0b" />
                                  </View>
                                )}
                                {/* 0.5단위 터치 감지 구역 */}
                                <TouchableOpacity
                                  style={styles.starLeftHalf}
                                  activeOpacity={1}
                                  onPress={() => handleRatingChange(uId, starValue - 0.5)}
                                />
                                <TouchableOpacity
                                  style={styles.starRightHalf}
                                  activeOpacity={1}
                                  onPress={() => handleRatingChange(uId, starValue)}
                                />
                              </View>
                            );
                          })}
                        </View>
                        <Text style={styles.ratingText}>{currentRating.toFixed(1)}점</Text>
                      </View>
                    </View>

                    {/* 태그 칩 모음 */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>신뢰 태그 선택 (다중 선택)</Text>
                      <View style={styles.chipsContainer}>
                        {availableTags.map((tag) => {
                          const isSelected = currentSelectedTags.includes(tag);
                          return (
                            <TouchableOpacity
                              key={tag}
                              onPress={() => handleTagToggle(uId, tag)}
                              activeOpacity={0.8}
                              style={[
                                styles.chip,
                                isSelected && (isPositive ? styles.chipSelectedPositive : styles.chipSelectedNegative),
                              ]}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  isSelected && (isPositive ? styles.chipTextSelectedPositive : styles.chipTextSelectedNegative),
                                ]}
                              >
                                {tag}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {/* 한 줄평 (선택) */}
                    <TextInput
                      placeholder="한 줄 한마디 코멘트를 남겨주세요 (선택)"
                      value={currentComment}
                      onChangeText={(txt) => handleCommentChange(uId, txt)}
                      maxLength={50}
                      style={styles.input}
                    />
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* 하단 버튼 */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isPending || reviewees.length === 0}
              style={[styles.submitButton, reviewees.length === 0 && styles.disabledButton]}
            >
              {isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>평가 완료</Text>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '85%',
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 99,
    backgroundColor: '#f3f4f6',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
    paddingVertical: 40,
  },
  card: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ea580c',
  },
  nickname: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  role: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 1,
  },
  section: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#9ca3af',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starTouchContainer: {
    width: 28,
    height: 28,
    position: 'relative',
    marginRight: 4,
  },
  starAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  starHalfWidth: {
    width: 14,
    overflow: 'hidden',
  },
  starLeftHalf: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 14,
    height: 28,
    zIndex: 10,
  },
  starRightHalf: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 28,
    zIndex: 10,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  chip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipSelectedPositive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  chipSelectedNegative: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  chipText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '600',
  },
  chipTextSelectedPositive: {
    color: '#047857',
  },
  chipTextSelectedNegative: {
    color: '#b91c1c',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 12,
    color: '#374151',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#f97316',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
