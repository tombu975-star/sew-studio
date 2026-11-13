import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function VideoQuiz({ quiz, previousResult, onSubmit }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const choose = (qIdx, optIdx) => {
    if (result) return;
    setAnswers(a => ({ ...a, [qIdx]: optIdx }));
  };

  const submit = () => {
    const total = quiz.length;
    const score = quiz.reduce((sum, q, i) => sum + (answers[i] === q.correct_index ? 1 : 0), 0);
    const passed = total > 0 && score / total >= 0.7;
    setResult({ score, total, passed });
    onSubmit({ score, total, passed });
  };

  const allAnswered = quiz.every((_, i) => answers[i] !== undefined);

  return (
    <div className="mt-4 border-t border-[#E7E5E4] pt-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-3">Quick Check</p>
      <div className="space-y-4">
        {quiz.map((q, qIdx) => (
          <div key={qIdx}>
            <p className="text-sm text-[#1C1917] font-medium">{qIdx + 1}. {q.question}</p>
            <div className="mt-1.5 space-y-1.5">
              {(q.options || []).map((opt, optIdx) => {
                const selected = answers[qIdx] === optIdx;
                const showCorrect = result && optIdx === q.correct_index;
                const showWrong = result && selected && optIdx !== q.correct_index;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => choose(qIdx, optIdx)}
                    disabled={!!result}
                    className={cn(
                      'w-full flex items-center justify-between text-left text-xs px-3 py-2 rounded-sm border transition',
                      selected && !result && 'border-[#800020] bg-[#800020]/5',
                      !selected && !result && 'border-stone-200 hover:bg-[#FBF9F7]',
                      showCorrect && 'border-[#15803D] bg-[#15803D]/10',
                      showWrong && 'border-red-400 bg-red-50'
                    )}
                  >
                    <span className="text-[#1C1917]">{opt}</span>
                    {showCorrect && <Check className="w-3.5 h-3.5 text-[#15803D]" />}
                    {showWrong && <X className="w-3.5 h-3.5 text-red-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!result ? (
        <Button onClick={submit} disabled={!allAnswered} className="mt-4 bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm h-8 text-xs">Submit Answers</Button>
      ) : (
        <p className={cn('mt-4 text-sm font-medium', result.passed ? 'text-[#15803D]' : 'text-red-600')}>
          Scored {result.score}/{result.total}{result.passed ? ' — well done!' : ' — below the 70% pass mark.'}
        </p>
      )}

      {!result && previousResult && (
        <p className="text-[11px] text-stone-400 mt-2">Last attempt: {previousResult.score}/{previousResult.total} {previousResult.passed ? '(passed)' : '(not passed)'}</p>
      )}
    </div>
  );
}