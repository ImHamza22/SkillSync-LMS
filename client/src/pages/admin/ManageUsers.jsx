import React, { useContext, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { AppContext } from '../../context/AppContext'

const ManageUsers = () => {
  const { backendUrl, getToken, userData } = useContext(AppContext)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const { data } = await axios.get(`${backendUrl}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (data.success) {
        setUsers(data.users)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const setRole = async (targetUserId, role) => {
    try {
      const token = await getToken()
      const { data } = await axios.post(
        `${backendUrl}/api/admin/users/set-role`,
        { userId: targetUserId, role },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success(data.message)
        fetchUsers()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    )
  }, [users, query])

  return (
    <div className='p-4 sm:p-10'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <h1 className='text-2xl font-semibold'>Manage Users</h1>
        <div className='flex gap-2'>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search name, email, role...'
            className='border border-gray-300 rounded px-3 py-2 w-full sm:w-72'
          />
          <button onClick={fetchUsers} className='px-4 py-2 bg-blue-600 text-white rounded'>Refresh</button>
        </div>
      </div>

      {loading ? (
        <p className='text-gray-500 mt-6'>Loading...</p>
      ) : (
        <div className='mt-6 overflow-x-auto'>
          <table className='min-w-full border'>
            <thead className='text-gray-900 border-b border-gray-500/20 text-sm text-left'>
              <tr>
                <th className='px-4 py-3 font-semibold'>User</th>
                <th className='px-4 py-3 font-semibold'>Role</th>
                <th className='px-4 py-3 font-semibold'>Enrolled Courses</th>
                <th className='px-4 py-3 font-semibold'>Created</th>
                <th className='px-4 py-3 font-semibold'>Actions</th>
              </tr>
            </thead>
            <tbody className='text-gray-700'>
              {filtered.map((u) => {
                const isSelf = userData?._id === u._id
                const effectiveRole = u.role || 'student'
                const isAdminRow = effectiveRole === 'admin'

                const disableMakeStudent = isSelf || effectiveRole === 'student'
                const disableMakeInstructor = isSelf || effectiveRole === 'instructor'

                return (
                  <tr key={u._id} className='border-b border-gray-500/20'>
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-3'>
                        <img src={u.imageUrl} alt='' className='w-10 h-10 rounded-full object-cover' />
                        <div>
                          <p className='font-medium'>{u.name}</p>
                          <p className='text-sm text-gray-500'>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className='px-4 py-3 capitalize'>{effectiveRole}</td>
                    <td className='px-4 py-3'>{u.enrolledCourses?.length || 0}</td>
                    <td className='px-4 py-3'>{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
                    <td className='px-4 py-3'>
                      {isAdminRow ? (
                        <span className='text-gray-500'>Admin (locked)</span>
                      ) : (
                        <div className='flex flex-wrap gap-2'>
                          <button
                          disabled={disableMakeStudent}
                          onClick={() => setRole(u._id, 'student')}
                          className={`px-3 py-1.5 rounded text-white ${
                            disableMakeStudent
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-gray-700 hover:bg-gray-800'
                            }`}
                            >
                              Make Student
                            </button>

                          <button
                            disabled={disableMakeInstructor}
                            onClick={() => setRole(u._id, 'instructor')}
                            className={`px-3 py-1.5 rounded bg-blue-600 text-white ${
                              disableMakeInstructor ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            Make Instructor
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ManageUsers
