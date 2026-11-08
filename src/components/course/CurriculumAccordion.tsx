import React from 'react';
import { LessonPreview } from '../../types';
import { PlayCircle, Lock } from 'lucide-react';

interface CurriculumProps {
  lessons: LessonPreview[];
  isEnrolled: boolean;
  onSelectLesson?: (lessonId: string) => void;
  activeLessonId?: string;
  completedLessonIds?: Set<string>;
}

export const CurriculumAccordion: React.FC<CurriculumProps> = ({
  lessons,
  isEnrolled,
  onSelectLesson,
  activeLessonId,
  completedLessonIds = new Set(),
}) => {
  if (!lessons || lessons.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
        No curriculum lessons published yet. Check back soon!
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
      {lessons.map((lesson, index) => {
        const isCompleted = completedLessonIds.has(lesson.id);
        const isActive = activeLessonId === lesson.id;

        return (
          <div
            key={lesson.id}
            onClick={() => {
              if (isEnrolled && onSelectLesson) {
                onSelectLesson(lesson.id);
              }
            }}
            className={`flex items-center justify-between p-4 transition-colors ${
              isEnrolled ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'
            } ${isActive ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : ''}`}
          >
            <div className="flex items-center space-x-3.5 min-w-0 pr-2">
              <span className="text-xs font-semibold text-slate-400 w-5 text-right flex-shrink-0">
                {index + 1}
              </span>

              {isEnrolled ? (
                <PlayCircle
                  className={`w-5 h-5 flex-shrink-0 ${
                    isActive
                      ? 'text-indigo-600'
                      : isCompleted
                      ? 'text-emerald-500'
                      : 'text-slate-400'
                  }`}
                />
              ) : (
                <Lock className="w-4 h-4 flex-shrink-0 text-slate-400" />
              )}

              <span
                className={`text-sm truncate ${
                  isActive
                    ? 'font-bold text-indigo-900'
                    : isCompleted
                    ? 'text-slate-700 font-medium'
                    : 'text-slate-800'
                }`}
              >
                {lesson.title}
              </span>
            </div>

            <div className="flex items-center space-x-2 text-xs flex-shrink-0">
              {isEnrolled && isCompleted && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700">
                  Completed
                </span>
              )}
              {!isEnrolled && (
                <span className="text-slate-400 text-xs italic">
                  Enrolled only
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
