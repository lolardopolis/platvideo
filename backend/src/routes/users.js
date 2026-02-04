import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authMiddleware } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

const router = Router();
const prisma = new PrismaClient();

// Allowed image formats (web-compatible)
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// Avatar upload config
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/avatars';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `temp-${Date.now()}${ext}`);
  },
});

const uploadAvatar = multer({ 
  storage: avatarStorage, 
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTS.includes(ext) || ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no soportado. Usa JPG, PNG, WebP o GIF. Los archivos HEIC de iPhone no son compatibles.'));
    }
  }
});

// Get all users
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true,
        enrollments: {
          include: { course: { select: { id: true, title: true } } },
        },
      },
    });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user profile by ID (public profile)
router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true,
        enrollments: {
          include: { course: { select: { id: true, title: true, thumbnail: true } } },
        },
      },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    // If user is TUTOR, also get their created courses
    let coursesCreated = [];
    if (user.role === 'TUTOR') {
      coursesCreated = await prisma.course.findMany({
        where: { instructorId: user.id, deletedAt: null },
        select: { 
          id: true, 
          title: true, 
          thumbnail: true,
          _count: { select: { enrollments: true } },
        },
      });
    }
    
    res.json({ ...user, coursesCreated });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});


// Update current user profile
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { name, email } = req.body;

    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, NOT: { id: req.user.userId } },
      });
      if (existing) {
        res.status(400).json({ error: 'Email ya está en uso' });
        return;
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        name: name || undefined,
        email: email || undefined,
      },
      select: { id: true, email: true, name: true, role: true, avatar: true, emailVerified: true },
    });

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Change password
router.put('/me/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      res.status(400).json({ error: 'Contraseña actual incorrecta' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Upload avatar - converts to JPG
router.post('/me/avatar', authMiddleware, (req, res) => {
  uploadAvatar.single('avatar')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const tempPath = req.file.path;
      const finalFilename = `avatar-${Date.now()}.jpg`;
      const finalPath = path.join('./uploads/avatars', finalFilename);

      // Convert image to JPG using sharp
      await sharp(tempPath)
        .rotate() // Auto-rotate based on EXIF
        .resize(400, 400, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toFile(finalPath);

      // Remove temp file
      fs.unlinkSync(tempPath);

      const avatarUrl = `/uploads/avatars/${finalFilename}`;

      const user = await prisma.user.update({
        where: { id: req.user.userId },
        data: { avatar: avatarUrl },
        select: { id: true, email: true, name: true, role: true, avatar: true, emailVerified: true },
      });

      console.log('✅ Avatar uploaded:', avatarUrl);
      res.json(user);
    } catch (error) {
      console.error('Upload avatar error:', error);
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'Error al procesar imagen' });
    }
  });
});

// Get user enrollments with progress
router.get('/:id/enrollments', authMiddleware, async (req, res) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: req.params.id, status: 'ENROLLED' },
      include: {
        course: {
          include: {
            modules: { include: { videos: { select: { id: true } } } },
            instructor: { select: { id: true, name: true } },
          },
        },
      },
    });

    const enrollmentsWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const videoIds = enrollment.course.modules.flatMap((m) => m.videos.map((v) => v.id));
        const completedVideos = await prisma.videoProgress.count({
          where: { userId: req.params.id, videoId: { in: videoIds }, completed: true },
        });
        const totalVideos = videoIds.length;
        return {
          ...enrollment,
          progress: totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0,
          completedVideos,
          totalVideos,
        };
      })
    );

    res.json(enrollmentsWithProgress);
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

export default router;
