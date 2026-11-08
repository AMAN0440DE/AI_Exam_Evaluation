import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
function ProtectedRoute({ roles, children }) {
    const user = useSelector(state => state.userDetails);
    return roles.includes(user?.role) ? children : <Navigate to='/unauthorized-access' />;
}
export default ProtectedRoute;