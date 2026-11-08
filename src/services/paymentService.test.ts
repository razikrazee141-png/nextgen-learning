import { describe, it, expect } from 'vitest';
import { PAYMENT_INSTRUCTIONS, paymentService } from './paymentService';
import fs from 'node:fs';
import path from 'node:path';

describe('Payment Service & Placeholders', () => {
  it('contains editable payment instructions without hardcoded real banking credentials', () => {
    expect(PAYMENT_INSTRUCTIONS).toBeDefined();
    expect(PAYMENT_INSTRUCTIONS.upiId).toContain('placeholder');
    expect(PAYMENT_INSTRUCTIONS.bankDetails.accountNumber).toContain('XXXX');
    expect(PAYMENT_INSTRUCTIONS.note).toBeDefined();
  });

  it('prohibits direct client-side webhook confirmations', async () => {
    const verified = await paymentService.verifyPaymentWebhookPlaceholder({});
    expect(verified).toBe(false);
  });
});

describe('Supabase Database Schema Integrity', () => {
  const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  it('defines all required tables with primary keys', () => {
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS public.profiles');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS public.courses');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS public.lessons');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS public.enrollments');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS public.lesson_progress');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS public.orders');
  });

  it('enforces Row Level Security (RLS) across all tables', () => {
    expect(schemaSql).toContain('ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;');
    expect(schemaSql).toContain('ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;');
    expect(schemaSql).toContain('ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;');
    expect(schemaSql).toContain('ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;');
    expect(schemaSql).toContain('ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;');
    expect(schemaSql).toContain('ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;');
  });

  it('protects student role on signup and prevents privilege escalation', () => {
    // Hardcoded 'student' on handle_new_user
    expect(schemaSql).toContain("'student' -- Explicitly hardcode 'student'");
    // BEFORE UPDATE trigger protecting role
    expect(schemaSql).toContain('protect_profile_role()');
    expect(schemaSql).toContain('NEW.role := OLD.role;');
  });

  it('restricts full lessons to enrolled students or admins and provides get_course_curriculum RPC for preview', () => {
    expect(schemaSql).toContain('lessons_enrolled_or_admin_select');
    expect(schemaSql).toContain('CREATE OR REPLACE FUNCTION public.get_course_curriculum');
  });

  it('configures public thumbnail storage and private video storage buckets', () => {
    expect(schemaSql).toContain("'course-thumbnails', 'course-thumbnails', true");
    expect(schemaSql).toContain("'course-videos', 'course-videos', false");
  });

  it('provides the documented first admin creation line', () => {
    expect(schemaSql).toContain("UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';");
  });
});
