import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';

import Login from '../pages/Login';
import Register from '../pages/Register';

import AuthLayout from '../layouts/AuthLayout';
import Dashboard from '../pages/Dashboard';
import Layout from '../layouts/Layout';
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
    ]
  }
]);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}

