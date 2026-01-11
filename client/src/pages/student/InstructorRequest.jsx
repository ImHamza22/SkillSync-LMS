import React, { useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useUser } from '@clerk/clerk-react'
import { AppContext } from '../../context/AppContext'

const InstructorRequest = () => {
  const { backendUrl, getToken, navigate, isInstructor } = useContext(AppContext)
  const { user, isLoaded } = useUser()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [request, setRequest] = useState(null)
  const [message, setMessage] = useState('')
  const [limit, setLimit] = useState(null)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const { data } = await axios.get(`${backendUrl}/api/user/instructor-request`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (data.success) {
        setRequest(data.request)
        setMessage(data.request?.message || '')
        setLimit(data.limit || null)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const submitRequest = async () => {
    try {
      if (limit && limit.remainingToday === 0) {
        toast.error('Daily limit reached. Try again tomorrow.')
        return
      }
      setSubmitting(true)
      const token = await getToken()
      const { data } = await axios.post(
        `${backendUrl}/api/user/instructor-request`,
        { message },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success(data.message)
        fetchStatus()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const refreshRoleAndGo = async () => {
    try {
      if (user?.reload) {
        await user.reload()
      }
      navigate('/instructor')
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    if (isLoaded && user) {
      fetchStatus()
    }
    if (isLoaded && !user) {
      navigate('/')
    }
  }, [isLoaded, user])

  if (!isLoaded) return null

  const remainingToday = typeof limit?.remainingToday === 'number' ? limit.remainingToday : null

  return (
    <div className='md:px-36 px-8 pt-10 pb-16'>
      <div className='flex items-center justify-between gap-3'>
        <h1 className='text-2xl font-semibold'>Instructor Request</h1>
        <button onClick={fetchStatus} className='px-4 py-2 bg-blue-600 text-white rounded'>Refresh</button>
      </div>

      {loading ? (
        <p className='text-gray-500 mt-6'>Loading...</p>
      ) : (
        <div className='mt-6 max-w-2xl'>
          {isInstructor ? (
            <div className='border border-gray-300 rounded p-4 bg-white'>
              <p className='text-gray-600'>Status:</p>
              <p className='text-lg font-semibold capitalize mt-1'>approved</p>
              <div className='mt-4'>
                <p className='text-gray-600'>Approved. Refresh your role and open the instructor dashboard.</p>
                <button
                  onClick={refreshRoleAndGo}
                  className='mt-3 px-5 py-2 rounded bg-green-600 text-white'
                >
                  Go to Instructor Dashboard
                </button>
              </div>
            </div>
          ) : !request ? (
            <>
              <p className='text-gray-600'>Submit a request to become an instructor. Admin approval is required.</p>
              {typeof remainingToday === 'number' && (
                <p className='text-sm text-gray-500 mt-2'>Remaining requests today: {remainingToday} / {limit?.dailyMax || 2}</p>
              )}
              <textarea
                className='mt-4 w-full border border-gray-300 rounded p-3 min-h-[120px]'
                placeholder='Optional: tell the admin why you want to become an instructor (experience, topics, etc.)'
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button
                disabled={submitting || remainingToday === 0}
                onClick={submitRequest}
                className={`mt-4 px-5 py-2 rounded text-white ${(submitting || remainingToday === 0) ? 'bg-gray-400' : 'bg-blue-600'}`}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </>
          ) : (
            <>
              <div className='border border-gray-300 rounded p-4 bg-white'>
                <p className='text-gray-600'>Status:</p>
                <p className='text-lg font-semibold capitalize mt-1'>{request.status}</p>

                {typeof remainingToday === 'number' && (
                  <p className='text-sm text-gray-500 mt-2'>Remaining requests today: {remainingToday} / {limit?.dailyMax || 2}</p>
                )}

                {request.createdAt && (
                  <p className='text-sm text-gray-500 mt-1'>Requested: {new Date(request.createdAt).toLocaleString()}</p>
                )}

                {request.status === 'rejected' && request.decisionNote && (
                  <div className='mt-3'>
                    <p className='text-gray-600'>Admin note:</p>
                    <p className='text-gray-800 mt-1'>{request.decisionNote}</p>
                  </div>
                )}

                {request.status === 'pending' && (
                  <p className='text-gray-600 mt-3'>Your request is pending. You will be able to access the instructor dashboard once approved.</p>
                )}
              </div>

              {request.status === 'rejected' && (
                <div className='mt-6'>
                  <p className='text-gray-600'>You can update your message and re-submit.</p>
                  <textarea
                    className='mt-3 w-full border border-gray-300 rounded p-3 min-h-[120px]'
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <button
                    disabled={submitting || remainingToday === 0}
                    onClick={submitRequest}
                    className={`mt-4 px-5 py-2 rounded text-white ${(submitting || remainingToday === 0) ? 'bg-gray-400' : 'bg-blue-600'}`}
                  >
                    {submitting ? 'Submitting...' : 'Re-submit Request'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default InstructorRequest
