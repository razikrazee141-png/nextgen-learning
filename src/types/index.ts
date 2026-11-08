export type UserRole = 'student' | 'admin';

export type PhoneAuthMode = 'simple' | 'otp';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  what_you_learn: string[];
  instructor_name: string;
  price: number;
  thumbnail_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
  // Computed fields (optional)
  lessons_count?: number;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string;
  video_url: string | null;
  position: number;
  created_at: string;
}

export interface LessonPreview {
  id: string;
  course_id: string;
  title: string;
  position: number;
}

export type EnrollmentStatus = 'active' | 'revoked';

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: EnrollmentStatus;
  created_at: string;
  course?: Course;
  progress_percentage?: number;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  updated_at: string;
}

export type OrderStatus = 'pending' | 'paid' | 'failed';

export interface Order {
  id: string;
  user_id: string;
  course_id: string;
  amount: number;
  status: OrderStatus;
  gateway_reference: string | null;
  created_at: string;
  course?: Course;
  user_profile?: UserProfile;
}

export interface AdminStats {
  totalCourses: number;
  totalStudents: number;
  totalEnrollments: number;
  pendingOrders: number;
}
