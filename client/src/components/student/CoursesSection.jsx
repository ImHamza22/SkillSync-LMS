import React from 'react'
import { Link } from 'react-router-dom'

const CoursesSection = () => {
  return (
    <div className='py-16 md:px-40 px-8'>
        <h2 className='text-3xl font-medium text-gray-800"'>Learn from the Best</h2>
        <p className='text-sm md:text-base text-gray-500 mt-3'>Explore our highest-rated courses across a wide range of categories.
        Whether you're interested in coding, design, business, or wellness, each course is designed to help you achieve real results.
        </p>


        <Link to={'course-list'} onClick={()=> scrollTo(0,0)}
        className='text-gray-500 border border-gray-500/30 px-10 py-3 rounded'
        >Show all Courses</Link>
    </div>
  )
}

export default CoursesSection