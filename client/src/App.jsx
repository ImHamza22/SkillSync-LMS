import React from 'react'
import {Route, Routes} from 'react-router-dom'
import Home from './pages/studetnt/Home'
import CoursesList from './pages/studetnt/CoursesList'
import CourseDetails from './pages/studetnt/CourseDetails'
import MyEnrollments from './pages/studetnt/MyEnrollments'
import Player from './pages/studetnt/Player'
import Loading from './components/student/Loading'
import Instructor from './pages/instructor/Instructor'
import Navbar from './components/student/Navbar'

const App = () => {
  return (
    <div className='text-default min-h-screen bg-white'>
      <Navbar />
      <Routes>
        <Route path='/' element={<Home />}/>
        <Route path='/course-list' element={<CoursesList />}/>
        <Route path='/course-list/:input' element={<CoursesList />}/>
        <Route path='/course/:id' element={<CourseDetails />}/>
        <Route path='/my-enrollments' element={<MyEnrollments />}/>
        <Route path='/player/:courseId' element={<Player />}/>
        <Route path='/loading/:path' element={<Loading />}/>
        <Route path='/instructor' element={<Instructor />}>

        </Route>
  
      </Routes>
    </div>
  )
}

export default App