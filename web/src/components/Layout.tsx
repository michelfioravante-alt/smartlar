import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

const MENU = [
  { para: '/', rotulo: 'Dashboard', icone: '📊' },
  { para: '/pedidos/novo', rotulo: 'Novo pedido', icone: '➕' },
  { para: '/pedidos', rotulo: 'Pedidos', icone: '📋' },
  { para: '/agenda', rotulo: 'Agenda dos técnicos', icone: '🗓️' },
  { para: '/clientes', rotulo: 'Clientes', icone: '👥' },
  { para: '/produtos', rotulo: 'Produtos', icone: '📦' },
]

export function Layout() {
  const { sessao, sair } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <p className="text-lg font-bold text-marca-700">SmartLar</p>
            <p className="text-xs text-slate-500">Gestão de pedidos e instalações</p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm md:hidden"
            onClick={() => setMenuAberto((v) => !v)}
          >
            Menu
          </button>
        </div>
        <nav className={`${menuAberto ? 'block' : 'hidden'} px-2 pb-4 md:block`}>
          {MENU.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              end={item.para === '/' || item.para === '/pedidos'}
              onClick={() => setMenuAberto(false)}
              className={({ isActive }) =>
                `mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  isActive ? 'bg-marca-50 font-semibold text-marca-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <span aria-hidden>{item.icone}</span>
              {item.rotulo}
            </NavLink>
          ))}
          <div className="mt-6 border-t border-slate-100 px-3 pt-4 text-xs text-slate-500">
            <p className="truncate">{sessao?.user.email}</p>
            <button type="button" onClick={sair} className="mt-1 text-slate-600 underline hover:text-slate-900">
              Sair
            </button>
          </div>
        </nav>
      </aside>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
