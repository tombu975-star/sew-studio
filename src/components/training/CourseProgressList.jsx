import React, { useState } from 'react';
import { Check, Circle, CircleDot, Video, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AtelierCard from '@/components/AtelierCard';
import VideoQuiz from '@/components/training/VideoQuiz';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUS_STYLES = {
  'Not Started': 'bg-stone-100 text-stone-500 border-stone-200',
  'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
  Completed: 'bg-[#15803D]/10 text-[#15803D] border-[#15803D]/30',
};

const STATUS_ICON = {
  'Not Started': Circle,
  'In Progress': CircleDot,
  Completed: Check,
};

export default function CourseProgressList({ courses, progressMap, onStatusChange, onQuizComplete }) {
  const [playing, setPlaying] = useState(null);
  const [playingCourseId, setPlayingCourseId] = useState(null);

  if (courses.length === 0) {
    return (
      <AtelierCard title="Skill Modules">
        <p className="text-sm text-stone-400 py-6 text-center">No skill modules set up yet.</p>
      </AtelierCard>
    );
  }

  const completedCount = courses.filter(c => (progressMap[c.id]?.status || 'Not Started') === 'Completed').length;

  return (
    <AtelierCard title="Skill Modules" action={<span className="text-[11px] text-stone-400">{completedCount} of {courses.length} completed</span>}>
      <div className="divide-y divide-[#E7E5E4]">
        {courses.map(course => {
          const status = progressMap[course.id]?.status || 'Not Started';
          const Icon = STATUS_ICON[status];
          return (
            <div key={course.id} className="py-3.5 flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${STATUS_STYLES[status]}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1C1917]">{course.name}</p>
                {course.description && <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{course.description}</p>}
                {course.videos?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {course.videos.map((v, i) => {
                      const result = (progressMap[course.id]?.quiz_results || []).slice().reverse().find(r => r.video_title === v.title);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => { setPlaying(v); setPlayingCourseId(course.id); }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-[#800020] bg-[#800020]/5 border border-[#800020]/20 rounded-sm hover:bg-[#800020]/10"
                        >
                          <Video className="w-3 h-3" /> {v.title}
                          {v.quiz?.length > 0 && (
                            result
                              ? <Check className={`w-3 h-3 ${result.passed ? 'text-[#15803D]' : 'text-red-500'}`} />
                              : <HelpCircle className="w-3 h-3 text-amber-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <Select value={status} onValueChange={v => onStatusChange(course.id, v)}>
                <SelectTrigger className="w-36 h-8 rounded-sm text-xs shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Started">Not Started</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
      <Dialog open={!!playing} onOpenChange={v => !v && (setPlaying(null), setPlayingCourseId(null))}>
        <DialogContent className="rounded-sm max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-xl">{playing?.title}</DialogTitle></DialogHeader>
          {playing?.url && (
            <video src={playing.url} controls autoPlay className="w-full rounded-sm bg-black max-h-[60vh]" />
          )}
          {playing?.quiz?.length > 0 && (
            <VideoQuiz
              quiz={playing.quiz}
              previousResult={(progressMap[playingCourseId]?.quiz_results || []).slice().reverse().find(r => r.video_title === playing.title)}
              onSubmit={(res) => onQuizComplete?.(playingCourseId, playing.title, res)}
            />
          )}
        </DialogContent>
      </Dialog>
    </AtelierCard>
  );
}