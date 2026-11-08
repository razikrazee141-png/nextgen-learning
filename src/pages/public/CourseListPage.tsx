import React, { useEffect, useState } from 'react';
import { courseService } from '../../services/courseService';
import { Course } from '../../types';
import { CourseCard } from '../../components/course/CourseCard';
import { Search, BookOpen } from 'lucide-react';

export const CourseListPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadCourses = async (query?: string) => {
    setLoading(true);
    const { data } = await courseService.getPublishedCourses(query);
    if (data) {
      setCourses(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCourses(searchQuery);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Explore All Courses
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-xl">
            Browse our catalog of structured, career-focused courses.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                loadCourses('');
              }}
              className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse bg-white border border-slate-200 rounded-xl p-4 space-y-4">
              <div className="aspect-video bg-slate-200 rounded-lg"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm max-w-lg mx-auto">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No courses found</h3>
          <p className="mt-1 text-sm text-slate-500">
            {searchQuery
              ? `No results found for "${searchQuery}". Try a different keyword.`
              : 'There are currently no published courses available.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                loadCourses('');
              }}
              className="mt-4 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Reset search
            </button>
          )}
        </div>
      )}
    </div>
  );
};
