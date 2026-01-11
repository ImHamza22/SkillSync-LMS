import React, { useContext, useState } from 'react'
import axios from 'axios'
import { useUser } from '@clerk/clerk-react'
import { toast } from 'react-toastify'
import { AppContext } from '../../context/AppContext'

const BootstrapAdmin = () => {
  const { user } = useUser()
  const { backendUrl, getToken, setIsAdmin, navigate } = useContext(AppContext)
  const [loading, setLoading] = useState(false)

  const bootstrap = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const { data } = await axios.get(`${backendUrl}/api/admin/bootstrap`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (data.success) {
        toast.success(data.message)
        setIsAdmin(true)
        if (user?.reload) {
          await user.reload()
        }
        navigate('/admin')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='md:px-36 px-8 pt-10'>
      <h1 className='text-2xl font-semibold'>Admin Setup</h1>
      <p className='text-gray-600 mt-2 max-w-2xl'>
        This page is only for the single configured admin user. The server will allow this action only if your Clerk User ID matches <span className='font-medium'>ADMIN_USER_ID</span> in the server .env.
      </p>

      {!user ? (
        <p className='text-gray-500 mt-6'>Please sign in first.</p>
      ) : (
        <button
          onClick={bootstrap}
          disabled={loading}
          className={`mt-6 px-5 py-2 rounded text-white ${loading ? 'bg-gray-400' : 'bg-blue-600'}`}
        >
          {loading ? 'Setting up...' : 'Bootstrap Admin Role'}
        </button>
      )}
    </div>
  )
}

export default BootstrapAdmin
