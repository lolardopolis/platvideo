import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Get reviews for a course
router.get('/course/:courseId', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { courseId: req.params.courseId },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Calculate average rating
    const avgRating = reviews.length > 0 
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
      : 0;
    
    res.json({
      reviews,
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews: reviews.length,
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Add or update review (only enrolled students can review)
router.post('/course/:courseId', authMiddleware, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const { courseId } = req.params;
    const userId = req.user.userId;
    
    // Verify enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    
    if (!enrollment) {
      res.status(403).json({ error: 'Debes estar inscrito en el curso para dejar una reseña' });
      return;
    }
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'La calificación debe ser entre 1 y 5 estrellas' });
      return;
    }
    
    // Create or update review
    const review = await prisma.review.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: { rating, comment },
      create: { userId, courseId, rating, comment },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
    
    res.status(201).json(review);
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

// Delete review
router.delete('/:reviewId', authMiddleware, async (req, res) => {
  try {
    const review = await prisma.review.findUnique({
      where: { id: req.params.reviewId },
    });
    
    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }
    
    // Only owner or admin can delete
    if (review.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }
    
    await prisma.review.delete({ where: { id: req.params.reviewId } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

export default router;
