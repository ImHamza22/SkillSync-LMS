import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import Loading from '../../components/student/Loading';

const MyCourses = () => {

  const { backendUrl, isInstructor, currency, getToken, navigate } = useContext(AppContext)

  const [courses, setCourses] = useState(null)

  const fetchInstructorCourses = async () => {
    try {
      const token = await getToken()
      const { data } = await axios.get(backendUrl + '/api/instructor/courses', { headers: { Authorization: `Bearer ${token}` } })
      data.success && setCourses(data.courses)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const deleteCourse = async (courseId) => {
    try {
      const confirmed = window.confirm('Are you sure you want to delete this course?\n\nNote: If students have purchased/enrolled, deletion will be blocked.');
      if (!confirmed) return;

      const token = await getToken();

      const { data } = await axios.delete(
        backendUrl + `/api/instructor/course/${courseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(data.message);
        fetchInstructorCourses();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  }

  useEffect(() => {
    if (isInstructor) {
      fetchInstructorCourses()
    }
  }, [isInstructor])

  return courses ? (
    <div className="h-screen flex flex-col items-start justify-between md:p-8 md:pb-0 p-4 pt-8 pb-0">
      <div className='w-full'>
        <h2 className="pb-4 text-lg font-medium">My Courses</h2>

        <div className="flex flex-col items-center max-w-4xl w-full rounded-md bg-white border border-gray-500/20">
          <div className='w-full overflow-x-auto'>
            <table className="md:table-auto table-fixed w-full min-w-[820px]">
              <thead className="text-gray-900 border-b border-gray-500/20 text-sm text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold truncate">All Courses</th>
                  <th className="px-4 py-3 font-semibold truncate">Earnings</th>
                  <th className="px-4 py-3 font-semibold truncate">Students</th>
                  <th className="px-4 py-3 font-semibold truncate">Published On</th>
                  <th className="px-4 py-3 font-semibold truncate">Actions</th>
                </tr>
              </thead>

              <tbody className="text-sm text-gray-500">
                {courses.map((course) => (
                  <tr key={course._id} className="border-b border-gray-500/20">
                    <td className="md:px-4 pl-2 md:pl-4 py-3 flex items-center space-x-3 truncate">
                      <img src={course.courseThumbnail} alt="Course Image" className="w-16" />
                      <span className="truncate hidden md:block">{course.courseTitle}</span>
                    </td>

                    <td className="px-4 py-3">
                      {currency} {Math.floor(course.enrolledStudents.length * (course.coursePrice - course.discount * course.coursePrice / 100))}
                    </td>

                    <td className="px-4 py-3">{course.enrolledStudents.length}</td>

                    <td className="px-4 py-3">
                      {new Date(course.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-4 py-3">
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => navigate(`/instructor/edit-course/${course._id}`)}
                          className='px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50'
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => {
                            if (course.enrolledStudents?.length > 0) {
                              toast.error('Cannot delete: students are enrolled. Unpublish/archive instead.');
                              return;
                            }
                            deleteCourse(course._id)
                          }}
                          className={`px-3 py-1 rounded border ${
                            course.enrolledStudents?.length > 0
                              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                              : 'border-red-300 text-red-600 hover:bg-red-50'
                          }`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  ) : <Loading />
};

export default MyCourses;
