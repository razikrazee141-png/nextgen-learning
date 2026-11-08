import { supabase } from '../lib/supabase';
import { Lesson, LessonProgress } from '../types';

export const lessonService = {
  /**
   * Fetch full lessons for an enrolled student or admin (enforced by RLS)
   */
  async getLessonsForCourse(courseId: string): Promise<{ data: Lesson[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('position', { ascending: true });

      if (error) {
        return { data: null, error: error.message };
      }

      // If video_url starts with private storage indicator, resolve signed URL
      const lessonsWithUrls = await Promise.all(
        (data as Lesson[]).map(async (lesson) => {
          if (lesson.video_url && lesson.video_url.startsWith('storage://')) {
            const path = lesson.video_url.replace('storage://', '');
            const { data: signedData } = await supabase.storage
              .from('course-videos')
              .createSignedUrl(path, 3600); // 1 hour validity

            return {
              ...lesson,
              video_url: signedData?.signedUrl || lesson.video_url,
            };
          }
          return lesson;
        })
      );

      return { data: lessonsWithUrls, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch lessons' };
    }
  },

  /**
   * Admin: Add a new lesson
   */
  async createLesson(lesson: {
    course_id: string;
    title: string;
    description: string;
    video_url: string | null;
    position: number;
  }): Promise<{ data: Lesson | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .insert([lesson])
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to create lesson' };
    }
  },

  /**
   * Admin: Update lesson
   */
  async updateLesson(
    lessonId: string,
    updates: Partial<{
      title: string;
      description: string;
      video_url: string | null;
      position: number;
    }>
  ): Promise<{ data: Lesson | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .update(updates)
        .eq('id', lessonId)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update lesson' };
    }
  },

  /**
   * Admin: Delete lesson
   */
  async deleteLesson(lessonId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Failed to delete lesson' };
    }
  },

  /**
   * Admin: Batch reorder lessons using new positions
   */
  async reorderLessons(
    lessons: { id: string; position: number }[]
  ): Promise<{ error: string | null }> {
    try {
      // Update each lesson's position
      for (const item of lessons) {
        const { error } = await supabase
          .from('lessons')
          .update({ position: item.position })
          .eq('id', item.id);

        if (error) {
          return { error: error.message };
        }
      }
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Failed to reorder lessons' };
    }
  },

  /**
   * Admin: Upload video file to private Storage bucket
   */
  async uploadVideo(file: File, courseId: string): Promise<{ storageUri: string | null; error: string | null }> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${courseId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('course-videos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        return { storageUri: null, error: uploadError.message };
      }

      // Store with custom scheme so we know it requires a signed URL
      return { storageUri: `storage://${fileName}`, error: null };
    } catch (err: any) {
      return { storageUri: null, error: err.message || 'Failed to upload video' };
    }
  },

  /**
   * Fetch lesson progress for a user across a course
   */
  async getCourseProgress(userId: string, courseId: string): Promise<{ data: LessonProgress[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*, lessons!inner(course_id)')
        .eq('user_id', userId)
        .eq('lessons.course_id', courseId);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch progress' };
    }
  },

  /**
   * Toggle completion status of a lesson
   */
  async toggleLessonProgress(
    userId: string,
    lessonId: string,
    completed: boolean
  ): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('lesson_progress')
        .upsert(
          {
            user_id: userId,
            lesson_id: lessonId,
            completed,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,lesson_id' }
        );

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Failed to update progress' };
    }
  },
};
