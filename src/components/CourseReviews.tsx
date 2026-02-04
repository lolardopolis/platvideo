import { useState, useEffect } from 'react';
import { Star, User, Loader2, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:3001';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null };
}

interface ReviewsData {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
}

interface Props {
  courseId: string;
  isEnrolled: boolean;
}

export function CourseReviews({ courseId, isEnrolled }: Props) {
  const { token, user } = useAuth();
  const [data, setData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchReviews();
  }, [courseId]);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reviews/course/${courseId}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!token || rating < 1) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/reviews/course/${courseId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ rating, comment: comment || null }),
      });
      if (res.ok) {
        await fetchReviews();
        setShowForm(false);
        setComment('');
      } else {
        const err = await res.json();
        alert(err.error || 'Error al enviar reseña');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const userHasReview = data?.reviews.some(r => r.user.id === user?.id);

  const renderStars = (value: number, interactive = false, size = 16) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            onClick={() => interactive && setRating(star)}
            className={interactive ? 'cursor-pointer' : 'cursor-default'}
          >
            <Star
              size={size}
              className={`transition-colors ${
                star <= (interactive ? (hoverRating || rating) : value)
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-slate-600'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-blue-500" size={24} />
      </div>
    );
  }

  return (
    <div className="bg-white/50 border border-slate-200 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Star className="text-yellow-400" size={20} />
              Reseñas del Curso
            </h2>
            {data && data.totalReviews > 0 && (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-3xl font-bold text-slate-900">{data.averageRating}</span>
                {renderStars(data.averageRating)}
                <span className="text-sm text-slate-600">({data.totalReviews} reseñas)</span>
              </div>
            )}
          </div>
          {isEnrolled && !userHasReview && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg font-medium transition-colors"
            >
              Escribir Reseña
            </button>
          )}
        </div>
      </div>

      {/* Review Form */}
      {showForm && (
        <div className="p-6 border-b border-slate-200 bg-slate-100/30">
          <h3 className="text-lg font-medium text-slate-900 mb-4">Tu Reseña</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-600 mb-2">Calificación</label>
              {renderStars(rating, true, 28)}
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Comentario (opcional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Comparte tu experiencia con el curso..."
                rows={3}
                className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                Enviar Reseña
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="divide-y divide-slate-800">
        {!data || data.reviews.length === 0 ? (
          <div className="p-12 text-center text-slate-600">
            <Star size={48} className="mx-auto mb-4 opacity-20" />
            <p>Aún no hay reseñas para este curso</p>
            {isEnrolled && <p className="text-sm mt-1">¡Sé el primero en dejar una reseña!</p>}
          </div>
        ) : (
          data.reviews.map((review) => (
            <div key={review.id} className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {review.user.avatar ? (
                    <img 
                      src={review.user.avatar.startsWith('/') ? `${API_BASE}${review.user.avatar}` : review.user.avatar} 
                      alt={review.user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={20} className="text-slate-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-medium text-slate-900">{review.user.name}</span>
                    {renderStars(review.rating)}
                  </div>
                  <p className="text-xs text-slate-600 mb-2">
                    {new Date(review.createdAt).toLocaleDateString('es-ES', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                  {review.comment && (
                    <p className="text-slate-700">{review.comment}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
