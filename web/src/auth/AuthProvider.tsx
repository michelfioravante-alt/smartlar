import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContexto {
  sessao: Session | null
  carregando: boolean
  sair: () => Promise<void>
}

const Contexto = createContext<AuthContexto | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setCarregando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => setSessao(novaSessao))
    return () => data.subscription.unsubscribe()
  }, [])

  const sair = async () => {
    await supabase.auth.signOut()
  }

  return <Contexto.Provider value={{ sessao, carregando, sair }}>{children}</Contexto.Provider>
}

export function useAuth() {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return ctx
}
