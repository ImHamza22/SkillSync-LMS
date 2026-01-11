import React, { useContext, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { AppContext } from '../../context/AppContext'

const statusTabs = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'All', value: 'all' },
]

const InstructorRequests = () => {
  const { backendUrl, getToken } = useContext(AppContext)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')
  const [query, setQuery] = useState('')

  // ✅ UI modal state (replaces window.prompt for rejection note)
  const [rejectModal, setRejectModal] = useState({
    open: false,
    requestId: null,
    userName: '',
    note: '',
  })
  const [rejectingId, setRejectingId] = useState(null)

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const { data } = await axios.get(`${backendUrl}/api/admin/instructor-requests?status=${tab}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (data.success) {
        setRequests(data.requests)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const approve = async (requestId) => {
    try {
      const token = await getToken()
      const { data } = await axios.post(
        `${backendUrl}/api/admin/instructor-requests/${requestId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success(data.message)
        fetchRequests()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  // ✅ Open UI modal instead of browser prompt
  const openRejectModal = (requestId, userName) => {
    setRejectModal({
      open: true,
      requestId,
      userName: userName || '',
      note: '',
    })
  }

  const closeRejectModal = () => {
    if (rejectingId) return
    setRejectModal({ open: false, requestId: null, userName: '', note: '' })
  }

  // ✅ Same API call as before, just uses modal note (optional)
  const confirmReject = async () => {
    if (!rejectModal.requestId) return

    try {
      setRejectingId(rejectModal.requestId)
      const token = await getToken()
      const { data } = await axios.post(
        `${backendUrl}/api/admin/instructor-requests/${rejectModal.requestId}/reject`,
        { decisionNote: rejectModal.note || '' },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success(data.message)
        closeRejectModal()
        fetchRequests()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setRejectingId(null)
    }
  }

  useEffect(() => {
    fetchRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return requests

    return requests.filter(r =>
      (r.user?.name || '').toLowerCase().includes(q) ||
      (r.user?.email || '').toLowerCase().includes(q) ||
      (r.status || '').toLowerCase().includes(q)
    )
  }, [requests, query])

  // Only show Approve/Reject actions in the Pending tab
  const showActions = tab === 'pending'
  const isRejectingThis = rejectModal.open && rejectingId === rejectModal.requestId

  return (
    <div className='p-4 sm:p-10'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <h1 className='text-2xl font-semibold'>Instructor Requests</h1>
        <div className='flex gap-2'>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search user or status...'
            className='border border-gray-300 rounded px-3 py-2 w-full sm:w-72'
          />
          <button onClick={fetchRequests} className='px-4 py-2 bg-blue-600 text-white rounded'>Refresh</button>
        </div>
      </div>

      <div className='flex flex-wrap gap-2 mt-4'>
        {statusTabs.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2 rounded border ${tab === t.value ? 'bg-indigo-50 border-indigo-500' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className='text-gray-500 mt-6'>Loading...</p>
      ) : (
        <div className='mt-6 overflow-x-auto'>
          <table className='min-w-full border'>
            <thead className='text-gray-900 border-b border-gray-500/20 text-sm text-left'>
              <tr>
                <th className='px-4 py-3 font-semibold'>User</th>
                <th className='px-4 py-3 font-semibold'>Message</th>

                {showActions && <th className='px-4 py-3 font-semibold'>Status</th>}

                <th className='px-4 py-3 font-semibold'>Requested</th>

                {showActions ? (
                  <th className='px-4 py-3 font-semibold'>Actions</th>
                ) : (
                  <th className='px-4 py-3 font-semibold'>Status</th>
                )}
              </tr>
            </thead>

            <tbody className='text-gray-700'>
              {filtered.map(r => (
                <tr key={r._id} className='border-b border-gray-500/20 align-top'>
                  <td className='px-4 py-3'>
                    <div className='flex items-center gap-3'>
                      {r.user?.imageUrl && (
                        <img src={r.user.imageUrl} alt='' className='w-10 h-10 rounded-full object-cover' />
                      )}
                      <div>
                        <p className='font-medium'>{r.user?.name || r.userId}</p>
                        <p className='text-sm text-gray-500'>{r.user?.email || ''}</p>
                        <p className='text-xs text-gray-500'>Role: {r.user?.role || 'student'}</p>
                      </div>
                    </div>
                  </td>

                  <td className='px-4 py-3'>
                    <p className='text-sm whitespace-pre-wrap max-w-[420px]'>{r.message || '-'}</p>
                    {r.status === 'rejected' && r.decisionNote && (
                      <p className='text-xs text-red-600 mt-2 whitespace-pre-wrap'>Admin note: {r.decisionNote}</p>
                    )}
                  </td>

                  {showActions && (
                    <td className='px-4 py-3 capitalize'>{r.status}</td>
                  )}

                  <td className='px-4 py-3'>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</td>

                  {showActions ? (
                    <td className='px-4 py-3'>
                      {r.status === 'pending' ? (
                        <div className='flex flex-wrap gap-2'>
                          <button
                            onClick={() => approve(r._id)}
                            className='px-3 py-1.5 rounded bg-green-600 text-white'
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(r._id, r.user?.name || r.userId)}
                            className='px-3 py-1.5 rounded bg-red-600 text-white'
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className='capitalize'>{r.status}</span>
                      )}
                    </td>
                  ) : (
                    <td className='px-4 py-3 capitalize'>{r.status}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <p className='text-gray-500 mt-4'>No requests found.</p>
          )}
        </div>
      )}

      {/* ✅ Reject modal (replaces browser prompt) */}
      {rejectModal.open && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeRejectModal()
          }}
        >
          <div className='w-full max-w-md rounded-xl bg-white p-5 shadow-lg'>
            <div className='flex items-start justify-between gap-4'>
              <div className='min-w-0'>
                <p className='text-lg font-semibold text-gray-900'>Reject instructor request?</p>
                {rejectModal.userName ? (
                  <p className='mt-1 text-sm text-gray-700'>
                    User: <span className='font-medium'>{rejectModal.userName}</span>
                  </p>
                ) : null}
                <p className='mt-3 text-sm text-gray-600'>
                  You can add an optional note that will be shown to the user.
                </p>
              </div>

              <button
                type='button'
                onClick={closeRejectModal}
                disabled={isRejectingThis}
                className={`shrink-0 rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100 ${
                  isRejectingThis ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                aria-label='Close'
              >
                ✕
              </button>
            </div>

            <div className='mt-4'>
              <label className='text-sm text-gray-700'>Decision note (optional)</label>
              <textarea
                className='mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm'
                rows={4}
                value={rejectModal.note}
                onChange={(e) => setRejectModal(prev => ({ ...prev, note: e.target.value }))}
                placeholder='Type a note (optional)...'
                disabled={isRejectingThis}
              />
            </div>

            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                onClick={closeRejectModal}
                disabled={isRejectingThis}
                className={`px-4 py-2 rounded border ${
                  isRejectingThis
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>

              <button
                type='button'
                onClick={confirmReject}
                disabled={isRejectingThis}
                className={`px-4 py-2 rounded text-white ${
                  isRejectingThis ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isRejectingThis ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InstructorRequests
