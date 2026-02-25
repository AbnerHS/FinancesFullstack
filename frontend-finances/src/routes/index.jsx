import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';

import App from '../App';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';

import { AuthProvider } from '../contexts/AuthContext';
import AuthLayout from '../layouts/AuthLayout';

// Componente raiz que fornece o contexto de autenticação para todas as rotas filhas.
// Como ele é renderizado PELO roteador, AuthProvider pode usar o hook useNavigate.
const AuthRoot = () => {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
};

// Layout para páginas que não devem ter o menu principal, como login e registro

const router = createBrowserRouter([
  {
    element: <AuthRoot />,
    // TODO: Adicionar página de erro (errorElement)
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: '/login',
            element: <LoginPage />,
          },
          {
            path: '/register',
            element: <RegisterPage />,
          },
        ],
      },
      {
        path: '/',
        element: <App />,
        children: [
          {
            index: true,
            // TODO: Redirecionar para /dashboard ou para /login se não estiver logado
            element: <h1>Dashboard (Página Principal)</h1>,
          },
          // Adicionar outras rotas principais aqui (ex: /dashboard, /profile, etc.)
        ],
      },
    ],
  },
]);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}

