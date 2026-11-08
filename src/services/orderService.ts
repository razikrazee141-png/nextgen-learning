import { supabase } from '../lib/supabase';
import { Order } from '../types';
import { enrollmentService } from './enrollmentService';

export const orderService = {
  /**
   * Fetch current user's orders
   */
  async getMyOrders(userId: string): Promise<{ data: Order[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, courses(id, title, thumbnail_url, price)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      const orders = (data || []).map((o: any) => ({
        ...o,
        course: o.courses,
      }));

      return { data: orders, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch user orders' };
    }
  },

  /**
   * Admin: Fetch all orders across platform
   */
  async getAllOrdersAdmin(statusFilter?: string): Promise<{ data: Order[] | null; error: string | null }> {
    try {
      let query = supabase
        .from('orders')
        .select('*, courses(id, title, price), profiles(id, full_name, email, phone)')
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: error.message };
      }

      const formatted = (data || []).map((o: any) => ({
        ...o,
        course: o.courses,
        user_profile: o.profiles,
      }));

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to load orders' };
    }
  },

  /**
   * Admin: Mark an order as paid, and automatically grant enrollment
   */
  async markOrderPaid(
    orderId: string,
    userId: string,
    courseId: string,
    gatewayRef?: string
  ): Promise<{ error: string | null }> {
    try {
      // 1. Update order status to 'paid'
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          gateway_reference: gatewayRef || 'manual-admin-verification',
        })
        .eq('id', orderId);

      if (orderError) {
        return { error: orderError.message };
      }

      // 2. Automatically grant course enrollment
      const { error: enrollError } = await enrollmentService.grantAccess(userId, courseId);
      if (enrollError) {
        return { error: `Order marked paid, but enrollment failed: ${enrollError}` };
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Failed to mark order as paid' };
    }
  },

  /**
   * Admin: Mark order status (e.g. failed or pending)
   */
  async updateOrderStatus(
    orderId: string,
    status: 'pending' | 'paid' | 'failed'
  ): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Failed to update order status' };
    }
  },
};
