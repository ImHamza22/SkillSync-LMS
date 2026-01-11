import React, { useContext, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { AppContext } from '../../context/AppContext'

const ManageCourses = () => {
  const { backendUrl, getToken, currency } = useContext(AppContext)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  // UI confirm modal state (replaces window.confirm)
  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    courseId: null,
    courseTitle: '',
  })

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const { data } = await axios.get(`${backendUrl}/api/admin/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (data.success) setCourses(data.courses)
      else toast.error(data.message)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const togglePublish = async (courseId, isPublished) => {
    try {
      const token = await getToken()
      const { data } = await axios.post(
        `${backendUrl}/api/admin/courses/toggle-publish`,
        { courseId, isPublished },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success(data.message)
        setCourses((prev) => prev.map(c => c._id === courseId ? { ...c, isPublished } : c))
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  // ✅ Admin hard delete (no restriction) — same delete logic as before
  const performDeleteCourse = async (courseId) => {
    try {
      setDeletingId(courseId)
      const token = await getToken()

      const { data } = await axios.delete(
        `${backendUrl}/api/admin/courses/${courseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success(data.message)
        setCourses(prev => prev.filter(c => c._id !== courseId))
        setConfirmDelete({ open: false, courseId: null, courseTitle: '' })
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setDeletingId(null)
    }
  }

  // Open UI modal instead of window.confirm
  const requestDelete = (courseId, courseTitle) => {
    setConfirmDelete({ open: true, courseId, courseTitle: courseTitle || '' })
  }

  const closeConfirm = () => {
    // Don’t close while actively deleting that same course
    if (deletingId && deletingId === confirmDelete.courseId) return
    setConfirmDelete({ open: false, courseId: null, courseTitle: '' })
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return courses
    return courses.filter(c =>
      (c.courseTitle || '').toLowerCase().includes(q) ||
      (c.instructor?.name || '').toLowerCase().includes(q)
    )
  }, [courses, query])

  const isDeletingThisConfirm =
    confirmDelete.open && confirmDelete.courseId && deletingId === confirmDelete.courseId

  return (
    <div className='p-4 sm:p-10'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <h1 className='text-2xl font-semibold'>Manage Courses</h1>
        <div className='flex gap-2'>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search title or instructor...'
            className='border border-gray-300 rounded px-3 py-2 w-full sm:w-72'
          />
          <button onClick={fetchCourses} className='px-4 py-2 bg-blue-600 text-white rounded'>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p className='text-gray-500 mt-6'>Loading...</p>
      ) : (
        <div className='mt-6 overflow-x-auto'>
          <table className='min-w-full border'>
            <thead className='text-gray-900 border-b border-gray-500/20 text-sm text-left'>
              <tr>
                <th className='px-4 py-3 font-semibold'>Course</th>
                <th className='px-4 py-3 font-semibold'>Instructor</th>
                <th className='px-4 py-3 font-semibold'>Price</th>
                <th className='px-4 py-3 font-semibold'>Enrolled</th>
                <th className='px-4 py-3 font-semibold'>Published</th>
                <th className='px-4 py-3 font-semibold'>Created</th>
                <th className='px-4 py-3 font-semibold'>Actions</th>
              </tr>
            </thead>

            <tbody className='text-gray-700'>
              {filtered.map((c) => (
                <tr key={c._id} className='border-b border-gray-500/20'>
                  <td className='px-4 py-3'>
                    <p className='font-medium'>{c.courseTitle}</p>
                    <p className='text-xs text-gray-500'>Discount: {c.discount}%</p>
                  </td>

                  <td className='px-4 py-3'>
                    <div className='flex items-center gap-2'>
                      {c.instructor?.imageUrl && (
                        <img
                          src={c.instructor.imageUrl}
                          alt=''
                          className='w-8 h-8 rounded-full object-cover'
                        />
                      )}
                      <div>
                        <p>{c.instructor?.name || 'Unknown'}</p>
                        <p className='text-xs text-gray-500'>{c.instructor?.email || ''}</p>
                      </div>
                    </div>
                  </td>

                  <td className='px-4 py-3'>{currency}{c.coursePrice}</td>
                  <td className='px-4 py-3'>{c.enrolledStudents?.length || 0}</td>

                  <td className='px-4 py-3'>
                    <label className='inline-flex items-center gap-2 cursor-pointer'>
                      <input
                        type='checkbox'
                        checked={!!c.isPublished}
                        onChange={(e) => togglePublish(c._id, e.target.checked)}
                      />
                      <span className='text-sm'>{c.isPublished ? 'Yes' : 'No'}</span>
                    </label>
                  </td>

                  <td className='px-4 py-3'>
                    {c.createdAt ? new Date(c.createdAt).toLocaleString() : '-'}
                  </td>

                  <td className='px-4 py-3'>
                    <button
                      onClick={() => requestDelete(c._id, c.courseTitle)}
                      disabled={deletingId === c._id}
                      className={`px-3 py-1 rounded border ${
                        deletingId === c._id
                          ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-red-300 text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {deletingId === c._id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* UI Confirmation Modal (replaces window.confirm) */}
      {confirmDelete.open && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
          onMouseDown={(e) => {
            // click outside to close (only if not deleting)
            if (e.target === e.currentTarget) closeConfirm()
          }}
        >
          <div className='w-full max-w-md rounded-xl bg-white p-5 shadow-lg'>
            <div className='flex items-start justify-between gap-4'>
              <div className='min-w-0'>
                <p className='text-lg font-semibold text-gray-900'>Delete course?</p>
                {confirmDelete.courseTitle ? (
                  <p className='mt-1 text-sm text-gray-700'>
                    <span className='font-medium'>Course:</span> {confirmDelete.courseTitle}
                  </p>
                ) : null}
                <p className='mt-3 text-sm text-gray-600'>
                  This will permanently delete the course (including enrollments/purchases/progress if your backend cleans them).
                </p>
              </div>

              <button
                type='button'
                onClick={closeConfirm}
                disabled={isDeletingThisConfirm}
                className={`shrink-0 rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100 ${
                  isDeletingThisConfirm ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                aria-label='Close'
              >
                ✕
              </button>
            </div>

            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                onClick={closeConfirm}
                disabled={isDeletingThisConfirm}
                className={`px-4 py-2 rounded border ${
                  isDeletingThisConfirm
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>

              <button
                type='button'
                onClick={() => performDeleteCourse(confirmDelete.courseId)}
                disabled={isDeletingThisConfirm}
                className={`px-4 py-2 rounded text-white ${
                  isDeletingThisConfirm ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isDeletingThisConfirm ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManageCourses
