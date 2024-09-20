import express from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

// 아이템 생성
router.post('/item', async (req, res, next) => {
  const { itemName, itemStat, itemPrice } = req.body;

  try {
    const newItem = await prisma.items.create({
      data: {
        itemName,
        health: itemStat.health,
        power: itemStat.power,
        itemPrice,
      },
    });
    return res.status(201).json({
      newItem,
    });
  } catch (err) {
    next(err);
  }
});

// 아이템 수정
router.put('/item/:itemCode', async (req, res, next) => {
  const itemCode = req.params.itemCode;
  const { itemName, itemStat } = req.body;

  try {
    // 아이템이 존재하는지
    const isExistItem = await prisma.items.findUnique({
      where: { itemCode: +itemCode },
    });

    if (!isExistItem) {
      return res.status(409).json({ message: '존재하지 않는 아이템 입니다.' });
    }

    const updateItem = await prisma.items.update({
      where: { itemCode: +itemCode },
      data: {
        itemName,
        health: itemStat.health,
        power: itemStat.power,
      },
    });
    return res.status(201).json({
      message: updateItem.itemName + ' 이(가) 수정되었습니다.',
      updateItem,
    });
  } catch (err) {
    next(err);
  }
});

// 아이템 목록 조회
router.get('/items', async (req, res, next) => {
  try {
    const itemList = await prisma.items.findMany({
      select: {
        itemCode: true,
        itemName: true,
        itemPrice: true,
      },
    });
    return res.status(201).json({ itemList });
  } catch (err) {
    next(err);
  }
});

// 아이템 상세조회
router.get('/items/:itemCode', async (req, res, next) => {
  const itemCode = req.params.itemCode;
  try {
    const item = await prisma.items.findUnique({
      where: { itemCode: +itemCode },
      select: {
        itemCode: true,
        itemName: true,
        health: true,
        power: true,
        itemPrice: true,
      },
    });

    if (!item) {
      return res.status(409).json({ message: '존재하지 않는 아이템 입니다.' });
    }

    const itemInfo = {
      itemCode: item.itemCode,
      itemName: item.itemName,
      itemStat: { health: item.health, power: item.power },
      itemPrice: item.itemPrice,
    };
    return res.status(201).json({
      message: itemInfo.itemName + ' 의 상세 정보입니다.',
      itemInfo,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
