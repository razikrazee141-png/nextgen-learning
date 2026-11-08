import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { courseService } from '../../services/courseService';
import { Course } from '../../types';
import {
  PlusCircle,
  Edit,
  Trash2,
  BookOpen,
  Eye,
  EyeOff,
  Video,
} from 'lucide-react';

export const AdminCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadCourses = async () => {
    setLoading(true);
    const { data } = await courseService.getAllCoursesAdmin();
    if (data) setCourses(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleTogglePublish = async (course: Course) => {
    setActionLoadingId(course.id);
    const updatedStatus = !course.is_published;
    const { error } = await courseService.updateCourse(course.id, {
      is_published: updatedStatus,
    });
    setActionLoadingId(null);

    if (!error) {
      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, is_published: updatedStatus } : c))
      );
    } else {
      alert(`Failed to update status: ${error}`);
    }
  };

  const handleDeleteCourse = async (courseId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete the course "${title}"? All attached lessons and enrollments will also be removed.`)) {
      return;
    }

    setActionLoadingId(courseId);
    const { error } = await courseService.deleteCourse(courseId);
    setActionLoadingId(null);

    if (!error) {
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    } else {
      alert(`Failed to delete course: ${error}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Course Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Create, update curriculum, manage lesson videos, and toggle publishing.
          </p>
        </div>

        <Link
          to="/admin/courses/new"
          className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4 mr-1.5" />
          <span>New Course</span>
        </Link>
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">Loading courses...</div>
        ) : courses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Instructor</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Lessons</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-8 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                          {course.thumbnail_url ? (
                            <img
                              src={course.thumbnail_url}
                              alt={course.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <BookOpen className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 max-w-xs">
                          <p className="font-bold text-slate-900 truncate">{course.title}</p>
                          <p className="text-[11px] text-slate-400 truncate">{course.description}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-700 font-medium">
                      {course.instructor_name}
                    </td>

                    <td className="px-6 py-4 font-bold text-slate-900">
                      {course.price === 0 ? 'Free' : `₹${Number(course.price).toLocaleString('en-IN')}`}
                    </td>

                    <td className="px-6 py-4">
                      <Link
                        to={`/admin/courses/${course.id}/lessons`}
                        className="inline-flex items-center space-x-1 font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>{course.lessons_count || 0} lessons</span>
                      </Link>
                    </td>

                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleTogglePublish(course)}
                        disabled={actionLoadingId === course.id}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                          course.is_published
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {course.is_published ? (
                          <>
                            <Eye className="w-3 h-3 mr-1" />
                            Published
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 mr-1" />
                            Draft / Hidden
                          </>
                        )}
                      </button>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/admin/courses/${course.id}/lessons`}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                          title="Manage Lessons"
                        >
                          <Video className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/admin/courses/${course.id}/edit`}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                          title="Edit Details"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteCourse(course.id, course.title)}
                          disabled={actionLoadingId === course.id}
                          className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          title="Delete Course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No courses yet</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Get started by creating your first course curriculum.
            </p>
            <Link
              to="/admin/courses/new"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Create Course
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
