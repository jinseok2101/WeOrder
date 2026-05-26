import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getVapidPublicKey } from '../services/notificationService';

const router = Router();

router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

router.post('/register', async (req, res) => {
  try {
    const { email, nickname, password } = req.body;
    if (!email || !nickname || !password) {
      return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ message: '이미 사용 중인 아이디입니다.' });
    }

    const existingNickname = await prisma.user.findUnique({ where: { nickname } });
    if (existingNickname) {
      return res.status(409).json({ message: '이미 사용 중인 닉네임입니다.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, nickname, passwordHash },
      select: { id: true, email: true, nickname: true },
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    res.status(201).json({ user, token });
  } catch (err) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    res.json({
      user: { id: user.id, email: user.email, nickname: user.nickname },
      token,
    });
  } catch (err) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { 
        id: true, email: true, nickname: true, latitude: true, longitude: true,
        tossId: true, kakaoPayLink: true, bankAccount: true,
        notifyChat: true, notifyRoomStatus: true, notifySettlement: true
      },
    });
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    res.json(user);
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.patch('/me/payment', authenticate, async (req: AuthRequest, res) => {
  try {
    const { tossId, kakaoPayLink, bankAccount } = req.body;
    
    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: {
        tossId: tossId === '' ? null : tossId,
        kakaoPayLink: kakaoPayLink === '' ? null : kakaoPayLink,
        bankAccount: bankAccount === '' ? null : bankAccount,
      },
      select: { 
        id: true, email: true, nickname: true, latitude: true, longitude: true,
        tossId: true, kakaoPayLink: true, bankAccount: true,
        notifyChat: true, notifyRoomStatus: true, notifySettlement: true
      },
    });

    res.json(updatedUser);
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 알림 여부 설정 변경 라우트
router.patch('/me/notifications', authenticate, async (req: AuthRequest, res) => {
  try {
    const { notifyChat, notifyRoomStatus, notifySettlement } = req.body;
    
    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: {
        notifyChat: notifyChat !== undefined ? notifyChat : undefined,
        notifyRoomStatus: notifyRoomStatus !== undefined ? notifyRoomStatus : undefined,
        notifySettlement: notifySettlement !== undefined ? notifySettlement : undefined,
      },
      select: { 
        id: true, email: true, nickname: true, latitude: true, longitude: true,
        tossId: true, kakaoPayLink: true, bankAccount: true,
        notifyChat: true, notifyRoomStatus: true, notifySettlement: true
      },
    });

    res.json(updatedUser);
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 기기 푸시 구독 등록 라우트
router.post('/me/push-subscription', authenticate, async (req: AuthRequest, res) => {
  try {
    const { type, endpoint, p256dh, auth } = req.body;
    if (!req.userId) {
      return res.status(401).json({ message: '인증 정보가 누락되었습니다.' });
    }

    if (!type || !endpoint) {
      return res.status(400).json({ message: '필수 구독 정보가 누락되었습니다.' });
    }

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: req.userId,
        type,
        p256dh: p256dh || null,
        auth: auth || null,
      },
      create: {
        userId: req.userId,
        type,
        endpoint,
        p256dh: p256dh || null,
        auth: auth || null,
      },
    });

    res.status(201).json(subscription);
  } catch (err) {
    res.status(500).json({ message: '구독 등록 중 오류가 발생했습니다.' });
  }
});

// 기기 푸시 구독 해제 라우트
router.delete('/me/push-subscription', authenticate, async (req: AuthRequest, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ message: '해지할 수신처가 지정되지 않았습니다.' });
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        userId: req.userId,
        endpoint,
      },
    });

    res.json({ message: '구독 해지 완료' });
  } catch {
    res.status(500).json({ message: '구독 해지 중 오류가 발생했습니다.' });
  }
});

// 아이디 찾기
router.post('/find-id', async (req, res) => {
  try {
    const { nickname } = req.body;
    if (!nickname) {
      return res.status(400).json({ message: '닉네임을 입력해주세요.' });
    }

    const user = await prisma.user.findUnique({ where: { nickname } });
    if (!user) {
      return res.status(404).json({ message: '해당 닉네임으로 등록된 회원을 찾을 수 없습니다.' });
    }

    res.json({ email: user.email });
  } catch (err) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 비밀번호 재설정
router.post('/reset-password', async (req, res) => {
  try {
    const { email, nickname, newPassword } = req.body;
    if (!email || !nickname || !newPassword) {
      return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.nickname !== nickname) {
      return res.status(400).json({ message: '아이디와 닉네임 정보가 일치하지 않습니다.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    res.json({ message: '비밀번호가 성공적으로 재설정되었습니다.' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// Google 로그인 및 가입
router.post('/google', async (req, res) => {

  try {
    const { token, email: mockEmail, name: mockName } = req.body;
    if (!token) {
      return res.status(400).json({ message: '인증 토큰이 누락되었습니다.' });
    }

    let email = '';
    let name = '';

    if (token.startsWith('mock_google_token_')) {
      // Mock Google Login
      if (!mockEmail || !mockName) {
        return res.status(400).json({ message: '모의 로그인 정보가 올바르지 않습니다.' });
      }
      email = mockEmail;
      name = mockName;
    } else {
      // Real Google Login: Verify via Google API
      try {
        const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
        if (!googleRes.ok) {
          return res.status(401).json({ message: '유효하지 않은 Google 토큰입니다.' });
        }
        const payload = (await googleRes.json()) as any;
        email = payload.email;
        name = payload.name || payload.given_name || '구글사용자';
      } catch (err) {
        return res.status(401).json({ message: 'Google 토큰 인증 중 오류가 발생했습니다.' });
      }

    }

    // Find user by email
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.json({ isNewUser: true, email, name });
    }

    // Sign JWT token
    const appToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      user: { id: user.id, email: user.email, nickname: user.nickname },
      token: appToken,
      isNewUser: false,
    });
  } catch (err) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// Kakao 로그인 및 가입
router.post('/kakao', async (req, res) => {
  try {
    const { token, email: mockEmail, nickname: mockNickname } = req.body;
    if (!token) {
      return res.status(400).json({ message: '인증 토큰이 누락되었습니다.' });
    }

    let email = '';
    let name = '';

    if (token.startsWith('mock_kakao_token_')) {
      // Mock Kakao Login
      if (!mockEmail || !mockNickname) {
        return res.status(400).json({ message: '모의 로그인 정보가 올바르지 않습니다.' });
      }
      email = mockEmail;
      name = mockNickname;
    } else {
      // Real Kakao Login: Verify via Kakao API
      try {
        const kakaoRes = await fetch('https://kapi.kakao.com/v2/user/me', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
          },
        });
        if (!kakaoRes.ok) {
          return res.status(401).json({ message: '유효하지 않은 Kakao 토큰입니다.' });
        }
        const payload = (await kakaoRes.json()) as any;
        email = payload.kakao_account?.email || `${payload.id}@kakao.user`;
        name = payload.kakao_account?.profile?.nickname || payload.properties?.nickname || '카카오사용자';
      } catch (err) {
        return res.status(401).json({ message: 'Kakao 토큰 인증 중 오류가 발생했습니다.' });
      }
    }

    // Find user by email
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.json({ isNewUser: true, email, name });
    }

    // Sign JWT token
    const appToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      user: { id: user.id, email: user.email, nickname: user.nickname },
      token: appToken,
      isNewUser: false,
    });
  } catch (err) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 닉네임 중복 여부 확인 API
router.get('/check-nickname', async (req, res) => {
  try {
    const { nickname } = req.query;
    if (!nickname || typeof nickname !== 'string') {
      return res.status(400).json({ message: '닉네임을 입력해 주세요.' });
    }

    const trimmed = nickname.trim();
    if (!trimmed) {
      return res.status(400).json({ message: '닉네임은 공백일 수 없습니다.' });
    }

    const user = await prisma.user.findUnique({ where: { nickname: trimmed } });
    res.json({ available: !user });
  } catch (err) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 소셜 로그인 회원가입 (신규 유저의 닉네임 중복 검사 및 최종 등록)
router.post('/social-signup', async (req, res) => {
  try {
    const { email, nickname } = req.body;
    if (!email || !nickname) {
      return res.status(400).json({ message: '이메일과 닉네임은 필수입니다.' });
    }

    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      return res.status(400).json({ message: '닉네임은 공백일 수 없습니다.' });
    }

    // 닉네임 중복 검사
    const nicknameExists = await prisma.user.findUnique({ where: { nickname: trimmedNickname } });
    if (nicknameExists) {
      return res.status(409).json({ message: '이미 사용 중인 닉네임입니다.' });
    }

    // 이메일 중복 가입 방지 검사
    const emailExists = await prisma.user.findUnique({ where: { email } });
    if (emailExists) {
      return res.status(400).json({ message: '이미 가입된 이메일 주소입니다.' });
    }

    // Cryptographically secure dummy password
    const secureRandomPassword = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const passwordHash = await bcrypt.hash(secureRandomPassword, 10);

    const user = await prisma.user.create({
      data: {
        email,
        nickname: trimmedNickname,
        passwordHash,
      },
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: { id: user.id, email: user.email, nickname: user.nickname },
      token,
    });
  } catch (err) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 프로필 정보(닉네임) 변경 API
router.patch('/me/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const { nickname } = req.body;
    if (!nickname || typeof nickname !== 'string') {
      return res.status(400).json({ message: '닉네임을 입력해 주세요.' });
    }

    const trimmed = nickname.trim();
    if (!trimmed) {
      return res.status(400).json({ message: '닉네임은 공백일 수 없습니다.' });
    }

    // 닉네임 중복 검사 (본인 제외)
    const existing = await prisma.user.findUnique({ where: { nickname: trimmed } });
    if (existing && existing.id !== req.userId) {
      return res.status(409).json({ message: '이미 사용 중인 닉네임입니다.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: { nickname: trimmed },
      select: {
        id: true,
        email: true,
        nickname: true,
        tossId: true,
        kakaoPayLink: true,
        bankAccount: true,
        notifyChat: true,
        notifyRoomStatus: true,
        notifySettlement: true,
      },
    });

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;

