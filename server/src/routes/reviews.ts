import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * 1. POST /api/rooms/:roomId/reviews
 * 특정 방이 정산 완료(SETTLED)된 후, 방 멤버들을 다중 평가(별점 0.5~5.0 및 태그 칩)하는 API
 */
router.post('/rooms/:roomId/reviews', authenticate, async (req: AuthRequest, res) => {
  try {
    const { roomId } = req.params;
    const reviewerId = req.userId!;
    const { reviews } = req.body; // 배열 형태: [{ revieweeId: string; rating: number; tags: string[]; comment?: string; }]

    if (!Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({ message: '평가할 이웃 정보가 필요합니다.' });
    }

    // 방 조회 및 검증
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { members: true }
    });

    if (!room) {
      return res.status(404).json({ message: '해당 방을 찾을 수 없습니다.' });
    }

    if (room.status !== 'SETTLED') {
      return res.status(400).json({ message: '결제 및 정산이 최종 완료(SETTLED)된 후에만 평가할 수 있습니다.' });
    }

    // 리뷰어가 방 멤버인지 검증
    const isReviewerMember = room.members.some((m) => m.userId === reviewerId);
    if (!isReviewerMember) {
      return res.status(403).json({ message: '해당 방의 참여자만 리뷰를 작성할 수 있습니다.' });
    }

    const createdReviews = [];

    // 개별 리뷰 데이터 적합성 및 중복 여부 확인 후 저장
    for (const rev of reviews) {
      const { revieweeId, rating, tags, comment } = rev;

      if (revieweeId === reviewerId) {
        return res.status(400).json({ message: '자기 자신은 평가할 수 없습니다.' });
      }

      // 리뷰이가 방 멤버인지 검증
      const isRevieweeMember = room.members.some((m) => m.userId === revieweeId);
      if (!isRevieweeMember) {
        return res.status(400).json({ message: '해당 방의 참여자가 아닌 사용자는 평가할 수 없습니다.' });
      }

      // 별점 데이터 검증 (0.5 단위, 0.5 ~ 5.0 사이)
      if (typeof rating !== 'number' || rating < 0.5 || rating > 5.0 || (rating * 10) % 5 !== 0) {
        return res.status(400).json({ message: '별점은 0.5부터 5.0 사이의 0.5 단위 숫자여야 합니다.' });
      }

      // 중복 리뷰 검사
      const existingReview = await prisma.userReview.findUnique({
        where: {
          roomId_reviewerId_revieweeId: {
            roomId,
            reviewerId,
            revieweeId
          }
        }
      });

      if (existingReview) {
        return res.status(400).json({ message: '이미 평가를 완료한 이웃입니다.' });
      }

      // 10점 만점 기준 점수로 환산 (예: 별점 4.5 ➡️ 9.0점, 별점 5.0 ➡️ 10.0점)
      const newRatingPoints = rating * 2;

      // 트랜잭션을 통해 신뢰 리뷰 등록과 피평가자의 신뢰도 점수(trustScore) 연산 업데이트를 묶어 처리
      const newReview = await prisma.$transaction(async (tx) => {
        // 1) 리뷰 데이터 삽입
        const created = await tx.userReview.create({
          data: {
            roomId,
            reviewerId,
            revieweeId,
            rating,
            tags: tags || [],
            comment: comment || null
          }
        });

        // 2) 피평가자 신뢰 점수 재계산 갱신
        const user = await tx.user.findUnique({
          where: { id: revieweeId },
          select: { trustScore: true, reviewCount: true }
        });

        if (user) {
          const currentCount = user.reviewCount;
          const currentScore = user.trustScore;

          // 새로운 평균 점수 계산 공식 적용
          const updatedScore = ((currentScore * currentCount) + newRatingPoints) / (currentCount + 1);

          await tx.user.update({
            where: { id: revieweeId },
            data: {
              trustScore: Number(updatedScore.toFixed(2)),
              reviewCount: currentCount + 1
            }
          });
        }

        return created;
      });

      createdReviews.push(newReview);
    }

    res.status(201).json({ message: '성공적으로 평가를 제출했습니다.', reviews: createdReviews });
  } catch (error) {
    console.error('❌ Error submitting reviews:', error);
    res.status(500).json({ message: '평가 등록 중 서버 오류가 발생했습니다.' });
  }
});

/**
 * 2. GET /api/users/:userId/profile
 * 특정 사용자의 신뢰도 별점 평균, 칩 태그 통계 수치, 최근 한줄평 코멘트 목록 조회 API
 */
router.get('/users/:userId/profile', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        trustScore: true,
        reviewCount: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: '해당 사용자를 찾을 수 없습니다.' });
    }

    // 해당 유저가 받은 리뷰 전체 로드
    const reviews = await prisma.userReview.findMany({
      where: { revieweeId: userId },
      include: {
        reviewer: {
          select: { nickname: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 받은 태그 통계 집계
    const tagStats: Record<string, number> = {};
    reviews.forEach((rev) => {
      rev.tags.forEach((tag) => {
        tagStats[tag] = (tagStats[tag] || 0) + 1;
      });
    });

    // 객체를 배열 형태 [{ tag: string; count: number }]로 정렬 변환
    const tagsArray = Object.keys(tagStats)
      .map((tag) => ({ tag, count: tagStats[tag] }))
      .sort((a, b) => b.count - a.count);

    // 최근 한줄평 목록 (코멘트가 작성된 것만 필터링)
    const comments = reviews
      .filter((rev) => rev.comment && rev.comment.trim() !== '')
      .map((rev) => ({
        id: rev.id,
        reviewerNickname: rev.reviewer.nickname,
        rating: rev.rating,
        comment: rev.comment,
        createdAt: rev.createdAt
      }))
      .slice(0, 10); // 최근 10개만 전달

    res.json({
      user: {
        id: user.id,
        nickname: user.nickname,
        trustScore: user.trustScore,
        trustStars: Number((user.trustScore / 2).toFixed(2)), // 별점 환산값 (0.5 ~ 5.0)
        reviewCount: user.reviewCount
      },
      tags: tagsArray,
      comments
    });
  } catch (error) {
    console.error('❌ Error getting user profile:', error);
    res.status(500).json({ message: '사용자 프로필 조회 중 서버 오류가 발생했습니다.' });
  }
});

/**
 * 3. GET /api/rooms/:roomId/reviews/status
 * 현재 로그인한 유저가 이 배달방에서 평가를 이미 진행했는지 상태를 체크하는 API
 */
router.get('/rooms/:roomId/reviews/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { roomId } = req.params;
    const reviewerId = req.userId!;

    const reviewCount = await prisma.userReview.count({
      where: {
        roomId,
        reviewerId
      }
    });

    // 하나 이상의 리뷰를 남겼다면 평가 완료 상태로 감지
    res.json({ hasReviewed: reviewCount > 0 });
  } catch (error) {
    console.error('❌ Error getting review status:', error);
    res.status(500).json({ message: '평가 상태 조회 중 서버 오류가 발생했습니다.' });
  }
});

export default router;
