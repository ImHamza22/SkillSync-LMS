import { createContext, useEffect, useState } from "react";
import { dummyCourses } from "../assets/assets";
import { useNavigate } from "react-router-dom";

export const AppCotext = createContext()

export const AppCotextProvider = (props)=>{

    const currency = import.meta.env.VITE_CURRENCY
    const navigate = useNavigate()

    const [allCourses, setAllCourses] = useState([])
    const [isInstructor, setisInstructor] = useState(true)
    

    //Fetch All Courses
    const fetchAllCourses = async ()=>{
        setAllCourses(dummyCourses)
    }

    //Function to calculate average rating of course

    const calculateRating = (course)=>{
        if(course.courseRatings.length === 0){
            return 0;
        }
        let totalRating = 0
        course.courseRatings.forEach(rating => {
            totalRating += rating.rating
        })
        return totalRating / course.courseRatings.length
    }

    useEffect(()=>{
        fetchAllCourses()
    },[])

    const value = {
        currency, allCourses, navigate, calculateRating,
        isInstructor, setisInstructor

    }

return (

    <AppCotext.Provider value={value}>
        {props.children}
    </AppCotext.Provider>
)

}