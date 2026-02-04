import { Users, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Course } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

interface CourseCardProps {
  course: Course;
  enrolled?: boolean;
}

export function CourseCard({ course, enrolled }: CourseCardProps) {
  const { enroll } = useAuth();
  const progressPercent = 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-500/30 transition-all hover:shadow-lg hover:shadow-blue-500/5 flex flex-col h-full">
      <div className="h-40 bg-slate-100 relative overflow-hidden group">
        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-slate-900 border border-white/10">
            {course.category}
        </div>
      </div>
      
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-1" title={course.title}>{course.title}</h3>
        <p className="text-sm text-slate-600 mb-4 line-clamp-2 flex-1">{course.description}</p>
        
        <div className="flex items-center gap-4 text-xs text-slate-600 mb-4">
            <div className="flex items-center gap-1">
                <Users size={14} />
                {course.instructor}
            </div>
            <div className="flex items-center gap-1">
                <PlayCircle size={14} />
                {course.totalVideos} videos
            </div>
        </div>

        {enrolled ? (
            <div className="mt-auto space-y-2">
                <div className="flex justify-between text-xs text-slate-700">
                    <span>Progreso</span>
                    <span>{progressPercent}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progressPercent}%` }} />
                </div>
                <Link 
                  to={`/courses/${course.id}`}
                  className="mt-3 block w-full text-center py-2 bg-blue-600 hover:bg-blue-500 text-slate-900 text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                >
                  Continuar
                </Link>
            </div>
        ) : (
            <button 
                onClick={() => enroll(course.id)}
                className="mt-auto py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-medium rounded-lg transition-colors"
            >
                Inscribirse
            </button>
        )}
      </div>
    </div>
  );
}
