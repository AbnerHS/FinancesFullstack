import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';

import App from '../App';
import Login from '../pages/Login';
import Register from '../pages/Register';

import AuthLayout from '../layouts/AuthLayout';

// Componente raiz que fornece o contexto de autenticação para todas as rotas filhas.
// Como ele é renderizado PELO roteador, AuthProvider pode usar o hook useNavigate.
const AuthRoot = () => {
  return (
    <Outlet />
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
            element: <Login />,
          },
          {
            path: '/register',
            element: <Register />,
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

