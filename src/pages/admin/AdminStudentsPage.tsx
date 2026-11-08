import React, { useEffect, useState } from 'react';
import { studentService } from '../../services/studentService';
import { courseService } from '../../services/courseService';
import { enrollmentService } from '../../services/enrollmentService';
import { UserProfile, Course } from '../../types';
import { formatPhoneForDisplay } from '../../lib/phoneUtils';
import {
  Search,
  Key,
  BookOpen,
  X,
  AlertCircle,
  CheckCircle,
  Copy,
  Check,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';

export const AdminStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Password Reset Modal State
  const [resetModalStudent, setResetModalStudent] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{
    success: boolean;
    error?: string | null;
    sqlFallback?: string;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Owned Courses Modal State
  const [coursesModalStudent, setCoursesModalStudent] = useState<UserProfile | null>(null);
  const [studentEnrollments, setStudentEnrollments] = useState<any[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [selectedCourseToGrant, setSelectedCourseToGrant] = useState('');
  const [grantingAccess, setGrantingAccess] = useState(false);

  const loadStudents = async (query?: string) => {
    setLoading(true);
    const { data } = await studentService.getStudents(query);
    if (data) setStudents(data);
    setLoading(false);
  };

  useEffect(() => {
    loadStudents();
    courseService.getAllCoursesAdmin().then(({ data }) => {
      if (data) setAllCourses(data);
    });
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadStudents(searchQuery);
  };

  // Open Password Reset Modal
  const openResetModal = (student: UserProfile) => {
    setResetModalStudent(student);
    setNewPassword('');
    setResetResult(null);
  };

  const handleExecuteResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalStudent) return;

    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters long.');
      return;
    }

    setResetLoading(true);
    const res = await studentService.resetPassword(resetModalStudent.id, newPassword);
    setResetLoading(false);
    setResetResult(res);
  };

  // Open Owned Courses Modal
  const openCoursesModal = async (student: UserProfile) => {
    setCoursesModalStudent(student);
    setLoadingEnrollments(true);
    setSelectedCourseToGrant('');
    const { data } = await studentService.getStudentEnrollments(student.id);
    setStudentEnrollments(data || []);
    setLoadingEnrollments(false);
  };

  const handleGrantAccess = async () => {
    if (!coursesModalStudent || !selectedCourseToGrant) return;
    setGrantingAccess(true);
    const { error } = await enrollmentService.grantAccess(coursesModalStudent.id, selectedCourseToGrant);
    setGrantingAccess(false);

    if (!error) {
      // Reload
      const { data } = await studentService.getStudentEnrollments(coursesModalStudent.id);
      setStudentEnrollments(data || []);
      setSelectedCourseToGrant('');
    } else {
      alert(`Failed to grant access: ${error}`);
    }
  };

  const handleRevokeAccess = async (courseId: string) => {
    if (!coursesModalStudent) return;
    if (!window.confirm('Are you sure you want to revoke access to this course?')) return;

    const { error } = await enrollmentService.revokeAccess(coursesModalStudent.id, courseId);
    if (!error) {
      const { data } = await studentService.getStudentEnrollments(coursesModalStudent.id);
      setStudentEnrollments(data || []);
    } else {
      alert(`Failed to revoke access: ${error}`);
    }
  };

  const copySqlToClipboard = (sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Student Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse users, inspect owned courses, and reset credentials for phone-based accounts.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </form>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">Loading student directory...</div>
        ) : students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Joined Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => {
                  const isPhoneAccount = student.email?.endsWith('@phone.nextgen.local');
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">
                          {student.full_name || 'Unnamed Student'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {student.id.substring(0, 13)}...
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {isPhoneAccount ? (
                          <span className="font-semibold text-slate-800">
                            {formatPhoneForDisplay(student.phone)}
                          </span>
                        ) : (
                          <span className="text-slate-700">
                            {student.email || formatPhoneForDisplay(student.phone) || '-'}
                          </span>
                        )}
                        {isPhoneAccount && (
                          <span className="block text-[10px] text-indigo-600 font-semibold mt-0.5">
                            Mobile Account (Simple Mode)
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            student.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {student.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                          {student.role}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {new Date(student.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openCoursesModal(student)}
                            className="inline-flex items-center px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                            title="View Owned Courses"
                          >
                            <BookOpen className="w-3.5 h-3.5 mr-1 text-slate-500" />
                            <span>Courses</span>
                          </button>

                          <button
                            onClick={() => openResetModal(student)}
                            className="inline-flex items-center px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-lg text-xs transition-colors"
                            title="Reset Password (Needed for simple phone mode)"
                          >
                            <Key className="w-3.5 h-3.5 mr-1" />
                            <span>Reset Pass</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500 text-xs">
            No students found matching your criteria.
          </div>
        )}
      </div>

      {/* Password Reset Modal */}
      {resetModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Reset Student Password</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  User: <strong>{resetModalStudent.full_name}</strong>
                </p>
              </div>
              <button
                onClick={() => setResetModalStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetResult && resetResult.success ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-2">
                <div className="flex items-center space-x-2 font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Password updated successfully!</span>
                </div>
                <p>The student can now log in immediately with this new password.</p>
              </div>
            ) : resetResult && !resetResult.success ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Edge Function Notice:</span>
                    <p className="mt-0.5">{resetResult.error}</p>
                  </div>
                </div>

                {resetResult.sqlFallback && (
                  <div className="pt-2 border-t border-amber-200 space-y-2">
                    <p className="font-semibold">Instant Direct SQL Alternative:</p>
                    <div className="relative bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto">
                      <code>{resetResult.sqlFallback}</code>
                      <button
                        onClick={() => copySqlToClipboard(resetResult.sqlFallback!)}
                        className="absolute right-2 top-2 p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                        title="Copy SQL Query"
                      >
                        {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleExecuteResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    New Password (min 8 characters)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new student password"
                      className="w-full px-4 py-2 pr-10 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setResetModalStudent(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-sm"
                  >
                    {resetLoading ? 'Resetting...' : 'Set Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Owned Courses Modal */}
      {coursesModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Enrolled Courses</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Student: <strong>{coursesModalStudent.full_name}</strong>
                </p>
              </div>
              <button
                onClick={() => setCoursesModalStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grant Access Picker */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Grant Access to a Course
              </label>
              <div className="flex space-x-2">
                <select
                  value={selectedCourseToGrant}
                  onChange={(e) => setSelectedCourseToGrant(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Choose a course --</option>
                  {allCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleGrantAccess}
                  disabled={!selectedCourseToGrant || grantingAccess}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  {grantingAccess ? 'Granting...' : 'Grant'}
                </button>
              </div>
            </div>

            {/* Current Enrollments */}
            {loadingEnrollments ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading courses...</div>
            ) : studentEnrollments.length > 0 ? (
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {studentEnrollments.map((enr) => (
                  <div key={enr.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{enr.courses?.title || 'Course'}</p>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold mt-0.5 ${
                          enr.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {enr.status}
                      </span>
                    </div>

                    {enr.status === 'active' ? (
                      <button
                        onClick={() => handleRevokeAccess(enr.course_id)}
                        className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        Revoke Access
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          await enrollmentService.grantAccess(coursesModalStudent.id, enr.course_id);
                          const { data } = await studentService.getStudentEnrollments(coursesModalStudent.id);
                          setStudentEnrollments(data || []);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg"
                      >
                        Re-activate
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No active or historical course enrollments for this user.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
