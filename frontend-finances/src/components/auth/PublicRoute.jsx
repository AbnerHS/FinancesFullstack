import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const PublicRoute = ({ children }) => {
  const accessToken = useAuthStore((state) => state.accessToken);

  if (accessToken) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PublicRoute;