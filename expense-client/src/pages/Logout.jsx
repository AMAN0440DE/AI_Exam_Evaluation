import axios from "axios";
import { useEffect } from "react";
import { serverEndpoint } from "../config/appConfig";
import { useDispatch } from 'react-redux';
import { CLEAR_USER } from "../redux/user/action";

function Logout() {
    const dispatch = useDispatch();

    const handleLogout = async () => {
        try {
            await axios.post(`${serverEndpoint}/auth/logout`, 
                {}, 
                { withCredentials: true }
            );
            document.cookie = `jwtToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            // setUser(null);
            dispatch({
                type: CLEAR_USER
            });
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        handleLogout();
    }, []);
}

export default Logout;