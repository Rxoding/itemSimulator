import express from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();
const jwtSecretKey = process.env.SESSION_SECRET_KEY;

// 회원가입
router.post('/sign-up', async (req, res, next) => {
  try {
    const { userId, password, confirmPassword, name } = req.body;

    // 아이디 중복확인
    const isExistUser = await prisma.users.findUnique({
      where: { userId },
    });
    if (isExistUser) {
      return res.status(409).json({ message: '이미 존재하는 아이디입니다.' });
    }

    // bcrypt 사용해 암호화
    const hashedPassword = await bcrypt.hash(password, 10);

    // id = 영어소문자 + 숫자
    const correctId = /^[a-z0-9]+$/;
    if (!correctId.test(userId)) {
      return res.status(400).json({
        message: '아이디는 영어 소문자 + 숫자로 이루어져 있어야 합니다.',
      });
    }

    // 비밀번호는 최소 6자로 구성
    if (password.length < 6) {
      return res.status(400).json({
        message: '비밀번호는 최소 6자 이상이어야 합니다.',
      });
    }

    // 비밀번호와 비밀번호 확인이 다를시
    if (password !== confirmPassword) {
      return res.status(400).json({
        message: '비밀번호가 서로 다릅니다.',
      });
    }

    // 트랜잭션 사용
    const [user] = await prisma.$transaction(
      async (tx) => {
        const user = await tx.users.create({
          data: {
            userId,
            password: hashedPassword, // 비밀번호를 암호화해서 저장
            name,
          },
        });
        return [user];
      },
      {
        //트랜잭션 격리수준 설정
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    return res.status(201).json({
      message:
        'ID: ' + userId + ', 이름: ' + name + ' 로 회원가입이 완료되었습니다.',
    });
  } catch (err) {
    next(err);
  }
});

// 로그인
router.post('/sign-in', async (req, res, next) => {
  try {
    const { userId, password } = req.body;

    const user = await prisma.users.findFirst({ where: { userId } });

    // 계정정보가 다를시 에러메세지 반환
    // 아이디 존재 X
    if (!user)
      return res.status(401).json({ message: '존재하지 않는 아이디입니다.' });
    // 비번 틀림
    if (!(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });

    // 로그인 성공시 userId를 바탕으로 토큰생성
    const token = jwt.sign(
      {
        userCode: user.userCode,
      },
      // process.env.SESSION_SECRET_KEY
      jwtSecretKey
    );

    // authotization 쿠키에 Berer 토큰 형식으로 JWT를 저장
    res.cookie('authorization', `Bearer ${token}`);
    return res.status(200).json({ message: '로그인에 성공하였습니다.' });
  } catch (err) {
    next(err);
  }
});

export default router;
