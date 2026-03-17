import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';

import Login from '../pages/Login';
import Register from '../pages/Register';

import AuthLayout from '../layouts/AuthLayout';
import Dashboard from '../pages/Dashboard';
import Layout from '../layouts/Layout';
import Cards from '../pages/Cards';
import Partner from '../pages/Partner';
import Periods from '../pages/Periods';
import Plans from '../pages/Plans';
import Profile from '../pages/Profile';
import ProtetectedRoute from '../components/auth/ProtectedRoute';
import PublicRoute from '../components/auth/PublicRoute';

const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element:
          <PublicRoute>
            <Login />
          </PublicRoute>,
      },
      {
        path: '/register',
        element:
          <PublicRoute>
            <Register />
          </PublicRoute>,
      },
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
      }
    ],
  },
  {
    element:
      <ProtetectedRoute>
        <Layout />
      </ProtetectedRoute>,
    children: [
      {
        path: '/dashboard',
        element: <Dashboard />,
      },
      {
        path: '/profile',
        element: <Profile />,
      },
      {
        path: '/plans',
        element: <Plans />,
      },
      {
        path: '/periods',
        element: <Periods />,
      },
      {
        path: '/cards',
        element: <Cards />,
      },
      {
        path: '/partner',
        element: <Partner />,
      },
    ]
  }
]);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}

