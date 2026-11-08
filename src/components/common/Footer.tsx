import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                <span>N</span>
              </div>
              <span className="text-xl font-bold text-white tracking-tight">NextGen</span>
            </div>
            <p className="text-sm text-slate-400 font-medium italic">
              Leading Today, Shaping Tomorrow.
            </p>
            <p className="text-sm text-slate-400 max-w-sm">
              Empowering learners with industry-relevant skills and structured, practical courses designed for your career growth.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Explore
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/courses" className="hover:text-white transition-colors">
                  All Courses
                </Link>
              </li>
              <li>
                <Link to="/my-courses" className="hover:text-white transition-colors">
                  Student Dashboard
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Support / Contact Placeholder */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Support
            </h4>
            <p className="text-sm text-slate-400 mb-2">
              Have questions regarding course access or enrollment?
            </p>
            <p className="text-sm text-indigo-400">
              support@nextgen.local
            </p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <p>&copy; {new Date().getFullYear()} NextGen. All rights reserved.</p>
          <p className="text-slate-500">
            Platform built for flexible learning.
          </p>
        </div>
      </div>
    </footer>
  );
};
