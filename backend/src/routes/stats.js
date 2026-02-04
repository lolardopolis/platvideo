import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Get tutor statistics
router.get('/tutor', authMiddleware, async (req, res) => {
  try {
    // Get instructor's courses
    const courses = await prisma.course.findMany({
      where: { instructorId: req.user.userId, deletedAt: null },
      include: {
        _count: { select: { enrollments: true } },
        modules: { include: { videos: true } },
        enrollments: { select: { createdAt: true } },
      },
    });

    // Calculate stats
    const totalCourses = courses.length;
    const totalStudents = courses.reduce((sum, c) => sum + c._count.enrollments, 0);
    const totalVideos = courses.reduce((sum, c) => 
      sum + c.modules.reduce((vSum, m) => vSum + m.videos.length, 0), 0);
    const totalMinutes = courses.reduce((sum, c) => 
      sum + c.modules.reduce((vSum, m) => 
        vSum + m.videos.reduce((dSum, v) => dSum + v.duration, 0), 0), 0) / 60;

    // Get enrollment trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentEnrollments = courses.flatMap(c => c.enrollments)
      .filter(e => new Date(e.createdAt) >= thirtyDaysAgo).length;

    // Get video views
    const courseIds = courses.map(c => c.id);
    const videoIds = courses.flatMap(c => 
      c.modules.flatMap(m => m.videos.map(v => v.id)));
    
    const totalViews = await prisma.videoProgress.count({
      where: { videoId: { in: videoIds } },
    });

    const completedViews = await prisma.videoProgress.count({
      where: { videoId: { in: videoIds }, completed: true },
    });

    const completionRate = totalViews > 0 ? Math.round((completedViews / totalViews) * 100) : 0;

    // Get reviews stats
    const reviews = await prisma.review.findMany({
      where: { courseId: { in: courseIds } },
    });
    const avgRating = reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

    res.json({
      totalCourses,
      totalStudents,
      totalVideos,
      totalMinutes: Math.round(totalMinutes),
      recentEnrollments,
      totalViews,
      completionRate,
      avgRating,
      reviewCount: reviews.length,
    });
  } catch (error) {
    console.error('Get tutor stats error:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

export default router;
