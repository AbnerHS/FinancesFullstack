import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

const ProtetectedRoute = ({ children }) => {
    const { accessToken } = useAuthStore();

    if (!accessToken) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtetectedRoute;