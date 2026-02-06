import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

const router = Router();
const prisma = new PrismaClient();

// Thumbnail upload config
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const thumbnailStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/thumbnails';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `temp-${Date.now()}${ext}`);
  },
});

const uploadThumbnail = multer({ 
  storage: thumbnailStorage, 
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no soportado. Usa JPG, PNG, WebP o GIF.'));
    }
  }
});

// Intro video upload config
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
const introVideoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/intros';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `intro-${Date.now()}${ext}`);
  },
});

const uploadIntroVideo = multer({ 
  storage: introVideoStorage, 
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_VIDEO_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de video no soportado. Usa MP4, WebM o MOV.'));
    }
  }
});

// Upload thumbnail for course
router.post('/upload-thumbnail', authMiddleware, (req, res) => {
  uploadThumbnail.single('thumbnail')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    try {
      const tempPath = req.file.path;
      const finalFilename = `thumbnail-${Date.now()}.jpg`;
      const finalPath = path.join('./uploads/thumbnails', finalFilename);

      // Convert and resize image (max 1920x1080)
      await sharp(tempPath)
        .rotate()
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(finalPath);

      fs.unlinkSync(tempPath);

      const url = `/uploads/thumbnails/${finalFilename}`;
      console.log('✅ Thumbnail uploaded:', url);
      res.json({ url });
    } catch (error) {
      console.error('Upload thumbnail error:', error);
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'Error al procesar imagen' });
    }
  });
});

// Upload intro video for course
router.post('/upload-intro', authMiddleware, (req, res) => {
  uploadIntroVideo.single('video')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún video' });
    }

    try {
      const url = `/uploads/intros/${req.file.filename}`;
      console.log('✅ Intro video uploaded:', url);
      res.json({ url });
    } catch (error) {
      console.error('Upload intro video error:', error);
      res.status(500).json({ error: 'Error al subir video' });
    }
  });
});

// Get all courses
router.get('/', async (req, res) => {
  try {
    const { status, visibility, tags } = req.query;
    const where = { deletedAt: null };
    
    // Default filtering if not logged in
    if (!req.user) {
      where.visibility = 'PUBLIC';
      where.status = 'ACTIVE';
    }

    if (tags) {
      where.tags = { contains: tags };
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        instructor: { select: { id: true, name: true, avatar: true } },
        modules: { include: { videos: true } },
        _count: { select: { enrollments: true, likes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(courses.map((c) => ({
      ...c,
      totalVideos: c.modules.reduce((acc, m) => acc + m.videos.length, 0),
      enrolledCount: c._count.enrollments,
      likes: c._count.likes || 0,
    })));
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get my courses (updated: tutors=created, students=enrolled)
router.get('/my', authMiddleware, async (req, res) => {
  try {
    let courses = [];
    
    if (req.user.role === 'TUTOR' || req.user.role === 'ADMIN') {
      courses = await prisma.course.findMany({
        where: { instructorId: req.user.userId, deletedAt: null },
        include: {
          instructor: { select: { id: true, name: true, avatar: true } },
          modules: { include: { videos: true } },
          _count: { select: { enrollments: true, likes: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: req.user.userId, status: 'ENROLLED' },
        include: {
          course: {
            include: {
              instructor: { select: { id: true, name: true, avatar: true } },
              modules: { include: { videos: true } },
              _count: { select: { enrollments: true, likes: true } },
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
      courses = enrollments.map(e => e.course).filter(c => !c.deletedAt);
    }

    res.json(courses.map((c) => ({
      ...c,
      totalVideos: c.modules.reduce((acc, m) => acc + m.videos.length, 0),
      enrolledCount: c._count.enrollments,
      likes: c._count.likes || 0,
    })));
  } catch (error) {
    console.error('Get my courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get course details
router.get('/:id', async (req, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        instructor: { select: { id: true, name: true, avatar: true } },
        modules: {
          orderBy: { order: 'asc' },
          include: { videos: { orderBy: { order: 'asc' }, include: { resources: true, quiz: { select: { id: true, title: true } } } } },
        },
        staff: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        _count: { select: { enrollments: true, likes: true } },
      },
    });
    if (!course || course.deletedAt) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    res.json(course);
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Create course - allow TUTOR and ADMIN
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userRole = req.user?.role?.toUpperCase();
    if (userRole !== 'TUTOR' && userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Solo tutores pueden crear cursos' });
      return;
    }

    const { title, description, thumbnail, introVideo, category, status, visibility, startDate, endDate, maxEnrollments, enrollmentMode, tags } = req.body;
    const course = await prisma.course.create({
      data: {
        title,
        description,
        thumbnail,
        introVideo,
        category,
        tags, // New field
        status: status || 'ACTIVE',
        visibility: visibility || 'PUBLIC',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        maxEnrollments: maxEnrollments ? parseInt(maxEnrollments.toString()) : null,
        enrollmentMode: enrollmentMode || 'OPEN',
        instructorId: req.user.userId,
      },
      include: { instructor: { select: { id: true, name: true, avatar: true } } },
    });
    console.log('✅ Course created:', course.id);
    res.status(201).json(course);
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Update course
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course || course.deletedAt) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    if (course.instructorId !== req.user.userId && req.user.role.toUpperCase() !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const { title, description, thumbnail, introVideo, category, status, visibility, startDate, endDate, maxEnrollments, enrollmentMode, tags } = req.body;
    const updated = await prisma.course.update({
      where: { id: req.params.id },
      data: {
        title, description, thumbnail, introVideo, category, status, visibility, enrollmentMode, tags,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        maxEnrollments: maxEnrollments ? parseInt(maxEnrollments.toString()) : null,
      },
      include: { instructor: { select: { id: true, name: true, avatar: true } } },
    });
    res.json(updated);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// Delete course
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    if (course.instructorId !== req.user.userId && req.user.role.toUpperCase() !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }
    await prisma.course.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ success: true, message: 'Course moved to trash' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// Enroll to course
router.post('/:id/enroll', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { enrollments: true } } }
    });

    if (!course || course.deletedAt) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.maxEnrollments && course._count.enrollments >= course.maxEnrollments) {
      return res.status(400).json({ error: 'Course is full' });
    }

    // Check if user is already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: req.user.userId, courseId: req.params.id } }
    });

    if (existing) {
       // If user was previously enrolled (or pending), we return the existing enrollment
      return res.json(existing);
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        userId: req.user.userId,
        courseId: req.params.id,
        status: course.enrollmentMode === 'OPEN' ? 'ENROLLED' : 'PENDING',
        message
      }
    });

    res.json(enrollment);
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({ error: 'Failed to enroll' });
  }
});

// Get course leaderboard - calculates real progress based on video completions
router.get('/:id/leaderboard', async (req, res) => {
  try {
    // Get all videos in this course
    const courseWithVideos = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        modules: {
          include: {
            videos: { select: { id: true } }
          }
        },
        enrollments: {
          where: { status: 'ENROLLED' },
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          }
        }
      }
    });

    if (!courseWithVideos) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const allVideoIds = courseWithVideos.modules.flatMap(m => m.videos.map(v => v.id));
    const totalVideos = allVideoIds.length;

    // Calculate progress for each enrolled user
    const leaderboard = await Promise.all(courseWithVideos.enrollments.map(async (enrollment) => {
      if (totalVideos === 0) {
        return { user: enrollment.user, progress: 0, completedVideos: 0, totalVideos: 0 };
      }

      // Count completed videos for this user
      const completedCount = await prisma.videoProgress.count({
        where: {
          userId: enrollment.user.id,
          videoId: { in: allVideoIds },
          completed: true
        }
      });

      const progress = Math.round((completedCount / totalVideos) * 100);
      return { 
        user: enrollment.user, 
        progress,
        completedVideos: completedCount,
        totalVideos
      };
    }));

    // Sort by progress descending
    res.json(leaderboard.sort((a, b) => b.progress - a.progress));
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Modules management
router.post('/:id/modules', authMiddleware, async (req, res) => {
  try {
    const { title } = req.body;
    const course = await prisma.course.findUnique({ where: { id: req.params.id }, include: { modules: true } });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.instructorId !== req.user.userId) return res.status(403).json({ error: 'Not authorized' });

    const module = await prisma.module.create({
      data: {
        title,
        courseId: req.params.id,
        order: course.modules.length + 1,
      }
    });
    res.json(module);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add module' });
  }
});

// ============================================
// FAQ ENDPOINTS
// ============================================

// Get FAQs for a course
router.get('/:id/faqs', async (req, res) => {
  try {
    const faqs = await prisma.courseFAQ.findMany({
      where: { courseId: req.params.id },
      orderBy: { order: 'asc' },
    });
    res.json(faqs);
  } catch (error) {
    console.error('Get FAQs error:', error);
    res.status(500).json({ error: 'Error al obtener FAQs' });
  }
});

// Add FAQ (instructor only)
router.post('/:id/faqs', authMiddleware, async (req, res) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course || course.instructorId !== req.user.userId) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }
    
    const { question, answer } = req.body;
    const faq = await prisma.courseFAQ.create({
      data: { courseId: req.params.id, question, answer },
    });
    res.status(201).json(faq);
  } catch (error) {
    console.error('Add FAQ error:', error);
    res.status(500).json({ error: 'Error al agregar FAQ' });
  }
});

// Update FAQ
router.put('/faqs/:faqId', authMiddleware, async (req, res) => {
  try {
    const faq = await prisma.courseFAQ.findUnique({ 
      where: { id: req.params.faqId },
      include: { course: true },
    });
    if (!faq || faq.course.instructorId !== req.user.userId) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }
    
    const { question, answer, order } = req.body;
    const updated = await prisma.courseFAQ.update({
      where: { id: req.params.faqId },
      data: { question, answer, order },
    });
    res.json(updated);
  } catch (error) {
    console.error('Update FAQ error:', error);
    res.status(500).json({ error: 'Error al actualizar FAQ' });
  }
});

// Delete FAQ
router.delete('/faqs/:faqId', authMiddleware, async (req, res) => {
  try {
    const faq = await prisma.courseFAQ.findUnique({ 
      where: { id: req.params.faqId },
      include: { course: true },
    });
    if (!faq || faq.course.instructorId !== req.user.userId) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }
    
    await prisma.courseFAQ.delete({ where: { id: req.params.faqId } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete FAQ error:', error);
    res.status(500).json({ error: 'Error al eliminar FAQ' });
  }
});

// ============================================
// LIKES ENDPOINTS
// ============================================

// Like a course
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const like = await prisma.courseLike.create({
      data: { userId: req.user.userId, courseId: req.params.id },
    });
    res.status(201).json(like);
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Ya diste like a este curso' });
      return;
    }
    console.error('Like course error:', error);
    res.status(500).json({ error: 'Error al dar like' });
  }
});

// Unlike a course
router.delete('/:id/like', authMiddleware, async (req, res) => {
  try {
    await prisma.courseLike.deleteMany({
      where: { userId: req.user.userId, courseId: req.params.id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Unlike course error:', error);
    res.status(500).json({ error: 'Error al quitar like' });
  }
});

// Get course stats (views and likes)
router.get('/:id/stats', async (req, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        modules: { include: { videos: { select: { id: true } } } },
      },
    });
    
    if (!course) {
      res.status(404).json({ error: 'Curso no encontrado' });
      return;
    }
    
    const videoIds = course.modules.flatMap(m => m.videos.map(v => v.id));
    
    const [enrollments, likesCount, totalViews] = await Promise.all([
      prisma.enrollment.count({ where: { courseId: req.params.id } }),
      prisma.courseLike.count({ where: { courseId: req.params.id } }),
      prisma.videoProgress.count({ where: { videoId: { in: videoIds } } }),
    ]);
    
    res.json({ 
      enrollments, 
      likes: likesCount, 
      views: totalViews,
    });
  } catch (error) {
    console.error('Get course stats error:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Check if user liked a course
router.get('/:id/liked', authMiddleware, async (req, res) => {
  try {
    const like = await prisma.courseLike.findUnique({
      where: { userId_courseId: { userId: req.user.userId, courseId: req.params.id } },
    });
    res.json({ liked: !!like });
  } catch (error) {
    console.error('Check liked error:', error);
    res.status(500).json({ error: 'Error' });
  }
});
export default router;
