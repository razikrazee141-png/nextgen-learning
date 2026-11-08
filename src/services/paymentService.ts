import { supabase } from '../lib/supabase';
import { Course, Order } from '../types';

/**
 * Payment instruction config with clear, editable placeholders.
 * Edit these instructions to match your payment collection methods (e.g., UPI, Bank Transfer).
 */
export const PAYMENT_INSTRUCTIONS = {
  title: 'Payment & Enrollment Instructions',
  upiId: 'payment@nextgen.placeholder', // Placeholder - edit with actual UPI ID
  bankDetails: {
    accountName: 'NextGen Learning', // Placeholder
    accountNumber: 'XXXXXXXXXXXX',
    ifscCode: 'XXXX0000000',
    bankName: 'Partner Bank Placeholder',
  },
  note: 'After making the payment via UPI or Bank Transfer, please keep your Transaction/Reference ID handy. Our team will verify and activate your course access.',
  supportEmail: 'support@nextgen.local',
};

export interface PurchaseResult {
  order: Order | null;
  instructions: typeof PAYMENT_INSTRUCTIONS;
  error: string | null;
}

/**
 * Single payment service layer file.
 * Handles order creation and serves as the single integration point
 * for plugging in future payment gateways (e.g. Razorpay, Stripe, Cashfree).
 */
export const paymentService = {
  /**
   * Initiates the purchase for a course.
   * Creates a 'pending' order in database according to RLS rules.
   */
  async initiatePurchase(
    userId: string,
    course: Course
  ): Promise<PurchaseResult> {
    try {
      // 1. Create a pending order row
      const { data, error } = await supabase
        .from('orders')
        .insert([
          {
            user_id: userId,
            course_id: course.id,
            amount: course.price,
            status: 'pending',
            gateway_reference: null,
          },
        ])
        .select()
        .single();

      if (error) {
        return {
          order: null,
          instructions: PAYMENT_INSTRUCTIONS,
          error: error.message,
        };
      }

      return {
        order: data as Order,
        instructions: PAYMENT_INSTRUCTIONS,
        error: null,
      };
    } catch (err: any) {
      return {
        order: null,
        instructions: PAYMENT_INSTRUCTIONS,
        error: err.message || 'Failed to initiate purchase.',
      };
    }
  },

  /**
   * Placeholder hook for future payment gateway verification.
   * NOTE: When a gateway (Razorpay/Stripe) is connected, verification MUST
   * run server-side inside a Supabase Edge Function with webhook signature verification.
   */
  async verifyPaymentWebhookPlaceholder(_gatewayPayload: unknown): Promise<boolean> {
    console.warn(
      '[NextGen Payment Service] Direct client-side payment confirmation is prohibited. ' +
      'All gateway verifications are to be handled via Supabase Edge Function webhook.'
    );
    return false;
  },
};
