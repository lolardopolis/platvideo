import { Play, Clock, Calendar, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface VideoProps {
  id: number;
  title: string;
  author: string;
  thumbnail: string;
  duration: string;
  date: string;
}

export function VideoCard({ id, title, author, thumbnail, duration, date }: VideoProps) {
  return (
    <Link to={`/videos/${id}`}>
        <div className="group relative overflow-hidden rounded-xl bg-white border border-slate-200 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1">
          <div className="aspect-video relative overflow-hidden bg-slate-100">
            <img src={thumbnail} alt={title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <div className="h-12 w-12 rounded-full bg-blue-500/90 flex items-center justify-center text-slate-900 backdrop-blur-sm transform scale-90 group-hover:scale-100 transition-transform shadow-xl">
                    <Play size={20} fill="currentColor" className="ml-1" />
                 </div>
            </div>
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-xs font-medium text-slate-900 flex items-center backdrop-blur-sm">
                <Clock size={12} className="mr-1 text-slate-700" />
                {duration}
            </div>
          </div>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-slate-900 line-clamp-1 group-hover:text-blue-400 transition-colors cursor-pointer">{title}</h3>
            <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                <div className="flex items-center hover:text-slate-700 transition-colors cursor-pointer">
                    <User size={14} className="mr-1.5" />
                    <span>{author}</span>
                </div>
                <div className="flex items-center text-slate-600">
                    <Calendar size={14} className="mr-1.5" />
                    <span>{date}</span>
                </div>
            </div>
          </div>
        </div>
    </Link>
  );
}
