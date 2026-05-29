import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { X, Award, MessageSquare } from 'lucide-react-native';
import { reviewsApi } from '../../api/reviews';
import MannerStars from './MannerStars';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function UserProfileModal({ isOpen, onClose, userId }: UserProfileModalProps) {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      setIsLoading(true);
      reviewsApi
        .getUserProfile(userId)
        .then((data) => {
          setProfile(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.warn('Failed to load user profile in mobile modal:', err);
          setIsLoading(false);
        });
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>👤 신뢰도 프로필</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* 본문 스크롤 */}
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#f97316" />
                <Text style={styles.loadingText}>신뢰도 프로필 로딩 중...</Text>
              </View>
            ) : profile ? (
              <View style={styles.profileBox}>
                
                {/* 사용자 정보 */}
                <View style={styles.userSection}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{profile.user.nickname[0]}</Text>
                  </View>
                  <Text style={styles.nickname}>{profile.user.nickname}</Text>
                  <Text style={styles.countText}>평가 참여 횟수: {profile.user.reviewCount}회</Text>
                </View>

                {/* 인포그래픽 평점 박스 */}
                <View style={styles.scoreCard}>
                  <Text style={styles.scoreCardTitle}>신뢰도 별점</Text>
                  <MannerStars rating={profile.user.trustStars} size={26} showText={false} />
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreValue}>{profile.user.trustScore.toFixed(1)}점</Text>
                    <Text style={styles.scoreTotal}> / 10점 만점</Text>
                  </View>
                </View>

                {/* 받은 주요 신뢰 태그 */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Award size={16} color="#10b981" />
                    <Text style={styles.sectionHeaderText}>받은 주요 신뢰 태그</Text>
                  </View>

                  {profile.tags.length === 0 ? (
                    <Text style={styles.emptySectionText}>아직 수집된 신뢰 태그가 없습니다.</Text>
                  ) : (
                    <View style={styles.tagsContainer}>
                      {profile.tags.map((item: any, idx: number) => {
                        const maxCount = profile.tags[0]?.count || 1;
                        const percentage = Math.round((item.count / maxCount) * 100);
                        const isPositive = !item.tag.includes('않') && !item.tag.includes('늦') && !item.tag.includes('불');

                        return (
                          <View key={idx} style={styles.progressRow}>
                            <View style={styles.progressLabels}>
                              <Text style={styles.progressTag}>{item.tag}</Text>
                              <Text style={styles.progressCount}>{item.count}회</Text>
                            </View>
                            <View style={styles.progressTrack}>
                              <View
                                style={[
                                  styles.progressFill,
                                  { width: `${percentage}%` },
                                  isPositive ? styles.fillPositive : styles.fillNegative,
                                ]}
                              />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* 코멘트 목록 */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <MessageSquare size={16} color="#ea580c" />
                    <Text style={styles.sectionHeaderText}>이웃들의 한 줄 코멘트</Text>
                  </View>

                  {profile.comments.length === 0 ? (
                    <Text style={styles.emptySectionText}>아직 남겨진 한 줄 코멘트가 없습니다.</Text>
                  ) : (
                    <View style={styles.commentsContainer}>
                      {profile.comments.map((comm: any) => (
                        <View key={comm.id} style={styles.commentCard}>
                          <View style={styles.commentHeader}>
                            <Text style={styles.commentUser}>작성자: {comm.reviewerNickname[0]}**</Text>
                            <Text style={styles.commentRating}>평점 {comm.rating.toFixed(1)}점</Text>
                          </View>
                          <Text style={styles.commentText}>"{comm.comment}"</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

              </View>
            ) : null}
          </ScrollView>

          {/* 확인 버튼 */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.confirmButton}>
              <Text style={styles.confirmButtonText}>확인</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '80%',
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 16,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 6,
    borderRadius: 99,
    backgroundColor: '#f3f4f6',
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  profileBox: {
    gap: 20,
  },
  userSection: {
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#059669',
  },
  nickname: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  countText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  scoreCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  scoreCardTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#b45309',
    letterSpacing: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
  },
  scoreTotal: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: 'bold',
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
  },
  emptySectionText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 18,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  tagsContainer: {
    gap: 10,
  },
  progressRow: {
    gap: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTag: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '600',
  },
  progressCount: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: 'bold',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  fillPositive: {
    backgroundColor: '#10b981',
  },
  fillNegative: {
    backgroundColor: '#f87171',
  },
  commentsContainer: {
    gap: 8,
  },
  commentCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commentUser: {
    fontSize: 9,
    color: '#9ca3af',
    fontWeight: '600',
  },
  commentRating: {
    fontSize: 9,
    color: '#9ca3af',
    fontWeight: '600',
  },
  commentText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  confirmButton: {
    backgroundColor: '#f97316',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
