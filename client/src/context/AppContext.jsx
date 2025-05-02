import { createContext, useEffect, useState } from "react";
import { dummyCourses } from "../assets/assets";

export const AppCotext = createContext()

export const AppCotextProvider = (props)=>{

    const currency = import.meta.env.VITE_CURRENCY

    const [allCourses, setAllCourses] = useState([])

    //Fetch All Courses
    const fetchAllCourses = async ()=>{
        setAllCourses(dummyCourses)
    }

    useEffect(()=>{
        fetchAllCourses()
    },[])

    const value = {
        currency, allCourses

    }

return (

    <AppCotext.Provider value={value}>
        {props.children}
    </AppCotext.Provider>
)

}