import React, { useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { AppContext } from '../../context/AppContext'

const StatCard = ({ label, value }) => (
  <div className='border border-gray-300 rounded bg-white p-4'>
    <p className='text-sm text-gray-500'>{label}</p>
    <p className='text-2xl font-semibold text-gray-900 mt-1'>{value}</p>
  </div>
)

const AdminDashboard = () => {
  const { backendUrl, getToken, currency } = useContext(AppContext)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const res = await axios.get(`${backendUrl}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.data.success) {
        setData(res.data.dashboardData)
      } else {
        toast.error(res.data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  return (
    <div className='p-4 sm:p-10'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>Admin Dashboard</h1>
        <button
          onClick={fetchDashboard}
          className='px-4 py-2 bg-blue-600 text-white rounded'
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className='text-gray-500 mt-6'>Loading...</p>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6'>
          <StatCard label='Total Users' value={data?.totalUsers ?? 0} />
          <StatCard label='Total Courses' value={data?.totalCourses ?? 0} />
          <StatCard label='Published Courses' value={data?.publishedCourses ?? 0} />
          <StatCard label='Unpublished Courses' value={data?.unpublishedCourses ?? 0} />
          <StatCard label='Pending Purchases' value={data?.pendingPurchases ?? 0} />
          <StatCard label='Completed Purchases' value={data?.completedPurchases ?? 0} />
          <StatCard label='Tracked Course Progress Docs' value={data?.totalCourseProgressDocs ?? 0} />
          <StatCard label='Total Revenue' value={`${currency || ''}${data?.totalRevenue?.toFixed ? data.totalRevenue : (data?.totalRevenue ?? 0)}`} />
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
