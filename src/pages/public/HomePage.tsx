import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { courseService } from '../../services/courseService';
import { Course } from '../../types';
import { CourseCard } from '../../components/course/CourseCard';
import { ArrowRight, BookOpen, CheckCircle, ShieldCheck } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    courseService.getPublishedCourses().then(({ data }) => {
      if (data) {
        // Take top 3 or 4 for featured section
        setFeaturedCourses(data.slice(0, 4));
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/60 via-white to-slate-50 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-indigo-100/80 text-indigo-700 text-xs font-semibold tracking-wide uppercase mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            <span>NextGen Online Learning</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight">
            Leading Today, <span className="text-indigo-600">Shaping Tomorrow.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Gain real-world knowledge and structured practical expertise with NextGen's targeted courses. Learn on your schedule, anytime, anywhere.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/courses"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-lg transition-all focus:ring-4 focus:ring-indigo-300"
            >
              <span>Explore Courses</span>
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-sm transition-all"
            >
              Join NextGen
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Featured Courses
            </h2>
            <p className="mt-2 text-slate-500 text-sm">
              Discover carefully curated curriculums taught by experienced instructors.
            </p>
          </div>
          <Link
            to="/courses"
            className="mt-4 sm:mt-0 text-sm font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center group"
          >
            <span>View all courses</span>
            <ArrowRight className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="aspect-video bg-slate-200 rounded-lg"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : featuredCourses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-medium text-slate-900">Courses are being prepared</h3>
            <p className="mt-1 text-sm text-slate-500">
              Check back soon as our instructors publish upcoming curriculum.
            </p>
          </div>
        )}
      </section>

      {/* How It Works (Simple 3 Steps) */}
      <section className="bg-slate-100/70 border-y border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              How It Works
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              A straightforward, transparent pathway to master new capabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col items-start">
              <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Browse & Inspect
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Review course outlines, learning objectives, instructor backgrounds, and lesson curriculum before enrolling.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col items-start">
              <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Easy Enrollment
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Enroll with flexible options. Verify your registration and gain immediate or rapid activation to your courses.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col items-start">
              <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Learn at Your Pace
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Watch focused lessons, track your completed topics with the course progress bar, and re-watch anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Transparency */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-indigo-900 rounded-2xl p-8 sm:p-12 text-white flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center space-x-2 text-indigo-300 text-sm font-semibold">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span>NextGen Guarantee</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
              Ready to accelerate your learning journey?
            </h2>
            <p className="text-indigo-200 text-sm sm:text-base leading-relaxed">
              Create an account with either your email address or Indian mobile number in seconds.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Link
              to="/register"
              className="inline-flex items-center px-6 py-3.5 text-sm font-bold text-indigo-950 bg-white hover:bg-indigo-50 rounded-xl shadow-md transition-colors"
            >
              <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
              Create Free Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
