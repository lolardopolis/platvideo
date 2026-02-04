import type { Conversation } from '../types';

export interface QuizQuestion {
    id: string;
    text: string;
    options: string[];
    correctIndex: number;
}

export interface Quiz {
    id: string;
    title: string;
    questions: QuizQuestion[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  totalVideos: number;
  thumbnail: string;
  category: string;
}

export interface Resource {
    id: string;
    title: string;
    type: 'pdf' | 'link' | 'code';
    url: string;
}

export interface VideoItem {
  id: string;
  title: string;
  duration: string;
  thumbnail: string;
  resources?: Resource[];
  quiz?: Quiz;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  videos: VideoItem[];
}

export const MOCK_COURSES: Course[] = [
  {
    id: 'c1',
    title: 'Desarrollo Web Full Stack',
    description: 'Aprende a construir aplicaciones web completas desde cero con React y Node.js.',
    instructor: 'Prof. García',
    totalVideos: 24,
    thumbnail: 'https://images.unsplash.com/photo-1593720213428-28a5b9e94613?w=800&q=80',
    category: 'Programación'
  },
  {
    id: 'c2',
    title: 'Diseño UX/UI Moderno',
    description: 'Domina los principios del diseño de interfaces y experiencia de usuario.',
    instructor: 'Dra. Lolas',
    totalVideos: 18,
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80',
    category: 'Diseño'
  },
  {
    id: 'c3',
    title: 'Introducción a Data Science',
    description: 'Analiza datos y crea modelos predictivos con Python y Pandas.',
    instructor: 'Ing. Perez',
    totalVideos: 30,
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    category: 'Data Science'
  },
  {
    id: 'c4',
    title: 'Marketing Digital Avanzado',
    description: 'Estrategias de SEO, SEM y redes sociales para potenciar tu marca.',
    instructor: 'Lic. Torres',
    totalVideos: 15,
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    category: 'Marketing'
  }
];

export const MOCK_MODULES: CourseModule[] = [
  {
    id: 'm1',
    courseId: 'c1',
    title: 'Fundamentos de React',
    videos: [
      { 
        id: '1', 
        title: 'Introducción a React Hooks', 
        duration: '12:30', 
        thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
        resources: [
            { id: 'r1', title: 'Hoja de trucos React Hooks', type: 'pdf', url: '#' }
        ],
        quiz: {
            id: 'q1',
            title: 'Evaluación: React Hooks',
            questions: [
                {
                    id: 'qq1',
                    text: '¿Cuál es la regla principal de los Hooks?',
                    options: ['Solo llamarlos en el nivel superior', 'Se pueden usar en ciclos', 'Solo dentro de clases', 'No tienen reglas'],
                    correctIndex: 0
                },
                {
                    id: 'qq2',
                    text: '¿Qué Hook reemplaza a componentDidMount?',
                    options: ['useState', 'useReducer', 'useEffect', 'useMemo'],
                    correctIndex: 2
                }
            ]
        }
      },
      { 
        id: '2', 
        title: 'Componentes y Props', 
        duration: '15:45', 
        thumbnail: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800&q=80',
        resources: [
             { id: 'r2', title: 'Código fuente del proyecto', type: 'code', url: '#' }
        ]
      },
      { id: '3', title: 'Estado y Ciclo de Vida', duration: '20:10', thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80' }
    ]
  },
  {
    id: 'm2',
    courseId: 'c1',
    title: 'Navegación y Rutas',
    videos: [
      { 
          id: '4', 
          title: 'React Router Dom', 
          duration: '18:20', 
          thumbnail: 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?w=800&q=80',
          resources: [
             { id: 'r3', title: 'Documentación Oficial React Router', type: 'link', url: 'https://reactrouter.com' }
          ]
      },
      { id: '5', title: 'Layouts y Outlets', duration: '14:50', thumbnail: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&q=80' }
    ]
  },
   {
    id: 'm3',
    courseId: 'c2',
    title: 'Fundamentos de UX',
    videos: [
      { id: '6', title: 'Psicología del Color', duration: '10:15', thumbnail: 'https://images.unsplash.com/photo-1586717791821-3f44a5638d48?w=800&q=80' },
      { id: '7', title: 'Tipografía y Jerarquía', duration: '16:40', thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80' }
    ]
  }
];

export interface Student {
    id: string;
    name: string;
    avatar: string;
    email: string;
    enrolledCourseIds: string[];
    progress: Record<string, number>; // courseId -> percentage
}

export const MOCK_STUDENTS: Student[] = [
    { 
        id: 's1', 
        name: 'Ana Martínez', 
        avatar: 'AM', 
        email: 'ana.martinez@example.com', 
        enrolledCourseIds: ['c1', 'c2'],
        progress: { 'c1': 75, 'c2': 20 }
    },
    { 
        id: 's2', 
        name: 'Carlos Ruíz', 
        avatar: 'CR', 
        email: 'carlos.ruiz@example.com', 
        enrolledCourseIds: ['c1'],
        progress: { 'c1': 45 }
    },
    { 
        id: 's3', 
        name: 'Juan Pérez', 
        avatar: 'JP', 
        email: 'juan.perez@example.com', 
        enrolledCourseIds: ['c2', 'c3'],
        progress: { 'c2': 90, 'c3': 10 }
    },
    { 
        id: 's4', 
        name: 'Maria Lopez', 
        avatar: 'ML', 
        email: 'maria.lopez@example.com', 
        enrolledCourseIds: ['c1', 'c4'],
        progress: { 'c1': 15, 'c4': 0 }
    },
    { 
        id: 's5', 
        name: 'Pedro Diaz', 
        avatar: 'PD', 
        email: 'pedro.diaz@example.com', 
        enrolledCourseIds: ['c3'],
        progress: { 'c3': 60 }
    }
];

export const MOCK_CONVERSATIONS: Conversation[] = [
    {
        id: 'conv1',
        participantId: 's1',
        participantName: 'Ana Martínez',
        participantAvatar: 'AM',
        participantRole: 'student',
        lastMessage: 'Gracias por la aclaración, profesor.',
        lastMessageTime: '10:30 AM',
        unreadCount: 0,
        messages: [
            { id: 'm1', senderId: 'me', text: 'Hola Ana, ¿cómo vas con el módulo de React?', timestamp: ' вчера 15:00', read: true },
            { id: 'm2', senderId: 's1', text: 'Bien, pero tenía una duda con los Hooks.', timestamp: 'ayer 15:30', read: true },
            { id: 'm3', senderId: 'me', text: 'Dime, ¿en qué te puedo ayudar?', timestamp: 'ayer 15:35', read: true },
            { id: 'm4', senderId: 's1', text: 'Gracias por la aclaración, profesor.', timestamp: '10:30 AM', read: true }
        ]
    },
    {
        id: 'conv2',
        participantId: 's3',
        participantName: 'Juan Pérez',
        participantAvatar: 'JP',
        participantRole: 'student',
        lastMessage: '¿Cuándo estará disponible el siguiente módulo?',
        lastMessageTime: 'Ayer',
        unreadCount: 1,
        messages: [
             { id: 'm1', senderId: 's3', text: 'Hola, ¿Cuándo estará disponible el siguiente módulo?', timestamp: 'Ayer', read: false }
        ]
    }
];

// Extra students for leaderboard
export const EXTRA_STUDENTS: Student[] = [
    { id: 's6', name: 'Valentina Soto', avatar: 'VS', email: 'v.soto@example.com', enrolledCourseIds: ['c1'], progress: { 'c1': 95 } },
    { id: 's7', name: 'Diego Herrera', avatar: 'DH', email: 'd.herrera@example.com', enrolledCourseIds: ['c1'], progress: { 'c1': 88 } },
    { id: 's8', name: 'Camila Rojas', avatar: 'CR', email: 'c.rojas@example.com', enrolledCourseIds: ['c1'], progress: { 'c1': 65 } },
    { id: 's9', name: 'Felipe Castro', avatar: 'FC', email: 'f.castro@example.com', enrolledCourseIds: ['c1'], progress: { 'c1': 40 } },
    { id: 's10', name: 'Sofia Vargas', avatar: 'SV', email: 's.vargas@example.com', enrolledCourseIds: ['c1'], progress: { 'c1': 82 } },
];

MOCK_STUDENTS.push(...EXTRA_STUDENTS);
