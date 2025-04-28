import React from 'react'
import {Route, Routes, useMatch} from 'react-router-dom'
import Home from './pages/studetnt/Home'
import CoursesList from './pages/studetnt/CoursesList'
import CourseDetails from './pages/studetnt/CourseDetails'
import MyEnrollments from './pages/studetnt/MyEnrollments'
import Player from './pages/studetnt/Player'
import Loading from './components/student/Loading'
import Instructor from './pages/instructor/Instructor'
import Navbar from './components/student/Navbar'
import Dashboard from './pages/instructor/Dashboard'
import MyCourses from './pages/instructor/MyCourses'
import AddCourse from './pages/instructor/AddCourse'
import StudentsEnrolled from './pages/instructor/StudentsEnrolled'

const App = () => {

 const isInstructorRoute = useMatch('/instructor/*')
  

  return (
    <div className='text-default min-h-screen bg-white'>
      {!isInstructorRoute && <Navbar />}
      <Routes>
        <Route path='/' element={<Home />}/>
        <Route path='/course-list' element={<CoursesList />}/>
        <Route path='/course-list/:input' element={<CoursesList />}/>
        <Route path='/course/:id' element={<CourseDetails />}/>
        <Route path='/my-enrollments' element={<MyEnrollments />}/>
        <Route path='/player/:courseId' element={<Player />}/>
        <Route path='/loading/:path' element={<Loading />}/>
        <Route path='/instructor' element={<Instructor />}>
            <Route path='instructor'element={<Dashboard/>}/>
            <Route path='add-course'element={<AddCourse/>}/>
            <Route path='my-courses'element={<MyCourses/>}/>
            <Route path='student-enrolled'element={<StudentsEnrolled/>}/>
        </Route>
  
      </Routes>
    </div>
  )
}

export default App