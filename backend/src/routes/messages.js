import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Get user's conversations
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId: req.user.userId },
        },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Format for frontend
    const formatted = conversations.map(c => {
      const otherParticipant = c.participants.find(p => p.userId !== req.user.userId);
      const lastMessage = c.messages[0];
      const unreadCount = c.messages.filter(m => !m.read && m.senderId !== req.user.userId).length;
      
      return {
        id: c.id,
        participant: otherParticipant?.user,
        lastMessage: lastMessage?.text,
        lastMessageTime: lastMessage?.createdAt,
        unreadCount,
      };
    });
    
    res.json(formatted);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Start new conversation
router.post('/conversations', authMiddleware, async (req, res) => {
  try {
    const { participantId } = req.body;
    
    // Check if conversation already exists
    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: req.user.userId } } },
          { participants: { some: { userId: participantId } } },
        ],
      },
    });
    
    if (existing) {
      res.json({ id: existing.id, isNew: false });
      return;
    }
    
    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          create: [
            { userId: req.user.userId },
            { userId: participantId },
          ],
        },
      },
    });
    
    res.status(201).json({ id: conversation.id, isNew: true });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get messages in conversation
router.get('/conversations/:id/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { conversationId: req.params.id },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    });
    
    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        conversationId: req.params.id,
        senderId: { not: req.user.userId },
        read: false,
      },
      data: { read: true },
    });
    
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message
router.post('/conversations/:id/messages', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    
    const message = await prisma.message.create({
      data: {
        text,
        senderId: req.user.userId,
        conversationId: req.params.id,
      },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    });
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
