import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { courseService } from '../../services/courseService';
import { lessonService } from '../../services/lessonService';
import { enrollmentService } from '../../services/enrollmentService';
import { Course, Lesson, LessonProgress } from '../../types';
import {
  CheckCircle,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Lock,
  ArrowLeft,
} from 'lucide-react';

export const CoursePlayerPage: React.FC = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [progressMap, setProgressMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [updatingProgress, setUpdatingProgress] = useState(false);

  useEffect(() => {
    if (!courseId || !user) return;

    setLoading(true);

    // 1. Verify enrollment or admin permission
    enrollmentService.checkEnrollment(user.id, courseId).then(({ isEnrolled }) => {
      if (!isEnrolled && !isAdmin) {
        // Deny access: non-enrolled user
        navigate(`/courses/${courseId}`, { replace: true });
        return;
      }

      // 2. Load course and full lessons
      Promise.all([
        courseService.getCourseById(courseId),
        lessonService.getLessonsForCourse(courseId),
        lessonService.getCourseProgress(user.id, courseId),
      ]).then(([cRes, lRes, pRes]) => {
        if (cRes.data) setCourse(cRes.data);
        if (lRes.data) {
          setLessons(lRes.data);
          // Find first uncompleted lesson if any
          if (pRes.data && pRes.data.length > 0) {
            const pMap: Record<string, boolean> = {};
            pRes.data.forEach((p: LessonProgress) => {
              pMap[p.lesson_id] = p.completed;
            });
            setProgressMap(pMap);

            const firstUncompletedIndex = lRes.data.findIndex((l) => !pMap[l.id]);
            if (firstUncompletedIndex !== -1) {
              setCurrentLessonIndex(firstUncompletedIndex);
            }
          }
        }
        setLoading(false);
      });
    });
  }, [courseId, user, isAdmin, navigate]);

  const currentLesson: Lesson | undefined = lessons[currentLessonIndex];

  // Calculated Progress
  const totalLessons = lessons.length;
  const completedCount = useMemo(() => {
    return lessons.filter((l) => progressMap[l.id]).length;
  }, [lessons, progressMap]);

  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const handleToggleCompletion = async () => {
    if (!currentLesson || !user || updatingProgress) return;

    const newStatus = !progressMap[currentLesson.id];
    setUpdatingProgress(true);

    const { error } = await lessonService.toggleLessonProgress(
      user.id,
      currentLesson.id,
      newStatus
    );

    setUpdatingProgress(false);

    if (!error) {
      setProgressMap((prev) => ({
        ...prev,
        [currentLesson.id]: newStatus,
      }));
    }
  };

  /**
   * Embed parser for video URLs: YouTube, Vimeo, or direct video file
   */
  const renderVideoPlayer = (url: string | null) => {
    if (!url) {
      return (
        <div className="aspect-video w-full bg-slate-900 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
          <PlayCircle className="w-16 h-16 text-slate-600 mb-3" />
          <p className="text-base font-semibold text-slate-300">No video attached to this lesson.</p>
          <p className="text-xs text-slate-500 mt-1">Read the lesson notes and instructions below.</p>
        </div>
      );
    }

    // YouTube support
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch) {
      const videoId = ytMatch[1];
      return (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
            title={currentLesson?.title || 'Lesson Video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          ></iframe>
        </div>
      );
    }

    // Vimeo support
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
      const vimeoId = vimeoMatch[1];
      return (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}`}
            title={currentLesson?.title || 'Lesson Video'}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          ></iframe>
        </div>
      );
    }

    // Direct MP4/WebM or Supabase Storage signed URL
    return (
      <div className="aspect-video w-full bg-black flex items-center justify-center">
        <video
          key={url}
          controls
          controlsList="nodownload"
          className="w-full h-full"
          src={url}
        >
          Your browser does not support HTML5 video streaming.
        </video>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
          <p className="text-sm text-slate-400">Loading lesson workspace...</p>
        </div>
      </div>
    );
  }

  if (!course || lessons.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center px-4">
        <Lock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-slate-800">No lessons available yet</h2>
        <p className="mt-2 text-sm text-slate-500">
          The instructor has not published lessons for this course yet.
        </p>
        <Link
          to={`/courses/${courseId}`}
          className="mt-6 inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Course Overview
        </Link>
      </div>
    );
  }

  const isCurrentCompleted = currentLesson ? Boolean(progressMap[currentLesson.id]) : false;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between text-white flex-shrink-0">
        <div className="flex items-center space-x-4">
          <Link
            to="/my-courses"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Back to My Courses"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-sm font-bold truncate max-w-xs sm:max-w-md lg:max-w-xl">
            {course.title}
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          {/* Progress Indicator */}
          <div className="hidden sm:flex items-center space-x-2 text-xs">
            <span className="text-slate-400">{completedCount}/{totalLessons} completed</span>
            <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <span className="font-semibold text-emerald-400">{progressPercent}%</span>
          </div>

          {/* Toggle Sidebar Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Toggle Lesson Curriculum"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Video & Lesson Area */}
        <div className="flex-1 overflow-y-auto bg-slate-900">
          <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Video Player */}
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-black">
              {renderVideoPlayer(currentLesson?.video_url ?? null)}
            </div>

            {/* Lesson Control & Details */}
            {currentLesson && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                      Lesson {currentLessonIndex + 1} of {totalLessons}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                      {currentLesson.title}
                    </h2>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleToggleCompletion}
                      disabled={updatingProgress}
                      className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                        isCurrentCompleted
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      <CheckCircle className={`w-4 h-4 mr-2 ${isCurrentCompleted ? 'text-emerald-400' : 'text-white'}`} />
                      <span>{isCurrentCompleted ? 'Completed' : 'Mark as Complete'}</span>
                    </button>
                  </div>
                </div>

                {/* Lesson Description / Notes */}
                <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/60 text-slate-300 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Lesson Overview
                  </h3>
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {currentLesson.description || 'No additional notes provided for this lesson.'}
                  </p>
                </div>

                {/* Bottom Navigation (Prev / Next) */}
                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={() => setCurrentLessonIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentLessonIndex === 0}
                    className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous Lesson
                  </button>

                  <button
                    onClick={() => setCurrentLessonIndex((prev) => Math.min(totalLessons - 1, prev + 1))}
                    disabled={currentLessonIndex === totalLessons - 1}
                    className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
                  >
                    Next Lesson
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Curriculum List */}
        {sidebarOpen && (
          <aside className="w-80 md:w-96 bg-slate-950 border-l border-slate-800 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Course Curriculum</h3>
              <p className="text-xs text-slate-400 mt-1">
                {completedCount} of {totalLessons} completed ({progressPercent}%)
              </p>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80">
              {lessons.map((lesson, idx) => {
                const isActive = idx === currentLessonIndex;
                const isCompleted = Boolean(progressMap[lesson.id]);

                return (
                  <button
                    key={lesson.id}
                    onClick={() => setCurrentLessonIndex(idx)}
                    className={`w-full text-left p-4 transition-colors flex items-start space-x-3 ${
                      isActive
                        ? 'bg-indigo-950/70 border-l-4 border-indigo-500'
                        : 'hover:bg-slate-900'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <PlayCircle className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={`text-xs ${isActive ? 'font-bold text-white' : 'text-slate-300'} truncate`}>
                        {idx + 1}. {lesson.title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
