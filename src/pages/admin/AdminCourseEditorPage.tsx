import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { courseService } from '../../services/courseService';
import {
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

export const AdminCourseEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructorName, setInstructorName] = useState('NextGen Instructor');
  const [price, setPrice] = useState('0');
  const [whatYouLearn, setWhatYouLearn] = useState<string[]>(['']);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      courseService.getCourseById(id).then(({ data, error }) => {
        if (error || !data) {
          setError(error || 'Failed to find course');
        } else {
          setTitle(data.title);
          setDescription(data.description || '');
          setInstructorName(data.instructor_name || 'NextGen Instructor');
          setPrice(data.price.toString());
          setWhatYouLearn(data.what_you_learn && data.what_you_learn.length > 0 ? data.what_you_learn : ['']);
          setThumbnailUrl(data.thumbnail_url);
          setIsPublished(data.is_published);
        }
        setLoading(false);
      });
    }
  }, [id, isEditing]);

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError(null);

    const { url, error: uploadError } = await courseService.uploadThumbnail(file);
    setUploadingImage(false);

    if (uploadError) {
      setError(`Image upload failed: ${uploadError}`);
    } else if (url) {
      setThumbnailUrl(url);
    }
  };

  const handleAddLearnPoint = () => {
    setWhatYouLearn([...whatYouLearn, '']);
  };

  const handleUpdateLearnPoint = (index: number, val: string) => {
    const updated = [...whatYouLearn];
    updated[index] = val;
    setWhatYouLearn(updated);
  };

  const handleRemoveLearnPoint = (index: number) => {
    setWhatYouLearn(whatYouLearn.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Course title is required.');
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError('Please provide a valid price (greater than or equal to 0).');
      return;
    }

    const cleanedPoints = whatYouLearn.map((p) => p.trim()).filter(Boolean);

    setSaving(true);

    if (isEditing && id) {
      const { error: updateError } = await courseService.updateCourse(id, {
        title: title.trim(),
        description: description.trim(),
        instructor_name: instructorName.trim(),
        price: parsedPrice,
        what_you_learn: cleanedPoints,
        thumbnail_url: thumbnailUrl,
        is_published: isPublished,
      });

      setSaving(false);

      if (updateError) {
        setError(updateError);
      } else {
        navigate('/admin/courses');
      }
    } else {
      const { data, error: createError } = await courseService.createCourse({
        title: title.trim(),
        description: description.trim(),
        instructor_name: instructorName.trim(),
        price: parsedPrice,
        what_you_learn: cleanedPoints,
        thumbnail_url: thumbnailUrl,
        is_published: isPublished,
      });

      setSaving(false);

      if (createError) {
        setError(createError);
      } else if (data) {
        // Optionally redirect to lesson builder for newly created course
        navigate(`/admin/courses/${data.id}/lessons`);
      }
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-xs">Loading course details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center space-x-3">
        <Link
          to="/admin/courses"
          className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditing ? 'Edit Course' : 'Create New Course'}
          </h1>
          <p className="text-xs text-slate-500">
            Fill in the course details, learning outcomes, and upload a thumbnail.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Course Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Modern Full-Stack Development with React & Supabase"
            className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            required
          />
        </div>

        {/* Instructor & Price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Instructor Name *
            </label>
            <input
              type="text"
              value={instructorName}
              onChange={(e) => setInstructorName(e.target.value)}
              placeholder="e.g. NextGen Faculty"
              className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Price (INR ₹) - 0 for Free
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Course Description
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide a clear, practical summary of this course..."
            className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          ></textarea>
        </div>

        {/* Thumbnail Upload */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
            Thumbnail Image (Supabase Storage)
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-48 aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
              {thumbnailUrl ? (
                <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-slate-400">No Image</span>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <label className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors">
                <Upload className="w-4 h-4 mr-1.5" />
                <span>{uploadingImage ? 'Uploading image...' : 'Upload Image File'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-slate-400">
                Recommended 16:9 ratio (e.g. 1280x720). Uploads directly to public storage bucket.
              </p>
            </div>
          </div>
        </div>

        {/* What You'll Learn Dynamic List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase">
              What You'll Learn (Bullet Points)
            </label>
            <button
              type="button"
              onClick={handleAddLearnPoint}
              className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Point
            </button>
          </div>

          <div className="space-y-2.5">
            {whatYouLearn.map((point, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={point}
                  onChange={(e) => handleUpdateLearnPoint(index, e.target.value)}
                  placeholder={`Key learning outcome #${index + 1}`}
                  className="flex-1 px-4 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                {whatYouLearn.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLearnPoint(index)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Publishing Status */}
        <div className="pt-4 border-t border-slate-100 flex items-center space-x-3">
          <input
            type="checkbox"
            id="isPublished"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
          />
          <label htmlFor="isPublished" className="text-xs font-semibold text-slate-800 cursor-pointer">
            Publish this course publicly immediately (students can browse and enroll)
          </label>
        </div>

        {/* Actions */}
        <div className="pt-4 flex items-center justify-end space-x-3">
          <Link
            to="/admin/courses"
            className="px-5 py-2.5 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
          >
            <CheckCircle className="w-4 h-4 mr-1.5" />
            <span>{saving ? 'Saving Course...' : isEditing ? 'Save Changes' : 'Create & Continue'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
