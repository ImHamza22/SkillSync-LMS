import React, { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'

import SideBar from '../../components/instructor/Sidebar'
import Navbar from '../../components/instructor/Navbar'
import Footer from '../../components/instructor/Footer'
import Loading from '../../components/student/Loading'

const Instructor = () => {
  const navigate = useNavigate()
  const { user, isLoaded, isSignedIn } = useUser()

  // Read role directly from Clerk to avoid AppContext timing issues on refresh
  const role = user?.publicMetadata?.role

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      navigate('/', { replace: true })
      return
    }

    if (role !== 'instructor') {
      navigate('/instructor-request', { replace: true })
    }
  }, [isLoaded, isSignedIn, role, navigate])

  if (!isLoaded) return <Loading />
  if (!isSignedIn || role !== 'instructor') return null

  return (
    <div className="text-default min-h-screen bg-white">
      <Navbar />
      <div className='flex'>
        <SideBar />
        <div className='flex-1'>
          <Outlet />
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default Instructor
