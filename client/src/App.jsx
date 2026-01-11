import React, { useContext } from 'react'
import { Routes, Route, useLocation, useMatch } from 'react-router-dom'
import Navbar from './components/student/Navbar'
import Home from './pages/student/Home'
import CourseDetails from './pages/student/CourseDetails'
import CoursesList from './pages/student/CoursesList'
import Dashboard from './pages/instructor/Dashboard'
import AddCourse from './pages/instructor/AddCourse'
import EditCourse from './pages/instructor/EditCourse'
import MyCourses from './pages/instructor/MyCourses'
import StudentsEnrolled from './pages/instructor/StudentsEnrolled'
import Instructor from './pages/instructor/Instructor'
import Admin from './pages/admin/Admin'
import AdminDashboard from './pages/admin/AdminDashboard'
import ManageUsers from './pages/admin/ManageUsers'
import ManageCourses from './pages/admin/ManageCourses'
import Purchases from './pages/admin/Purchases'
import InstructorRequests from './pages/admin/InstructorRequests'
import 'quill/dist/quill.snow.css'
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify'
import Player from './pages/student/Player'
import MyEnrollments from './pages/student/MyEnrollments'
import BootstrapAdmin from './pages/student/BootstrapAdmin'
import InstructorRequest from './pages/student/InstructorRequest'
import Loading from './components/student/Loading'

const App = () => {

  const isInstructorRoute = useMatch('/instructor/*');
  const isAdminRoute = useMatch('/admin/*')

  return (
    <div className="text-default min-h-screen bg-white">
      <ToastContainer />
      {/* Render Student Navbar only if not on instructor routes */}
      {!isInstructorRoute && !isAdminRoute && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/course/:id" element={<CourseDetails />} />
        <Route path="/course-list" element={<CoursesList />} />
        <Route path="/course-list/:input" element={<CoursesList />} />
        <Route path="/my-enrollments" element={<MyEnrollments />} />
        <Route path="/admin-setup" element={<BootstrapAdmin />} />
        <Route path="/instructor-request" element={<InstructorRequest />} />
        <Route path="/player/:courseId" element={<Player />} />
        <Route path="/loading/:path" element={<Loading />} />
        <Route path='/instructor' element={<Instructor />}>
          <Route index element={<Dashboard />} />
          <Route path='add-course' element={<AddCourse />} />
          <Route path='edit-course/:id' element={<EditCourse />} />
          <Route path='my-courses' element={<MyCourses />} />
          <Route path='student-enrolled' element={<StudentsEnrolled />} />
        </Route>

        <Route path="/admin/*" element={<Admin />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<ManageUsers />} />
        <Route path="instructor-requests" element={<InstructorRequests />} />
        <Route path="courses" element={<ManageCourses />} />
        <Route path="purchases" element={<Purchases />} />
        </Route>

      </Routes>
    </div>
  )
}

export default App