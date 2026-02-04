import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, BookOpen, PlayCircle, User, Loader2 } from 'lucide-react';

const API_BASE = 'http://localhost:3001';

interface SearchResult {
  courses: { id: string; title: string; thumbnail: string; category: string; type: string }[];
  videos: { id: string; title: string; thumbnail: string; duration: number; courseId: string; type: string }[];
  users: { id: string; name: string; avatar: string; role: string; type: string }[];
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (query.length < 2) {
        setResults(null);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const hasResults = results && (results.courses.length > 0 || results.videos.length > 0 || results.users.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar cursos, videos, usuarios... (⌘K)"
          className="w-full pl-10 pr-10 py-2 bg-slate-100 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults(null); }} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X size={14} className="text-slate-600 hover:text-slate-900" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-white border border-slate-300 rounded-xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-blue-500" size={24} />
            </div>
          ) : !hasResults ? (
            <div className="py-8 text-center text-slate-600">
              <Search size={24} className="mx-auto mb-2 opacity-50" />
              <p>No se encontraron resultados</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {/* Courses */}
              {results.courses.length > 0 && (
                <div className="p-2">
                  <p className="text-xs text-slate-600 px-2 py-1">Cursos</p>
                  {results.courses.map(course => (
                    <Link
                      key={course.id}
                      to={`/courses/${course.id}`}
                      onClick={() => { setIsOpen(false); setQuery(''); }}
                      className="flex items-center gap-3 px-2 py-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <BookOpen size={16} className="text-blue-400" />
                      <span className="text-sm text-slate-900 truncate">{course.title}</span>
                      <span className="text-xs text-slate-600 ml-auto">{course.category}</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Videos */}
              {results.videos.length > 0 && (
                <div className="p-2">
                  <p className="text-xs text-slate-600 px-2 py-1">Videos</p>
                  {results.videos.map(video => (
                    <Link
                      key={video.id}
                      to={`/videos/${video.id}`}
                      onClick={() => { setIsOpen(false); setQuery(''); }}
                      className="flex items-center gap-3 px-2 py-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <PlayCircle size={16} className="text-purple-400" />
                      <span className="text-sm text-slate-900 truncate">{video.title}</span>
                      <span className="text-xs text-slate-600 ml-auto">
                        {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Users */}
              {results.users.length > 0 && (
                <div className="p-2">
                  <p className="text-xs text-slate-600 px-2 py-1">Usuarios</p>
                  {results.users.map(user => (
                    <Link
                      key={user.id}
                      to={`/profile/${user.id}`}
                      onClick={() => { setIsOpen(false); setQuery(''); }}
                      className="flex items-center gap-3 px-2 py-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                        {user.avatar?.startsWith('/') ? (
                          <img src={`${API_BASE}${user.avatar}`} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={12} className="text-slate-600" />
                        )}
                      </div>
                      <span className="text-sm text-slate-900 truncate">{user.name}</span>
                      <span className="text-xs text-slate-600 ml-auto">{user.role === 'TUTOR' ? 'Tutor' : 'Estudiante'}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
