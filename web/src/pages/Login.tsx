import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import { Aviso, Botao, Campo, Entrada } from '../components/ui'

export function Login() {
  const { sessao } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (sessao) return <Navigate to="/" replace />

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    setEnviando(false)
    if (error) setErro('E-mail ou senha incorretos.')
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <form onSubmit={entrar} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-2xl font-bold text-marca-700">SmartLar</p>
          <p className="text-sm text-slate-500">Entre para acessar o sistema de gestão.</p>
        </div>
        <Campo rotulo="E-mail">
          <Entrada type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Campo>
        <Campo rotulo="Senha">
          <Entrada type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </Campo>
        {erro && <Aviso>{erro}</Aviso>}
        <Botao type="submit" className="w-full" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </Botao>
      </form>
    </div>
  )
}
