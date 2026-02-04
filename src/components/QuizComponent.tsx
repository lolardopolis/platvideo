import { useState } from 'react';
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react';

interface Quiz {
  id: string;
  title: string;
  questions: Array<{
    id: string;
    text: string;
    options: string;
    correctIndex: number;
  }>;
}

interface QuizComponentProps {
  quiz: Quiz;
  onRetry: () => void;
}

export function QuizComponent({ quiz, onRetry }: QuizComponentProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (questionId: string, optionIndex: number) => {
    if (submitted) return;
    setAnswers({ ...answers, [questionId]: optionIndex });
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    onRetry();
  };

  const getScore = () => {
    let correct = 0;
    quiz.questions.forEach(q => {
      if (answers[q.id] === q.correctIndex) {
        correct++;
      }
    });
    return correct;
  };

  const allAnswered = quiz.questions.every(q => answers[q.id] !== undefined);

  if (submitted) {
    const score = getScore();
    const percentage = Math.round((score / quiz.questions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div className="text-center py-8">
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${passed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          {passed ? (
            <CheckCircle className="text-green-400" size={40} />
          ) : (
            <XCircle className="text-red-400" size={40} />
          )}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {passed ? '¡Felicitaciones!' : 'Sigue intentando'}
        </h3>
        <p className="text-slate-600 mb-4">
          Obtuviste {score} de {quiz.questions.length} respuestas correctas ({percentage}%)
        </p>
        
        <div className="space-y-4 mt-6 text-left">
          {quiz.questions.map((q, idx) => {
            const options = JSON.parse(q.options) as string[];
            const userAnswer = answers[q.id];
            const isCorrect = userAnswer === q.correctIndex;
            
            return (
              <div key={q.id} className="bg-slate-100/50 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-2">
                  {idx + 1}. {q.text}
                </p>
                <p className={`text-sm ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  Tu respuesta: {options[userAnswer]}
                  {!isCorrect && (
                    <span className="text-slate-600"> → Correcta: {options[q.correctIndex]}</span>
                  )}
                </p>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleRetry}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-slate-900 rounded-lg font-medium transition-colors"
        >
          <RotateCcw size={16} />
          Intentar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">{quiz.title}</h3>
        <p className="text-sm text-slate-600">{quiz.questions.length} preguntas</p>
      </div>

      {quiz.questions.map((question, idx) => {
        const options = JSON.parse(question.options) as string[];
        return (
          <div key={question.id} className="bg-slate-100/50 p-4 rounded-lg">
            <p className="text-sm font-medium text-slate-700 mb-3">
              {idx + 1}. {question.text}
            </p>
            <div className="space-y-2">
              {options.map((option, optIdx) => (
                <button
                  key={optIdx}
                  onClick={() => handleSelect(question.id, optIdx)}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                    answers[question.id] === optIdx
                      ? 'bg-blue-600 text-slate-900'
                      : 'bg-slate-700/50 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <button
        onClick={handleSubmit}
        disabled={!allAnswered}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 rounded-lg font-medium transition-colors"
      >
        Enviar Respuestas
      </button>
    </div>
  );
}
