import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Get all forums
router.get('/', async (req, res) => {
  try {
    const { type, career, courseId } = req.query;
    
    const where = { isPublic: true };
    if (type) where.type = type;
    if (career) where.career = career;
    if (courseId) where.courseId = courseId;
    
    const forums = await prisma.forum.findMany({
      where,
      include: {
        _count: { select: { posts: true } },
        course: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json(forums);
  } catch (error) {
    console.error('Get forums error:', error);
    res.status(500).json({ error: 'Failed to fetch forums' });
  }
});

// Create forum
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, type, courseId, career, isPublic } = req.body;
    
    const forum = await prisma.forum.create({
      data: {
        name,
        description,
        type: type || 'GENERAL',
        courseId,
        career,
        isPublic: isPublic !== false,
      },
    });
    
    res.status(201).json(forum);
  } catch (error) {
    console.error('Create forum error:', error);
    res.status(500).json({ error: 'Failed to create forum' });
  }
});

// Get forum posts
router.get('/:id/posts', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const posts = await prisma.forumPost.findMany({
      where: { forumId: req.params.id },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        _count: { select: { replies: true, likes: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    
    res.json(posts);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Create post
router.post('/:id/posts', authMiddleware, async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    
    const post = await prisma.forumPost.create({
      data: {
        title,
        content,
        tags: tags ? JSON.stringify(tags) : null,
        authorId: req.user.userId,
        forumId: req.params.id,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        _count: { select: { replies: true, likes: true } },
      },
    });
    
    res.status(201).json(post);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get single post with replies
router.get('/posts/:postId', async (req, res) => {
  try {
    const post = await prisma.forumPost.update({
      where: { id: req.params.postId },
      data: { views: { increment: 1 } },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        forum: { select: { id: true, name: true } },
        replies: {
          include: {
            author: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { likes: true } },
        likes: { select: { userId: true } },
      },
    });
    
    res.json(post);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Reply to post
router.post('/posts/:postId/replies', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    
    const reply = await prisma.forumReply.create({
      data: {
        content,
        authorId: req.user.userId,
        postId: req.params.postId,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });
    
    res.status(201).json(reply);
  } catch (error) {
    console.error('Create reply error:', error);
    res.status(500).json({ error: 'Failed to create reply' });
  }
});

// Like/Unlike post
router.post('/posts/:postId/like', authMiddleware, async (req, res) => {
  try {
    const existingLike = await prisma.postLike.findUnique({
      where: {
        userId_postId: {
          userId: req.user.userId,
          postId: req.params.postId,
        },
      },
    });
    
    if (existingLike) {
      // Unlike
      await prisma.postLike.delete({ where: { id: existingLike.id } });
      res.json({ liked: false });
    } else {
      // Like
      await prisma.postLike.create({
        data: {
          userId: req.user.userId,
          postId: req.params.postId,
        },
      });
      res.json({ liked: true });
    }
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// Delete post
router.delete('/posts/:postId', authMiddleware, async (req, res) => {
  try {
    const post = await prisma.forumPost.findUnique({ where: { id: req.params.postId } });
    
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    
    if (post.authorId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }
    
    await prisma.forumPost.delete({ where: { id: req.params.postId } });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

export default router;
