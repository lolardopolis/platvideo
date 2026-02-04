import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Get quiz
router.get('/:id', async (req, res) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: { 
        questions: {
          select: { id: true, text: true, options: true }, // Don't send correctIndex
        },
      },
    });
    
    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }
    
    // Parse options JSON
    const quizWithParsedOptions = {
      ...quiz,
      questions: quiz.questions.map(q => ({
        ...q,
        options: JSON.parse(q.options),
      })),
    };
    
    res.json(quizWithParsedOptions);
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

// Submit quiz
router.post('/:id/submit', authMiddleware, async (req, res) => {
  try {
    const { answers } = req.body; // { questionId: selectedIndex }
    
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: { questions: true },
    });
    
    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }
    
    // Calculate score
    let correct = 0;
    const results = quiz.questions.map(q => {
      const isCorrect = answers[q.id] === q.correctIndex;
      if (isCorrect) correct++;
      return { questionId: q.id, isCorrect, correctIndex: q.correctIndex };
    });
    
    const score = (correct / quiz.questions.length) * 100;
    
    // Save result
    const result = await prisma.quizResult.create({
      data: {
        userId: req.user.userId,
        quizId: quiz.id,
        score,
        answers: JSON.stringify(answers),
      },
    });
    
    res.json({
      resultId: result.id,
      score,
      correct,
      total: quiz.questions.length,
      passed: score >= 70,
      details: results,
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

// Get user's quiz results
router.get('/:id/results', authMiddleware, async (req, res) => {
  try {
    const results = await prisma.quizResult.findMany({
      where: {
        quizId: req.params.id,
        userId: req.user.userId,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json(results);
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

export default router;
