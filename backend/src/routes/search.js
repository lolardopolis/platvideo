import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Global search
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      res.json({ courses: [], videos: [], users: [] });
      return;
    }

    const query = q.toLowerCase();

    // Search courses
    const courses = await prisma.course.findMany({
      where: {
        deletedAt: null,
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
          { category: { contains: query } },
        ],
      },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        category: true,
        instructor: { select: { name: true } },
      },
      take: 5,
    });

    // Search videos
    const videos = await prisma.video.findMany({
      where: {
        title: { contains: query },
      },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        duration: true,
        module: {
          select: {
            course: { select: { id: true, title: true } },
          },
        },
      },
      take: 5,
    });

    // Search users
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
        ],
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        role: true,
      },
      take: 5,
    });

    res.json({
      courses: courses.map(c => ({ ...c, type: 'course' })),
      videos: videos.map(v => ({
        id: v.id,
        title: v.title,
        thumbnail: v.thumbnail,
        duration: v.duration,
        courseId: v.module.course.id,
        courseTitle: v.module.course.title,
        type: 'video',
      })),
      users: users.map(u => ({ ...u, type: 'user' })),
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
