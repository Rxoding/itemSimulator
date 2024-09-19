import express from 'express';
import bcrpyt from 'bcrypt';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

// 캐릭터 생성
router.post('/character', authMiddleware, async (req, res, next) => {
  const { characterName } = req.body;
  const { userCode } = req.user;

  try {
    // 캐릭터명이 이미 존재하는지 확인
    const isExistCharacterName = await prisma.characters.findUnique({
      where: { characterName },
    });
    if (isExistCharacterName) {
      return res
        .status(409)
        .json({ message: '이미 존재하는 캐릭터 이름입니다.' });
    }

    // 캐릭터 생성
    const newCharacter = await prisma.characters.create({
      data: {
        characterName: characterName,
        userCode: +userCode,
        characterInventory: { create: [] },
        characterItem: { create: [] },
      },
      include: {
        characterInventory: true,
        characterItem: true,
      },
    });
    return res.status(201).json({ characterCode: newCharacter.characterCode });
  } catch (err) {
    next(err);
  }
});

// 캐릭터 삭제
router.delete(
  '/character/:characterCode',
  authMiddleware,
  async (req, res, next) => {
    const characterCode = req.params.characterCode;
    const userCode = req.user.userCode;

    try {
      const character = await prisma.characters.findUnique({
        where: { characterCode: +characterCode },
      });
      // 캐릭터가 존재하지 않을 시
      if (!character) {
        return res
          .status(404)
          .json({ message: '삭제하려는 캐릭터가 존재하지 않습니다.' });
      }
      // 삭제할 캐릭터의 userId가 다를 경우
      if (character.userCode !== +userCode) {
        return res
          .status(403)
          .json({ message: '캐릭터를 삭제할 권한이 없습니다.' });
      }
      // 삭제 할 시
      await prisma.characters.delete({
        where: { characterCode: +characterCode },
      });

      return res.status(200).json({ message: '캐릭터가 삭제 되었습니다.' });
    } catch (err) {
      next(err);
    }
  }
);

// 캐릭터 상세 조회
router.get(
  '/character/:characterCode',
  authMiddleware,
  async (req, res, next) => {
    const characterCode = req.params.characterCode;
    const userCode = req.user.userCode;

    try {
      const character = await prisma.characters.findFirst({
        where: { characterCode: +characterCode },
        select: {
          userCode: true,
          characterName: true,
          health: true,
          power: true,
          money: true,
        },
      });

      if (!character) {
        return res
          .status(404)
          .json({ message: '조회하려는 캐릭터가 존재하지 않습니다.' });
      }

      const characterInfo = {
        userCode: character.userCode,
        characterName: character.characterName,
        health: character.health,
        power: character.power,
        ...(userCode === character.userCode && { money: character.money }), // userCode가 일치할 경우 money를 포함
      };

      return res.status(200).json({ characterInfo });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
