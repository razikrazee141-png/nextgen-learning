import React, { useEffect, useState } from 'react';
import { orderService } from '../../services/orderService';
import { Order } from '../../types';
import {
  CheckCircle,
  XCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadOrders = async (status = statusFilter) => {
    setLoading(true);
    const { data } = await orderService.getAllOrdersAdmin(status);
    if (data) setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders(statusFilter);
  }, [statusFilter]);

  const handleMarkPaid = async (order: Order) => {
    setActionLoadingId(order.id);
    const { error } = await orderService.markOrderPaid(
      order.id,
      order.user_id,
      order.course_id,
      'manual-admin-verification'
    );
    setActionLoadingId(null);

    if (!error) {
      loadOrders();
    } else {
      alert(`Failed to mark order as paid: ${error}`);
    }
  };

  const handleMarkFailed = async (orderId: string) => {
    if (!window.confirm('Mark this order as failed/cancelled?')) return;
    setActionLoadingId(orderId);
    const { error } = await orderService.updateOrderStatus(orderId, 'failed');
    setActionLoadingId(null);

    if (!error) {
      loadOrders();
    } else {
      alert(`Failed to update order status: ${error}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Status Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Orders & Enrollments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Verify student payment submissions and manage course licenses.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex space-x-1.5 p-1 bg-white border border-slate-200 rounded-xl shadow-sm self-start sm:self-auto">
          {[
            { label: 'All', value: 'all' },
            { label: 'Pending', value: 'pending' },
            { label: 'Paid', value: 'paid' },
            { label: 'Failed', value: 'failed' },
          ].map((pill) => (
            <button
              key={pill.value}
              onClick={() => setStatusFilter(pill.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === pill.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">Loading orders...</div>
        ) : orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Order ID & Date</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-slate-900 block">
                        {order.id.substring(0, 8)}...
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">
                        {order.user_profile?.full_name || 'Student'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {order.user_profile?.phone || order.user_profile?.email || '-'}
                      </p>
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-800">
                      {order.course?.title || order.course_id}
                    </td>

                    <td className="px-6 py-4 font-bold text-slate-900">
                      ₹{Number(order.amount).toLocaleString('en-IN')}
                    </td>

                    <td className="px-6 py-4">
                      {order.status === 'paid' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Paid
                        </span>
                      ) : order.status === 'pending' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          Pending Review
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Failed
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {order.status === 'pending' ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleMarkPaid(order)}
                            disabled={actionLoadingId === order.id}
                            className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow-sm transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            <span>Approve & Enroll</span>
                          </button>
                          <button
                            onClick={() => handleMarkFailed(order.id)}
                            disabled={actionLoadingId === order.id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Reject/Fail Order"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : order.status === 'paid' ? (
                        <span className="text-slate-400 text-xs italic">
                          Enrollment Active
                        </span>
                      ) : (
                        <button
                          onClick={() => handleMarkPaid(order)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          Re-open & Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500 text-xs">
            No orders found under "{statusFilter}" status.
          </div>
        )}
      </div>
    </div>
  );
};
