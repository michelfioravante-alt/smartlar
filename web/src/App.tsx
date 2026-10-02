import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { Layout } from './components/Layout'
import { Carregando } from './components/ui'
import { Agenda } from './pages/Agenda'
import { Clientes } from './pages/Clientes'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { NovoPedido } from './pages/NovoPedido'
import { PedidoDetalhe } from './pages/PedidoDetalhe'
import { Pedidos } from './pages/Pedidos'
import { Produtos } from './pages/Produtos'

function RotaProtegida() {
  const { sessao, carregando } = useAuth()
  if (carregando) return <Carregando />
  if (!sessao) return <Navigate to="/login" replace />
  return <Outlet />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RotaProtegida />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="produtos" element={<Produtos />} />
              <Route path="pedidos" element={<Pedidos />} />
              <Route path="pedidos/novo" element={<NovoPedido />} />
              <Route path="pedidos/:id" element={<PedidoDetalhe />} />
              <Route path="agenda" element={<Agenda />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
