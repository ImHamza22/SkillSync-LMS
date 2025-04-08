import { createContext } from "react";

export const AppCotext = createContext()

export const AppCotextProvider = (props)=>{

    const value = {

    }

return (

    <AppCotext.Provider value={value}>
        {props.children}
    </AppCotext.Provider>
)

}