import React, { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import Navbar from '../../components/admin/Navbar'
import Sidebar from '../../components/admin/Sidebar'
import Footer from '../../components/instructor/Footer'
import Loading from '../../components/student/Loading'

const Admin = () => {
  const navigate = useNavigate()
  const { user, isLoaded, isSignedIn } = useUser()

  // Determine role directly from Clerk (reliable on refresh)
  const role = user?.publicMetadata?.role

  useEffect(() => {
    if (!isLoaded) return

    // If not signed in, go home
    if (!isSignedIn) {
      navigate('/', { replace: true })
      return
    }

    // If signed in but not admin, go home
    if (role !== 'admin') {
      navigate('/', { replace: true })
    }
  }, [isLoaded, isSignedIn, role, navigate])

  if (!isLoaded) return <Loading />

  // While redirect is happening (or if blocked), render nothing
  if (!isSignedIn || role !== 'admin') return null

  return (
    <div className="text-default min-h-screen bg-white">
      <Navbar />
      <div className='flex'>
        <Sidebar />
        <div className='flex-1'>
          <Outlet />
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default Admin
