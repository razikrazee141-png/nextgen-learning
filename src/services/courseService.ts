import { supabase } from '../lib/supabase';
import { Course, LessonPreview } from '../types';

export const courseService = {
  /**
   * Fetch all published courses for the public catalog, with optional search query
   */
  async getPublishedCourses(query?: string): Promise<{ data: Course[] | null; error: string | null }> {
    try {
      let req = supabase
        .from('courses')
        .select('*, lessons(count)')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (query && query.trim()) {
        req = req.ilike('title', `%${query.trim()}%`);
      }

      const { data, error } = await req;

      if (error) {
        return { data: null, error: error.message };
      }

      const courses = (data || []).map((c: any) => ({
        ...c,
        lessons_count: c.lessons?.[0]?.count || 0,
      }));

      return { data: courses, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to load courses' };
    }
  },

  /**
   * Get single course details
   */
  async getCourseById(courseId: string): Promise<{ data: Course | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch course' };
    }
  },

  /**
   * Get public lesson titles/curriculum (NO video URLs exposed)
   */
  async getCourseCurriculum(courseId: string): Promise<{ data: LessonPreview[] | null; error: string | null }> {
    try {
      // 1. Try calling the stored RPC function
      const { data, error } = await supabase.rpc('get_course_curriculum', {
        p_course_id: courseId,
      });

      if (!error && data) {
        return { data, error: null };
      }

      // 2. Fallback: select titles only
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('lessons')
        .select('id, course_id, title, position')
        .eq('course_id', courseId)
        .order('position', { ascending: true });

      if (fallbackError) {
        return { data: null, error: fallbackError.message };
      }

      return { data: fallbackData, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch curriculum' };
    }
  },

  /**
   * Admin: Fetch all courses (published and draft)
   */
  async getAllCoursesAdmin(): Promise<{ data: Course[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*, lessons(count)')
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      const courses = (data || []).map((c: any) => ({
        ...c,
        lessons_count: c.lessons?.[0]?.count || 0,
      }));

      return { data: courses, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to load courses' };
    }
  },

  /**
   * Admin: Create a new course
   */
  async createCourse(course: {
    title: string;
    description: string;
    what_you_learn: string[];
    instructor_name: string;
    price: number;
    thumbnail_url?: string | null;
    is_published: boolean;
  }): Promise<{ data: Course | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .insert([course])
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to create course' };
    }
  },

  /**
   * Admin: Update course
   */
  async updateCourse(
    courseId: string,
    updates: Partial<{
      title: string;
      description: string;
      what_you_learn: string[];
      instructor_name: string;
      price: number;
      thumbnail_url: string | null;
      is_published: boolean;
    }>
  ): Promise<{ data: Course | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', courseId)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update course' };
    }
  },

  /**
   * Admin: Delete course
   */
  async deleteCourse(courseId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Failed to delete course' };
    }
  },

  /**
   * Admin: Upload course thumbnail to Supabase Storage public bucket
   */
  async uploadThumbnail(file: File): Promise<{ url: string | null; error: string | null }> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `thumbnails/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-thumbnails')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        return { url: null, error: uploadError.message };
      }

      const { data } = supabase.storage
        .from('course-thumbnails')
        .getPublicUrl(filePath);

      return { url: data.publicUrl, error: null };
    } catch (err: any) {
      return { url: null, error: err.message || 'Failed to upload image' };
    }
  },
};
