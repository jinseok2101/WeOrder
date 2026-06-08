import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// 주소 목록 조회
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const addresses = await prisma.userAddress.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(addresses);
  } catch {
    res.status(500).json({ message: '주소 목록을 불러오지 못했습니다.' });
  }
});

// 주소 추가
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { label, roadAddress, jibunAddress, latitude, longitude } = req.body;

    // 만약 첫 주소라면 활성화 상태로 설정
    const count = await prisma.userAddress.count({ where: { userId: req.userId } });

    // 기존 활성 주소 해제 (새 주소를 활성화할 경우)
    if (count === 0) {
      const address = await prisma.userAddress.create({
        data: {
          userId: req.userId!,
          label,
          roadAddress,
          jibunAddress,
          latitude: Number(latitude),
          longitude: Number(longitude),
          isActive: true,
        },
      });
      return res.status(201).json(address);
    }

    const address = await prisma.userAddress.create({
      data: {
        userId: req.userId!,
        label,
        roadAddress,
        jibunAddress,
        latitude: Number(latitude),
        longitude: Number(longitude),
        isActive: false,
      },
    });
    res.status(201).json(address);
  } catch {
    res.status(500).json({ message: '주소를 저장하지 못했습니다.' });
  }
});

// 활성 주소 변경
router.patch('/:id/activate', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await prisma.$transaction([
      prisma.userAddress.updateMany({
        where: { userId: req.userId },
        data: { isActive: false },
      }),
      prisma.userAddress.update({
        where: { id, userId: req.userId },
        data: { isActive: true },
      }),
    ]);

    res.json({ message: '활성 주소가 변경되었습니다.' });
  } catch {
    res.status(500).json({ message: '주소 활성화에 실패했습니다.' });
  }
});

// 주소 삭제
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.userAddress.delete({
      where: { id, userId: req.userId },
    });
    res.json({ message: '주소가 삭제되었습니다.' });
  } catch {
    res.status(500).json({ message: '주소 삭제에 실패했습니다.' });
  }
});

// 주소 별칭 수정
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { label } = req.body;

    if (!label || !label.trim()) {
      return res.status(400).json({ message: '주소 별칭을 입력해 주세요.' });
    }

    const address = await prisma.userAddress.update({
      where: { id, userId: req.userId },
      data: { label: label.trim() },
    });

    res.json(address);
  } catch {
    res.status(500).json({ message: '주소 별칭 수정에 실패했습니다.' });
  }
});

export default router;
