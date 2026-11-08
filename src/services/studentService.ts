import { supabase } from '../lib/supabase';
import { UserProfile, AdminStats } from '../types';

export const studentService = {
  /**
   * Admin: List students with optional search filter
   */
  async getStudents(query?: string): Promise<{ data: UserProfile[] | null; error: string | null }> {
    try {
      let req = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (query && query.trim()) {
        const q = query.trim();
        req = req.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
      }

      const { data, error } = await req;

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as UserProfile[], error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to load students' };
    }
  },

  /**
   * Admin: Get all courses owned by a specific student
   */
  async getStudentEnrollments(userId: string) {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, courses(id, title, price, thumbnail_url)')
        .eq('user_id', userId);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to load student enrollments' };
    }
  },

  /**
   * Admin: Reset a student's password.
   * Invokes the Supabase Edge Function 'admin-reset-password' which securely uses service_role key.
   */
  async resetPassword(
    userId: string,
    newPassword: string
  ): Promise<{ success: boolean; error: string | null; sqlFallback?: string }> {
    const sqlFallback = `-- In Supabase SQL Editor:
UPDATE auth.users 
SET encrypted_password = crypt('${newPassword.replace(/'/g, "''")}', gen_salt('bf')) 
WHERE id = '${userId}';`;

    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { userId, newPassword },
      });

      if (error || (data && !data.success)) {
        const msg = error?.message || data?.error || 'Edge Function not available.';
        return {
          success: false,
          error: msg,
          sqlFallback,
        };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Edge Function invocation error.',
        sqlFallback,
      };
    }
  },

  /**
   * Admin: Fetch platform summary statistics
   */
  async getStats(): Promise<{ data: AdminStats | null; error: string | null }> {
    try {
      // Parallel count requests
      const [coursesRes, studentsRes, enrollmentsRes, ordersRes] = await Promise.all([
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      return {
        data: {
          totalCourses: coursesRes.count || 0,
          totalStudents: studentsRes.count || 0,
          totalEnrollments: enrollmentsRes.count || 0,
          pendingOrders: ordersRes.count || 0,
        },
        error: null,
      };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to calculate stats' };
    }
  },
};
