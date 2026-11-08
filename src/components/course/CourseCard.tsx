import React from 'react';
import { Link } from 'react-router-dom';
import { Course } from '../../types';
import { User, BookOpen } from 'lucide-react';

interface CourseCardProps {
  course: Course;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  const formattedPrice = course.price === 0 ? 'Free' : `₹${Number(course.price).toLocaleString('en-IN')}`;

  return (
    <Link
      to={`/courses/${course.id}`}
      className="group flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 text-slate-400">
            <BookOpen className="w-12 h-12 text-indigo-300 mb-1" />
            <span className="text-xs font-medium text-slate-500">NextGen Learning</span>
          </div>
        )}
        <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-sm text-white font-semibold text-xs px-2.5 py-1 rounded-md">
          {formattedPrice}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
          {course.title}
        </h3>

        <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">
          {course.description || 'Comprehensive curriculum designed by NextGen experts.'}
        </p>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5 truncate max-w-[65%]">
            <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{course.instructor_name}</span>
          </div>

          {typeof course.lessons_count === 'number' && (
            <div className="flex items-center space-x-1 flex-shrink-0 text-slate-600 font-medium">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>{course.lessons_count} {course.lessons_count === 1 ? 'lesson' : 'lessons'}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};
