import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { uploadVideo, uploadResource } from '../middleware/upload.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();

// Get user's watched videos from enrolled courses
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: req.user.userId },
      include: {
        course: {
          include: {
            modules: { include: { videos: true } },
          },
        },
      },
    });
    
    const enrolledVideoIds = enrollments.flatMap(e => 
      e.course.modules.flatMap(m => m.videos.map(v => v.id))
    );
    
    const watchedProgress = await prisma.videoProgress.findMany({
      where: {
        userId: req.user.userId,
        videoId: { in: enrolledVideoIds },
        watchedSeconds: { gt: 0 },
      },
      include: {
        video: {
          include: {
            module: {
              include: {
                course: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    
    const videos = watchedProgress.map(p => ({
      id: p.video.id,
      title: p.video.title,
      thumbnail: p.video.thumbnail,
      duration: p.video.duration,
      videoUrl: p.video.videoUrl,
      watchedSeconds: p.watchedSeconds,
      completed: p.completed,
      course: p.video.module.course,
      module: { id: p.video.module.id, title: p.video.module.title },
      lastWatched: p.updatedAt,
    }));
    
    res.json(videos);
  } catch (error) {
    console.error('Get my videos error:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Upload video
router.post('/', authMiddleware, requireRole('TUTOR', 'ADMIN'), uploadVideo.single('video'), async (req, res) => {
  try {
    const { title, duration, moduleId, order, thumbnail } = req.body;
    
    if (!req.file) {
      res.status(400).json({ error: 'No video file uploaded' });
      return;
    }
    
    const videoUrl = `/uploads/${req.file.filename}`;
    
    const video = await prisma.video.create({
      data: {
        title,
        duration: parseInt(duration, 10) || 0,
        videoUrl,
        thumbnail,
        order: parseInt(order, 10) || 0,
        moduleId,
      },
    });
    
    res.status(201).json(video);
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

// Get video details
router.get('/:id', async (req, res) => {
  try {
    const video = await prisma.video.findUnique({
      where: { id: req.params.id },
      include: {
        resources: true,
        quiz: { include: { questions: true } },
        module: { include: { course: true } },
        comments: {
          where: { deletedAt: null, isHidden: false },
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, avatar: true } },
            replies: {
              where: { deletedAt: null },
              orderBy: { createdAt: "asc" },
              include: { user: { select: { id: true, name: true, avatar: true } } },
            },
          },
        },
      },
    });
    
    if (!video) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }
    
    res.json(video);
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

// Update video progress
router.post('/:id/progress', authMiddleware, async (req, res) => {
  try {
    const { watchedSeconds, completed } = req.body;
    
    const progress = await prisma.videoProgress.upsert({
      where: {
        userId_videoId: {
          userId: req.user.userId,
          videoId: req.params.id,
        },
      },
      update: {
        watchedSeconds: watchedSeconds || undefined,
        completed: completed !== undefined ? completed : undefined,
      },
      create: {
        userId: req.user.userId,
        videoId: req.params.id,
        watchedSeconds: watchedSeconds || 0,
        completed: completed || false,
      },
    });
    
    res.json(progress);
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Add comment
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { text, timestamp, attachmentUrl, parentId, visibility } = req.body;
    
    const comment = await prisma.comment.create({
      data: {
        text,
        timestamp: timestamp || null,
        attachmentUrl: attachmentUrl || null,
        parentId: parentId || null,
        visibility: visibility || "PUBLIC",
        userId: req.user.userId,
        videoId: req.params.id,
      },
      include: {
            user: { select: { id: true, name: true, avatar: true } },
            replies: {
              where: { deletedAt: null },
              orderBy: { createdAt: "asc" },
              include: { user: { select: { id: true, name: true, avatar: true } } },
            },
          },
    });
    
    res.status(201).json(comment);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Delete comment (own or as moderator)
router.delete('/:videoId/comments/:commentId', authMiddleware, async (req, res) => {
  try {
    const { videoId, commentId } = req.params;
    
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        video: {
          include: {
            module: {
              include: {
                course: {
                  include: { staff: true },
                },
              },
            },
          },
        },
      },
    });
    
    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }
    
    const isOwner = comment.userId === req.user.userId;
    const isInstructor = comment.video.module.course.instructorId === req.user.userId;
    const isStaff = comment.video.module.course.staff.some(s => s.userId === req.user.userId);
    const isAdmin = req.user.role === 'ADMIN';
    
    if (!isOwner && !isInstructor && !isStaff && !isAdmin) {
      res.status(403).json({ error: 'Not authorized to delete this comment' });
      return;
    }
    
    // Soft delete
    await prisma.comment.update({
      where: { id: commentId },
      data: {
        deletedAt: new Date(),
        deletedBy: req.user.userId,
      },
    });
    
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Pin/Unpin comment (tutor only)
router.post('/:videoId/comments/:commentId/pin', authMiddleware, async (req, res) => {
  try {
    const { videoId, commentId } = req.params;
    
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { module: { include: { course: { include: { staff: true } } } } },
    });
    
    if (!video) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }
    
    const isInstructor = video.module.course.instructorId === req.user.userId;
    const isStaff = video.module.course.staff.some(s => s.userId === req.user.userId);
    
    if (!isInstructor && !isStaff) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }
    
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    
    await prisma.comment.update({
      where: { id: commentId },
      data: { isPinned: !comment?.isPinned },
    });
    
    res.json({ success: true, pinned: !comment?.isPinned });
  } catch (error) {
    console.error('Pin comment error:', error);
    res.status(500).json({ error: 'Failed to pin comment' });
  }
});

// Add note
router.post('/:id/notes', authMiddleware, async (req, res) => {
  try {
    const { text, timestamp, attachmentUrl, parentId, visibility } = req.body;
    
    const note = await prisma.note.create({
      data: {
        text,
        timestamp: timestamp || 0,
        userId: req.user.userId,
        videoId: req.params.id,
      },
    });
    
    res.status(201).json(note);
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// Get user's notes for video
router.get('/:id/notes', authMiddleware, async (req, res) => {
  try {
    const notes = await prisma.note.findMany({
      where: {
        videoId: req.params.id,
        userId: req.user.userId,
      },
      orderBy: { timestamp: 'asc' },
    });
    
    res.json(notes);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Delete video
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const video = await prisma.video.findUnique({
      where: { id: req.params.id },
      include: { module: { include: { course: true } } },
    });
    
    if (!video) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }
    
    const isInstructor = video.module.course.instructorId === req.user.userId;
    const isAdmin = req.user.role === 'ADMIN';
    
    if (!isInstructor && !isAdmin) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }
    
    await prisma.video.delete({ where: { id: req.params.id } });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});


// ============================================
// RESOURCES ENDPOINTS
// ============================================

// Get resources for a video
router.get('/:id/resources', async (req, res) => {
  try {
    const resources = await prisma.resource.findMany({
      where: { videoId: req.params.id },
      orderBy: { id: 'asc' },
    });
    
    res.json(resources);
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// Upload resource to a video
router.post('/:id/resources', authMiddleware, requireRole('TUTOR', 'ADMIN'), uploadResource.single('file'), async (req, res) => {
  try {
    const { title, type } = req.body;
    const videoId = req.params.id;
    
    // Verify video exists and user has permission
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { module: { include: { course: true } } },
    });
    
    if (!video) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }
    
    const isInstructor = video.module.course.instructorId === req.user.userId;
    const isAdmin = req.user.role === 'ADMIN';
    
    if (!isInstructor && !isAdmin) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }
    
    let url = req.body.url || '';
    
    if (req.file) {
      url = `/uploads/${req.file.filename}`;
    }
    
    if (!url) {
      res.status(400).json({ error: 'No file or URL provided' });
      return;
    }
    
    const resource = await prisma.resource.create({
      data: {
        title: title || req.file?.originalname || 'Recurso',
        type: type || getFileType(req.file?.mimetype || ''),
        url,
        videoId,
      },
    });
    
    res.status(201).json(resource);
  } catch (error) {
    console.error('Upload resource error:', error);
    res.status(500).json({ error: 'Failed to upload resource' });
  }
});

// Delete resource
router.delete('/:videoId/resources/:resourceId', authMiddleware, async (req, res) => {
  try {
    const { videoId, resourceId } = req.params;
    
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        video: {
          include: {
            module: { include: { course: true } },
          },
        },
      },
    });
    
    if (!resource) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    
    const isInstructor = resource.video.module.course.instructorId === req.user.userId;
    const isAdmin = req.user.role === 'ADMIN';
    
    if (!isInstructor && !isAdmin) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }
    
    await prisma.resource.delete({ where: { id: resourceId } });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete resource error:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

// Helper function to determine file type
function getFileType(mimetype) {
  if (mimetype.includes('pdf')) return 'PDF';
  if (mimetype.includes('word') || mimetype.includes('document')) return 'DOC';
  if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'EXCEL';
  if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return 'PPT';
  if (mimetype.includes('image')) return 'IMAGE';
  if (mimetype.includes('video')) return 'VIDEO';
  if (mimetype.includes('audio')) return 'AUDIO';
  if (mimetype.includes('zip') || mimetype.includes('archive')) return 'ZIP';
  return 'FILE';
}


// Get watch history (recently watched videos)
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const history = await prisma.videoProgress.findMany({
      where: { userId: req.user.userId },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        video: {
          include: {
            module: {
              include: {
                course: { select: { id: true, title: true, thumbnail: true } }
              }
            }
          }
        }
      }
    });
    
    res.json(history.map(h => ({
      videoId: h.video.id,
      videoTitle: h.video.title,
      thumbnail: h.video.thumbnail,
      duration: h.video.duration,
      watchedSeconds: h.watchedSeconds,
      completed: h.completed,
      lastWatched: h.updatedAt,
      courseId: h.video.module.course.id,
      courseTitle: h.video.module.course.title,
    })));
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Get bookmarks for a video
router.get('/:id/bookmarks', authMiddleware, async (req, res) => {
  try {
    const bookmarks = await prisma.videoBookmark.findMany({
      where: { videoId: req.params.id, userId: req.user.userId },
      orderBy: { timestamp: 'asc' },
    });
    res.json(bookmarks);
  } catch (error) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

// Add bookmark
router.post('/:id/bookmarks', authMiddleware, async (req, res) => {
  try {
    const { timestamp, note } = req.body;
    const bookmark = await prisma.videoBookmark.create({
      data: {
        userId: req.user.userId,
        videoId: req.params.id,
        timestamp: parseInt(timestamp),
        note: note || null,
      },
    });
    res.status(201).json(bookmark);
  } catch (error) {
    console.error('Add bookmark error:', error);
    res.status(500).json({ error: 'Failed to add bookmark' });
  }
});

// Delete bookmark
router.delete('/bookmarks/:bookmarkId', authMiddleware, async (req, res) => {
  try {
    await prisma.videoBookmark.deleteMany({
      where: { id: req.params.bookmarkId, userId: req.user.userId },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete bookmark error:', error);
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

// Like a video
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const like = await prisma.videoLike.create({
      data: { userId: req.user.userId, videoId: req.params.id },
    });
    res.status(201).json(like);
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Ya diste like a este video' });
      return;
    }
    console.error('Like video error:', error);
    res.status(500).json({ error: 'Error al dar like' });
  }
});

// Unlike a video
router.delete('/:id/like', authMiddleware, async (req, res) => {
  try {
    await prisma.videoLike.deleteMany({
      where: { userId: req.user.userId, videoId: req.params.id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Unlike video error:', error);
    res.status(500).json({ error: 'Error al quitar like' });
  }
});

// Get video stats (views and likes)
router.get('/:id/stats', async (req, res) => {
  try {
    const [viewsCount, likesCount] = await Promise.all([
      prisma.videoProgress.count({ where: { videoId: req.params.id } }),
      prisma.videoLike.count({ where: { videoId: req.params.id } }),
    ]);
    res.json({ views: viewsCount, likes: likesCount });
  } catch (error) {
    console.error('Get video stats error:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Upload video attachment for comments
const commentVideoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/comment-videos';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `comment-${Date.now()}${ext}`);
  },
});

const uploadCommentVideo = multer({ 
  storage: commentVideoStorage, 
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten videos MP4, WebM o MOV'));
    }
  }
});

router.post('/upload-comment-video', authMiddleware, (req, res) => {
  uploadCommentVideo.single('video')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún video' });
    }
    const url = `/uploads/comment-videos/${req.file.filename}`;
    console.log('✅ Comment video uploaded:', url);
    res.json({ url });
  });
});

export default router;
