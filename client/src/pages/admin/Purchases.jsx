import React, { useContext, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { AppContext } from '../../context/AppContext'

const Purchases = () => {
  const { backendUrl, getToken, currency } = useContext(AppContext)
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const fetchPurchases = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const { data } = await axios.get(`${backendUrl}/api/admin/purchases`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (data.success) {
        setPurchases(data.purchases)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPurchases()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return purchases
    return purchases.filter(p =>
      (p.courseId?.courseTitle || '').toLowerCase().includes(q) ||
      (p.userId?.name || '').toLowerCase().includes(q) ||
      (p.userId?.email || '').toLowerCase().includes(q) ||
      (p.status || '').toLowerCase().includes(q)
    )
  }, [purchases, query])

  return (
    <div className='p-4 sm:p-10'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <h1 className='text-2xl font-semibold'>Purchases</h1>
        <div className='flex gap-2'>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search course, user, status...'
            className='border border-gray-300 rounded px-3 py-2 w-full sm:w-72'
          />
          <button onClick={fetchPurchases} className='px-4 py-2 bg-blue-600 text-white rounded'>Refresh</button>
        </div>
      </div>

      {loading ? (
        <p className='text-gray-500 mt-6'>Loading...</p>
      ) : (
        <div className='mt-6 overflow-x-auto'>
          <table className='min-w-full border'>
            <thead className='text-gray-900 border-b border-gray-500/20 text-sm text-left'>
              <tr>
                <th className='px-4 py-3 font-semibold'>Date</th>
                <th className='px-4 py-3 font-semibold'>Student</th>
                <th className='px-4 py-3 font-semibold'>Course</th>
                <th className='px-4 py-3 font-semibold'>Amount</th>
                <th className='px-4 py-3 font-semibold'>Status</th>
              </tr>
            </thead>
            <tbody className='text-gray-700'>
              {filtered.map((p) => (
                <tr key={p._id} className='border-b border-gray-500/20'>
                  <td className='px-4 py-3'>{p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}</td>
                  <td className='px-4 py-3'>
                    <div className='flex items-center gap-3'>
                      {p.userId?.imageUrl && <img src={p.userId.imageUrl} alt='' className='w-9 h-9 rounded-full object-cover' />}
                      <div>
                        <p className='font-medium'>{p.userId?.name || 'Unknown'}</p>
                        <p className='text-xs text-gray-500'>{p.userId?.email || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className='px-4 py-3'>{p.courseId?.courseTitle || 'Unknown'}</td>
                  <td className='px-4 py-3'>{currency}{p.amount}</td>
                  <td className='px-4 py-3 capitalize'>{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Purchases
