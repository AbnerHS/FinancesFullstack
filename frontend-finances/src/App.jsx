import { Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar name={user?.name} onLogout={logout} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
