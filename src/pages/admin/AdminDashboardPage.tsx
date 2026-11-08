import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { studentService } from '../../services/studentService';
import { orderService } from '../../services/orderService';
import { AdminStats, Order } from '../../types';
import {
  BookOpen,
  Users,
  Award,
  Clock,
  ArrowRight,
  PlusCircle,
  CheckCircle,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalCourses: 0,
    totalStudents: 0,
    totalEnrollments: 0,
    pendingOrders: 0,
  });
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [statsRes, ordersRes] = await Promise.all([
      studentService.getStats(),
      orderService.getAllOrdersAdmin('pending'),
    ]);

    if (statsRes.data) setStats(statsRes.data);
    if (ordersRes.data) setPendingOrders(ordersRes.data.slice(0, 5));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveOrder = async (order: Order) => {
    setProcessingId(order.id);
    const { error } = await orderService.markOrderPaid(
      order.id,
      order.user_id,
      order.course_id,
      'admin-dashboard-quick-approval'
    );
    setProcessingId(null);

    if (!error) {
      loadData();
    } else {
      alert(`Error approving order: ${error}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Admin Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time snapshot of courses, registered students, and order fulfillment.
          </p>
        </div>

        <Link
          to="/admin/courses/new"
          className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4 mr-1.5" />
          <span>Create New Course</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total Courses
            </span>
            <span className="text-2xl font-extrabold text-slate-900">
              {loading ? '-' : stats.totalCourses}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Students
            </span>
            <span className="text-2xl font-extrabold text-slate-900">
              {loading ? '-' : stats.totalStudents}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Active Enrollments
            </span>
            <span className="text-2xl font-extrabold text-slate-900">
              {loading ? '-' : stats.totalEnrollments}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Pending Orders
            </span>
            <span className="text-2xl font-extrabold text-slate-900">
              {loading ? '-' : stats.pendingOrders}
            </span>
          </div>
        </div>
      </div>

      {/* Pending Orders Action Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Pending Orders for Verification</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review payments and grant immediate course access.
            </p>
          </div>
          <Link
            to="/admin/orders"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading pending orders...</div>
        ) : pendingOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Course</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Order Date</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">
                        {order.user_profile?.full_name || 'Student'}
                      </div>
                      <div className="text-slate-400 font-mono text-[11px]">
                        {order.user_profile?.phone || order.user_profile?.email || order.user_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {order.course?.title || order.course_id}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      ₹{Number(order.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleApproveOrder(order)}
                        disabled={processingId === order.id}
                        className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition-colors text-xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        <span>{processingId === order.id ? 'Approving...' : 'Mark Paid & Enroll'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            No pending orders at this moment. All student purchase requests are up to date.
          </div>
        )}
      </div>
    </div>
  );
};
