import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { enrollmentService } from '../../services/enrollmentService';
import { orderService } from '../../services/orderService';
import { Enrollment, Order } from '../../types';
import { BookOpen, PlayCircle, Clock, CheckCircle2, ArrowRight } from 'lucide-react';

export const MyCoursesPage: React.FC = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'courses' | 'orders'>('courses');

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    Promise.all([
      enrollmentService.getUserEnrollments(user.id),
      orderService.getMyOrders(user.id),
    ]).then(([enrollRes, ordersRes]) => {
      if (enrollRes.data) {
        setEnrollments(enrollRes.data);
      }
      if (ordersRes.data) {
        setOrders(ordersRes.data);
      }
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            My Learning Portal
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track your ongoing courses, lessons progress, and order history.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 p-1 bg-slate-100 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'courses'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Enrolled Courses ({enrollments.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'orders'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Orders & Requests ({orders.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : activeTab === 'courses' ? (
        /* Enrolled Courses Tab */
        enrollments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrollments.map((item) => {
              const course = item.course;
              if (!course) return null;
              const progress = item.progress_percentage ?? 0;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="aspect-video w-full bg-slate-100 relative">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-400">
                        <BookOpen className="w-10 h-10" />
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-base font-bold text-slate-900 line-clamp-1 mb-2">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                      {course.description}
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 mt-auto mb-4">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-slate-600">Course Progress</span>
                        <span className="text-indigo-600">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <Link
                      to={`/courses/${course.id}/learn`}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-1.5"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>{progress > 0 ? 'Continue Learning' : 'Start Course'}</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 max-w-lg mx-auto p-8">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">No enrolled courses yet</h3>
            <p className="mt-1 text-sm text-slate-500 mb-6">
              Browse our course collection and start learning today.
            </p>
            <Link
              to="/courses"
              className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
            >
              <span>Explore Courses</span>
              <ArrowRight className="ml-1.5 w-4 h-4" />
            </Link>
          </div>
        )
      ) : (
        /* Orders History Tab */
        orders.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Course</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {order.course?.title || 'Course'}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        ₹{Number(order.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        {order.status === 'paid' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Active / Paid
                          </span>
                        ) : order.status === 'pending' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            Awaiting Admin Approval
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                            Cancelled / Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 max-w-lg mx-auto p-8">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">No order history</h3>
            <p className="mt-1 text-sm text-slate-500">
              When you purchase or enroll in a course, your order requests will appear here.
            </p>
          </div>
        )
      )}
    </div>
  );
};
