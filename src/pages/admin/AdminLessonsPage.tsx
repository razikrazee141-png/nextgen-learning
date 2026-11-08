import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { courseService } from '../../services/courseService';
import { lessonService } from '../../services/lessonService';
import { Course, Lesson } from '../../types';
import {
  ArrowLeft,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit,
  Trash2,
  Video,
  Upload,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';

export const AdminLessonsPage: React.FC = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingReorder, setSavingReorder] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [videoType, setVideoType] = useState<'url' | 'upload'>('url');
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [savingLesson, setSavingLesson] = useState(false);

  const loadData = async () => {
    if (!courseId) return;
    setLoading(true);
    const [cRes, lRes] = await Promise.all([
      courseService.getCourseById(courseId),
      lessonService.getLessonsForCourse(courseId),
    ]);

    if (cRes.data) setCourse(cRes.data);
    if (lRes.data) setLessons(lRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [courseId]);

  // Open modal for new lesson
  const handleOpenAddModal = () => {
    setEditingLesson(null);
    setLessonTitle('');
    setLessonDescription('');
    setVideoUrl('');
    setVideoType('url');
    setModalError(null);
    setIsModalOpen(true);
  };

  // Open modal for editing lesson
  const handleOpenEditModal = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonTitle(lesson.title);
    setLessonDescription(lesson.description || '');
    setVideoUrl(lesson.video_url || '');
    setVideoType('url');
    setModalError(null);
    setIsModalOpen(true);
  };

  // Upload video to private Supabase bucket
  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !courseId) return;

    setUploadingVideo(true);
    setModalError(null);

    const { storageUri, error } = await lessonService.uploadVideo(file, courseId);
    setUploadingVideo(false);

    if (error) {
      setModalError(`Video upload failed: ${error}`);
    } else if (storageUri) {
      setVideoUrl(storageUri);
    }
  };

  // Save lesson (Create or Edit)
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    setModalError(null);

    if (!lessonTitle.trim()) {
      setModalError('Lesson title is required.');
      return;
    }

    setSavingLesson(true);

    if (editingLesson) {
      const { error } = await lessonService.updateLesson(editingLesson.id, {
        title: lessonTitle.trim(),
        description: lessonDescription.trim(),
        video_url: videoUrl.trim() || null,
      });

      setSavingLesson(false);

      if (error) {
        setModalError(error);
      } else {
        setIsModalOpen(false);
        loadData();
      }
    } else {
      const nextPosition = lessons.length > 0 ? Math.max(...lessons.map((l) => l.position)) + 1 : 1;

      const { error } = await lessonService.createLesson({
        course_id: courseId,
        title: lessonTitle.trim(),
        description: lessonDescription.trim(),
        video_url: videoUrl.trim() || null,
        position: nextPosition,
      });

      setSavingLesson(false);

      if (error) {
        setModalError(error);
      } else {
        setIsModalOpen(false);
        loadData();
      }
    }
  };

  // Delete lesson
  const handleDeleteLesson = async (lessonId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete lesson "${title}"?`)) return;

    const { error } = await lessonService.deleteLesson(lessonId);
    if (!error) {
      setLessons((prev) => prev.filter((l) => l.id !== lessonId));
    } else {
      alert(`Failed to delete lesson: ${error}`);
    }
  };

  // Arrow Reordering (Move Up / Down)
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const newLessons = [...lessons];
    const temp = newLessons[index];
    newLessons[index] = newLessons[targetIndex];
    newLessons[targetIndex] = temp;

    // Recalculate sequential positions
    const reorderedPayload = newLessons.map((lesson, idx) => ({
      id: lesson.id,
      position: idx + 1,
    }));

    setLessons(
      newLessons.map((l, idx) => ({
        ...l,
        position: idx + 1,
      }))
    );

    setSavingReorder(true);
    await lessonService.reorderLessons(reorderedPayload);
    setSavingReorder(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/admin/courses"
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-indigo-600 uppercase">
                Curriculum Builder
              </span>
              {savingReorder && (
                <span className="text-xs text-slate-400 italic">Saving order...</span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {course?.title || 'Course Lessons'}
            </h1>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Add Lesson</span>
        </button>
      </div>

      {/* Lessons Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">Loading lessons...</div>
        ) : lessons.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {lessons.map((lesson, index) => (
              <div
                key={lesson.id}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center space-x-4 min-w-0 pr-4">
                  {/* Reorder Arrows */}
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20 rounded hover:bg-slate-200"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(index, 'down')}
                      disabled={index === lessons.length - 1}
                      className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20 rounded hover:bg-slate-200"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-sm font-bold text-slate-400 w-6 text-center">
                    {index + 1}
                  </span>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {lesson.title}
                    </h3>
                    <p className="text-xs text-slate-500 truncate max-w-md mt-0.5">
                      {lesson.description || 'No description added.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  {lesson.video_url ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700">
                      <Video className="w-3 h-3 mr-1" />
                      Video Linked
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">
                      No video
                    </span>
                  )}

                  <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                    <button
                      onClick={() => handleOpenEditModal(lesson)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                      title="Edit Lesson"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      title="Delete Lesson"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500">
            <Video className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No lessons added yet</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Add your first lesson to build the course curriculum.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add First Lesson
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Lesson Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingLesson ? 'Edit Lesson' : 'Add New Lesson'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveLesson} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="e.g. Setting Up the Development Workspace"
                  className="w-full px-4 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Description / Overview Notes
                </label>
                <textarea
                  rows={3}
                  value={lessonDescription}
                  onChange={(e) => setLessonDescription(e.target.value)}
                  placeholder="What will students learn in this video?"
                  className="w-full px-4 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                ></textarea>
              </div>

              {/* Video Source Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                  Video Source
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-3">
                  <button
                    type="button"
                    onClick={() => setVideoType('url')}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      videoType === 'url' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Video URL (YouTube/Vimeo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoType('upload')}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      videoType === 'upload' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Upload Video File
                  </button>
                </div>

                {videoType === 'url' ? (
                  <div>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                      className="w-full px-4 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Works with unlisted YouTube videos, Vimeo, or direct MP4 URLs.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 mr-1.5" />
                      <span>{uploadingVideo ? 'Uploading video to Storage...' : 'Select MP4 Video File'}</span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm"
                        onChange={handleVideoFileUpload}
                        disabled={uploadingVideo}
                        className="hidden"
                      />
                    </label>
                    {videoUrl && (
                      <p className="text-[11px] text-emerald-600 font-mono truncate">
                        Linked: {videoUrl}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLesson || uploadingVideo}
                  className="inline-flex items-center px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  <span>{savingLesson ? 'Saving...' : 'Save Lesson'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
