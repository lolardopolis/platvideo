"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seed...');
    // Create users
    const tutorPassword = await bcryptjs_1.default.hash('tutor123', 10);
    const studentPassword = await bcryptjs_1.default.hash('student123', 10);
    const tutor = await prisma.user.upsert({
        where: { email: 'tutor@classlink.com' },
        update: {},
        create: {
            email: 'tutor@classlink.com',
            password: tutorPassword,
            name: 'Prof. García',
            avatar: 'PG',
            role: 'TUTOR',
        },
    });
    const student1 = await prisma.user.upsert({
        where: { email: 'ana@example.com' },
        update: {},
        create: {
            email: 'ana@example.com',
            password: studentPassword,
            name: 'Ana Martínez',
            avatar: 'AM',
            role: 'STUDENT',
        },
    });
    const student2 = await prisma.user.upsert({
        where: { email: 'carlos@example.com' },
        update: {},
        create: {
            email: 'carlos@example.com',
            password: studentPassword,
            name: 'Carlos Ruíz',
            avatar: 'CR',
            role: 'STUDENT',
        },
    });
    const student3 = await prisma.user.upsert({
        where: { email: 'maria@example.com' },
        update: {},
        create: {
            email: 'maria@example.com',
            password: studentPassword,
            name: 'María López',
            avatar: 'ML',
            role: 'STUDENT',
        },
    });
    console.log('✅ Users created');
    // Create course with scheduling
    const course = await prisma.course.upsert({
        where: { id: 'course-web-dev' },
        update: {},
        create: {
            id: 'course-web-dev',
            title: 'Desarrollo Web Full Stack',
            description: 'Aprende a construir aplicaciones web completas desde cero con React y Node.js.',
            thumbnail: 'https://images.unsplash.com/photo-1593720213428-28a5b9e94613?w=800&q=80',
            category: 'Programación',
            status: 'ACTIVE',
            visibility: 'PUBLIC',
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-06-30'),
            instructorId: tutor.id,
        },
    });
    // Create module
    const module1 = await prisma.module.upsert({
        where: { id: 'module-react-basics' },
        update: {},
        create: {
            id: 'module-react-basics',
            title: 'Fundamentos de React',
            order: 1,
            courseId: course.id,
        },
    });
    const module2 = await prisma.module.upsert({
        where: { id: 'module-node-basics' },
        update: {},
        create: {
            id: 'module-node-basics',
            title: 'Backend con Node.js',
            order: 2,
            courseId: course.id,
        },
    });
    console.log('✅ Course and modules created');
    // Create videos
    const video1 = await prisma.video.upsert({
        where: { id: 'video-hooks-intro' },
        update: {},
        create: {
            id: 'video-hooks-intro',
            title: 'Introducción a React Hooks',
            duration: 750,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
            order: 1,
            moduleId: module1.id,
        },
    });
    const video2 = await prisma.video.upsert({
        where: { id: 'video-usestate' },
        update: {},
        create: {
            id: 'video-usestate',
            title: 'useState en Profundidad',
            duration: 620,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            thumbnail: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800&q=80',
            order: 2,
            moduleId: module1.id,
        },
    });
    console.log('✅ Videos created');
    // Create quiz
    await prisma.quiz.upsert({
        where: { videoId: video1.id },
        update: {},
        create: {
            title: 'Quiz: React Hooks',
            videoId: video1.id,
            questions: {
                create: [
                    {
                        text: '¿Cuál es el propósito principal de useState?',
                        options: JSON.stringify(['Manejar efectos secundarios', 'Manejar estado local', 'Manejar routing', 'Manejar estilos']),
                        correctIndex: 1,
                    },
                    {
                        text: '¿Qué devuelve el hook useState?',
                        options: JSON.stringify(['Solo el valor', 'Solo la función', 'Un array con valor y función', 'Un objeto']),
                        correctIndex: 2,
                    },
                    {
                        text: '¿Dónde se pueden usar los hooks?',
                        options: JSON.stringify(['En cualquier función', 'Solo en componentes de clase', 'Solo en componentes funcionales', 'En el servidor']),
                        correctIndex: 2,
                    },
                ],
            },
        },
    });
    console.log('✅ Quiz created');
    // Create enrollments
    await prisma.enrollment.upsert({
        where: { userId_courseId: { userId: student1.id, courseId: course.id } },
        update: {},
        create: { userId: student1.id, courseId: course.id },
    });
    await prisma.enrollment.upsert({
        where: { userId_courseId: { userId: student2.id, courseId: course.id } },
        update: {},
        create: { userId: student2.id, courseId: course.id },
    });
    await prisma.enrollment.upsert({
        where: { userId_courseId: { userId: student3.id, courseId: course.id } },
        update: {},
        create: { userId: student3.id, courseId: course.id },
    });
    console.log('✅ Enrollments created');
    // Create video progress
    await prisma.videoProgress.upsert({
        where: { userId_videoId: { userId: student1.id, videoId: video1.id } },
        update: {},
        create: { userId: student1.id, videoId: video1.id, watchedSeconds: 600, completed: true },
    });
    await prisma.videoProgress.upsert({
        where: { userId_videoId: { userId: student2.id, videoId: video1.id } },
        update: {},
        create: { userId: student2.id, videoId: video1.id, watchedSeconds: 300, completed: false },
    });
    console.log('✅ Video progress created');
    // Create forums
    const generalForum = await prisma.forum.upsert({
        where: { id: 'forum-general' },
        update: {},
        create: {
            id: 'forum-general',
            name: 'Comunidad General',
            description: 'Discusiones generales, preguntas y networking',
            type: 'GENERAL',
            isPublic: true,
        },
    });
    const courseForum = await prisma.forum.upsert({
        where: { id: 'forum-webdev' },
        update: {},
        create: {
            id: 'forum-webdev',
            name: 'Foro del Curso',
            description: 'Discusiones sobre el curso de Desarrollo Web',
            type: 'COURSE',
            courseId: course.id,
            isPublic: true,
        },
    });
    // Create forum posts
    await prisma.forumPost.upsert({
        where: { id: 'post-welcome' },
        update: {},
        create: {
            id: 'post-welcome',
            title: '¡Bienvenidos al foro!',
            content: 'Este es el espacio para compartir ideas, hacer preguntas y conectar con otros estudiantes. ¡No dudes en participar!',
            authorId: tutor.id,
            forumId: generalForum.id,
            isPinned: true,
        },
    });
    await prisma.forumPost.upsert({
        where: { id: 'post-hooks-question' },
        update: {},
        create: {
            id: 'post-hooks-question',
            title: 'Duda sobre useEffect',
            content: '¿Alguien me puede explicar la diferencia entre useEffect y useLayoutEffect? He leído la documentación pero no me queda claro.',
            authorId: student1.id,
            forumId: courseForum.id,
        },
    });
    console.log('✅ Forums and posts created');
    console.log('🎉 Seed completed successfully!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map