import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const video = await prisma.video.findFirst();
if (video) {
  await prisma.video.update({
    where: { id: video.id },
    data: {
      summary: 'En este video aprenderás los conceptos fundamentales de React Hooks, incluyendo useState y useEffect. Cubrimos ejemplos prácticos y buenas prácticas para implementar hooks en tus proyectos.',
      chapters: JSON.stringify([
        { timestamp: 0, title: 'Introducción y objetivos' },
        { timestamp: 60, title: 'useState: Manejo de estado' },
        { timestamp: 180, title: 'useEffect: Efectos secundarios' },
        { timestamp: 300, title: 'Ejemplos prácticos' }
      ])
    }
  });
  console.log('Updated video:', video.id, video.title);
}
await prisma.$disconnect();
