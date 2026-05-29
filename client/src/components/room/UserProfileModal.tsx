import { useState, useEffect } from 'react';
import { X, Award, MessageSquare, ShieldAlert } from 'lucide-react';
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
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && userId) {
      setIsLoading(true);
      setErrorMsg('');
      reviewsApi
        .getUserProfile(userId)
        .then((data) => {
          setProfile(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setErrorMsg('사용자 프로필을 가져오는데 실패했습니다.');
          setIsLoading(false);
        });
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
        
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900 text-lg flex items-center gap-1.5">
            👤 신뢰도 프로필
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 모달 내용 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">신뢰도 프로필 로딩 중...</p>
            </div>
          ) : errorMsg ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-red-500">
              <ShieldAlert size={40} />
              <p className="text-sm font-semibold">{errorMsg}</p>
            </div>
          ) : profile ? (
            <>
              {/* 유저 기본 정보 */}
              <div className="flex flex-col items-center text-center gap-2.5 pb-2">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 text-2xl font-bold shadow-inner">
                  {profile.user.nickname[0]}
                </div>
                <div>
                  <h4 className="text-xl font-extrabold text-gray-900">
                    {profile.user.nickname}
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    평가 참여 횟수: {profile.user.reviewCount}회
                  </p>
                </div>
              </div>

              {/* 신뢰 별점 인포그래픽 */}
              <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 flex flex-col items-center justify-center gap-2">
                <span className="text-xs font-bold text-amber-800 tracking-wider">신뢰도 별점</span>
                <MannerStars rating={profile.user.trustStars} size={28} showText={false} />
                <div className="text-center mt-1">
                  <span className="text-2xl font-extrabold text-gray-900">
                    {profile.user.trustScore.toFixed(1)}점
                  </span>
                  <span className="text-xs text-gray-400 font-bold ml-1">/ 10점 만점</span>
                </div>
              </div>

              {/* 누적 평가 태그 통계 */}
              <div className="space-y-3">
                <h5 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Award size={16} className="text-emerald-500" />
                  받은 주요 신뢰 태그
                </h5>

                {profile.tags.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6 bg-gray-50 rounded-xl">
                    아직 수집된 신뢰 태그가 없습니다.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {profile.tags.map((item: any, idx: number) => {
                      // 최댓값을 기준으로 게이지 비율 연산
                      const maxCount = profile.tags[0]?.count || 1;
                      const percentage = Math.round((item.count / maxCount) * 100);
                      const isPositive = !item.tag.includes('않') && !item.tag.includes('늦') && !item.tag.includes('불');

                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-gray-700">{item.tag}</span>
                            <span className="text-gray-400 font-bold">{item.count}회</span>
                          </div>
                          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isPositive ? 'bg-emerald-500' : 'bg-red-400'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 최근 칭찬 한줄평 코멘트 */}
              <div className="space-y-3">
                <h5 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <MessageSquare size={16} className="text-primary-500" />
                  이웃들의 한 줄 코멘트
                </h5>

                {profile.comments.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6 bg-gray-50 rounded-xl">
                    아직 한 줄 코멘트가 없습니다.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                    {profile.comments.map((comm: any) => (
                      <div
                        key={comm.id}
                        className="bg-white border border-gray-100 rounded-xl p-3 space-y-1 shadow-sm"
                      >
                        <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                          <span>작성자: {comm.reviewerNickname[0]}**</span>
                          <span>평점 {comm.rating.toFixed(1)}점</span>
                        </div>
                        <p className="text-xs text-gray-700 font-medium">"{comm.comment}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* 모달 하단 닫기 */}
        <div className="p-6 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 rounded-2xl shadow-md transition-colors"
          >
            확인
          </button>
        </div>

      </div>
    </div>
  );
}
