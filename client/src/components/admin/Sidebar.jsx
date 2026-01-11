import React, { useContext } from 'react'
import { NavLink } from 'react-router-dom'
import { assets } from '../../assets/assets'
import { AppContext } from '../../context/AppContext'

const Sidebar = () => {
  const { isAdmin } = useContext(AppContext)

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: assets.home_icon },
    { name: 'Users', path: '/admin/users', icon: assets.patients_icon || assets.user_icon },
    { name: 'Instructor Requests', path: '/admin/instructor-requests', icon: assets.add_icon },
    { name: 'Courses', path: '/admin/courses', icon: assets.my_course_icon },
    { name: 'Purchases', path: '/admin/purchases', icon: assets.earning_icon },
  ]

  if (!isAdmin) return null

  return (
    <div className='md:w-64 w-16 border-r min-h-screen text-base border-gray-500 py-2 flex flex-col'>
      {menuItems.map((item) => (
        <NavLink
          to={item.path}
          key={item.name}
          end={item.path === '/admin'}
          className={({ isActive }) =>
            `flex items-center md:flex-row flex-col md:justify-start justify-center py-3.5 md:px-9 gap-3 ${isActive
              ? 'bg-indigo-50 border-r-[6px] border-indigo-500/90'
              : 'hover:bg-gray-100/90 border-r-[6px] border-white hover:border-gray-100/90'
            }`
          }
        >
          <img src={item.icon} alt='' className='w-6 h-6' />
          <p className='md:block hidden text-center'>{item.name}</p>
        </NavLink>
      ))}
    </div>
  )
}

export default Sidebar
