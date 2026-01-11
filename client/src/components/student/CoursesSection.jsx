import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import CourseCard from './CourseCard';
import { Link } from 'react-router-dom';

const CoursesSection = () => {

  const { allCourses } = useContext(AppContext)

  return (
    <div className="py-4 md:px-40 px-8">
      <h2 className="text-3xl font-medium text-gray-800">Learn from the best</h2>
      <p className="md:text-base text-sm text-gray-500 mt-3">
        Explore our highest-rated courses across a wide range of categories.
        Whether you're interested in coding, design, business, or wellness, <br /> each course is designed to help you achieve real results.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 px-4 md:px-0 md:my-16 my-10 gap-4">
        {[...allCourses].sort(() => Math.random() - 0.5).slice(0, 4).map((course) => <CourseCard key={course._id} course={course} />)}
      </div>
      <Link to={'/course-list'} onClick={() => scrollTo(0, 0)} className="text-white bg-blue-600 border border-gray-500/30 px-10 py-3 rounded">Show all courses</Link>
    </div>
  );
};

export default CoursesSection;
