import { supabase } from '../lib/supabase';
import { Enrollment } from '../types';

export const enrollmentService = {
  /**
   * Check if the given user is actively enrolled in a course
   */
  async checkEnrollment(
    userId: string,
    courseId: string
  ): Promise<{ isEnrolled: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('id, status')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        return { isEnrolled: false, error: error.message };
      }

      return { isEnrolled: Boolean(data), error: null };
    } catch (err: any) {
      return { isEnrolled: false, error: err.message || 'Error checking enrollment' };
    }
  },

  /**
   * Fetch all active enrollments for a user with course details and progress
   */
  async getUserEnrollments(userId: string): Promise<{ data: Enrollment[] | null; error: string | null }> {
    try {
      // 1. Fetch enrollments with course details
      const { data: enrollmentsData, error } = await supabase
        .from('enrollments')
        .select('*, courses(*, lessons(id))')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      if (!enrollmentsData || enrollmentsData.length === 0) {
        return { data: [], error: null };
      }

      // 2. Fetch user's completed lessons to calculate progress percentage
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed')
        .eq('user_id', userId)
        .eq('completed', true);

      const completedLessonSet = new Set((progressData || []).map((p) => p.lesson_id));

      const enrollmentsWithProgress: Enrollment[] = enrollmentsData.map((e: any) => {
        const course = e.courses;
        const totalLessons = course?.lessons?.length || 0;
        let completedCount = 0;

        if (course?.lessons && Array.isArray(course.lessons)) {
          course.lessons.forEach((l: any) => {
            if (completedLessonSet.has(l.id)) {
              completedCount++;
            }
          });
        }

        const percentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

        return {
          id: e.id,
          user_id: e.user_id,
          course_id: e.course_id,
          status: e.status,
          created_at: e.created_at,
          course: {
            ...course,
            lessons_count: totalLessons,
          },
          progress_percentage: percentage,
        };
      });

      return { data: enrollmentsWithProgress, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to load user courses' };
    }
  },

  /**
   * Admin: Manually grant course access
   */
  async grantAccess(
    userId: string,
    courseId: string
  ): Promise<{ data: Enrollment | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .upsert(
          {
            user_id: userId,
            course_id: courseId,
            status: 'active',
            created_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,course_id' }
        )
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to grant access' };
    }
  },

  /**
   * Admin: Revoke course access
   */
  async revokeAccess(
    userId: string,
    courseId: string
  ): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('enrollments')
        .update({ status: 'revoked' })
        .eq('user_id', userId)
        .eq('course_id', courseId);

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Failed to revoke access' };
    }
  },
};
