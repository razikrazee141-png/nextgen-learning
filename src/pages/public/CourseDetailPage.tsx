import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { courseService } from '../../services/courseService';
import { enrollmentService } from '../../services/enrollmentService';
import { paymentService, PAYMENT_INSTRUCTIONS } from '../../services/paymentService';
import { useAuth } from '../../contexts/AuthContext';
import { Course, LessonPreview, Order } from '../../types';
import { CurriculumAccordion } from '../../components/course/CurriculumAccordion';
import {
  CheckCircle2,
  User,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

export const CourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [curriculum, setCurriculum] = useState<LessonPreview[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseOrder, setPurchaseOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    Promise.all([
      courseService.getCourseById(id),
      courseService.getCourseCurriculum(id),
      user ? enrollmentService.checkEnrollment(user.id, id) : Promise.resolve({ isEnrolled: false }),
    ]).then(([courseRes, curriculumRes, enrollRes]) => {
      if (courseRes.data) {
        setCourse(courseRes.data);
      }
      if (curriculumRes.data) {
        setCurriculum(curriculumRes.data);
      }
      if (enrollRes && 'isEnrolled' in enrollRes) {
        setIsEnrolled(enrollRes.isEnrolled);
      }
      setLoading(false);
    });
  }, [id, user]);

  const handleEnrollOrBuy = async () => {
    if (!course) return;

    if (!user) {
      // Redirect to login, preserving destination
      navigate('/login', { state: { from: { pathname: `/courses/${course.id}` } } });
      return;
    }

    if (isEnrolled) {
      navigate(`/courses/${course.id}/learn`);
      return;
    }

    // Initiate purchase flow through payment service layer
    setPurchasing(true);
    setOrderError(null);

    const result = await paymentService.initiatePurchase(user.id, course);
    setPurchasing(false);

    if (result.error) {
      setOrderError(result.error);
      return;
    }

    if (result.order) {
      setPurchaseOrder(result.order);
      setShowOrderModal(true);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-800">Course not found</h2>
        <p className="mt-2 text-slate-500">The requested course may have been removed or unpublished.</p>
        <Link to="/courses" className="mt-4 inline-block text-indigo-600 font-medium">
          &larr; Back to all courses
        </Link>
      </div>
    );
  }

  const formattedPrice = course.price === 0 ? 'Free' : `₹${Number(course.price).toLocaleString('en-IN')}`;

  return (
    <div className="min-h-screen pb-20">
      {/* Top Hero Banner */}
      <div className="bg-slate-900 text-white py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
            <div className="lg:col-span-2 space-y-5">
              <div className="inline-flex items-center space-x-2 text-xs font-semibold text-indigo-400 bg-indigo-950/80 px-3 py-1 rounded-full border border-indigo-800">
                <span>NextGen Course</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                {course.title}
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-3xl">
                {course.description}
              </p>

              <div className="flex flex-wrap items-center gap-6 pt-2 text-sm text-slate-300">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-indigo-400" />
                  <span>Instructor: <strong className="text-white">{course.instructor_name}</strong></span>
                </div>
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span>{curriculum.length} Lessons</span>
                </div>
              </div>
            </div>

            {/* Floating Purchase Card for Desktop & Mobile */}
            <div className="bg-white text-slate-900 rounded-2xl p-6 shadow-xl border border-slate-200">
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 mb-6">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-400">
                    <BookOpen className="w-12 h-12" />
                  </div>
                )}
              </div>

              <div className="mb-6">
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {formattedPrice}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  One-time enrollment for full lifetime access.
                </p>
              </div>

              {orderError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{orderError}</span>
                </div>
              )}

              {isEnrolled ? (
                <button
                  onClick={() => navigate(`/courses/${course.id}/learn`)}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2"
                >
                  <span>Go to Course Player</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleEnrollOrBuy}
                  disabled={purchasing}
                  className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2"
                >
                  {purchasing ? (
                    <span>Processing order...</span>
                  ) : (
                    <>
                      <span>{course.price === 0 ? 'Enroll for Free' : 'Buy / Enroll Now'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-500">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Self-paced video learning</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Progress tracking & completion status</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Details Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-10">
          {/* What You'll Learn */}
          {course.what_you_learn && course.what_you_learn.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">
                What you'll learn
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {course.what_you_learn.map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-3 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Curriculum */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                Course Curriculum
              </h2>
              <span className="text-xs text-slate-500">
                {curriculum.length} lessons in sequence
              </span>
            </div>

            <CurriculumAccordion
              lessons={curriculum}
              isEnrolled={isEnrolled}
              onSelectLesson={() => {
                if (isEnrolled) {
                  navigate(`/courses/${course.id}/learn`);
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Order Payment Instructions Modal */}
      {showOrderModal && purchaseOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {PAYMENT_INSTRUCTIONS.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order ID: <span className="font-mono">{purchaseOrder.id}</span>
                </p>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                Pending Approval
              </span>
            </div>

            <div className="space-y-4 text-sm text-slate-700">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>Course</span>
                  <span className="font-medium text-slate-900">{course.title}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>Payable Amount</span>
                  <span className="font-bold text-base text-slate-900">
                    ₹{Number(purchaseOrder.amount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* UPI Option */}
              <div className="border border-slate-200 rounded-xl p-4">
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  Option 1: Pay via UPI
                </span>
                <div className="flex items-center justify-between mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-mono text-sm font-bold text-slate-800">
                    {PAYMENT_INSTRUCTIONS.upiId}
                  </span>
                  <button
                    onClick={() => copyToClipboard(PAYMENT_INSTRUCTIONS.upiId)}
                    className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                    title="Copy UPI ID"
                  >
                    {copiedUpi ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Bank Transfer Option */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-1.5 text-xs">
                <span className="font-semibold text-slate-500 uppercase block mb-1">
                  Option 2: Direct Bank Transfer
                </span>
                <p><strong>Account Name:</strong> {PAYMENT_INSTRUCTIONS.bankDetails.accountName}</p>
                <p><strong>Account No:</strong> <span className="font-mono">{PAYMENT_INSTRUCTIONS.bankDetails.accountNumber}</span></p>
                <p><strong>IFSC Code:</strong> <span className="font-mono">{PAYMENT_INSTRUCTIONS.bankDetails.ifscCode}</span></p>
                <p><strong>Bank:</strong> {PAYMENT_INSTRUCTIONS.bankDetails.bankName}</p>
              </div>

              <div className="text-xs text-slate-500 bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900">
                {PAYMENT_INSTRUCTIONS.note}
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setShowOrderModal(false);
                  navigate('/my-courses');
                }}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-colors text-center"
              >
                View My Orders & Courses
              </button>
              <button
                onClick={() => setShowOrderModal(false)}
                className="w-full sm:w-auto py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition-colors text-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
