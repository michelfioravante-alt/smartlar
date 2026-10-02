import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { apenasDigitos, mascaraTelefone, mensagemErro } from '../lib/formato'
import type { Cliente } from '../lib/tipos'
import { AreaTexto, Aviso, Botao, Campo, Entrada } from './ui'

const VAZIO = { nome: '', telefone: '', email: '', endereco: '', bairro: '', cidade: 'Belo Horizonte', observacoes: '' }

export function FormCliente({ aoSalvar, aoCancelar }: {
  aoSalvar: (cliente: Cliente) => void
  aoCancelar?: () => void
}) {
  const [form, setForm] = useState(VAZIO)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const alterar = (campo: keyof typeof VAZIO, valor: string) => setForm((f) => ({ ...f, [campo]: valor }))

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)

    const digitos = apenasDigitos(form.telefone)
    if (digitos.length < 10) {
      setErro('Telefone (WhatsApp) é obrigatório: informe DDD + número.')
      return
    }

    setSalvando(true)
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        nome: form.nome.trim(),
        telefone: form.telefone,
        email: form.email.trim() || null,
        endereco: form.endereco.trim(),
        bairro: form.bairro.trim() || null,
        cidade: form.cidade.trim() || 'Belo Horizonte',
        observacoes: form.observacoes.trim() || null,
      })
      .select()
      .single<Cliente>()
    setSalvando(false)

    if (error) {
      setErro(mensagemErro(error))
      return
    }
    setForm(VAZIO)
    aoSalvar(data)
  }

  return (
    <form onSubmit={salvar} className="space-y-3">
      <Campo rotulo="Nome" obrigatorio>
        <Entrada value={form.nome} onChange={(e) => alterar('nome', e.target.value)} required />
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Telefone (WhatsApp)" obrigatorio>
          <Entrada
            value={form.telefone}
            onChange={(e) => alterar('telefone', mascaraTelefone(e.target.value))}
            placeholder="(31) 99999-9999"
            inputMode="tel"
            required
          />
        </Campo>
        <Campo rotulo="E-mail">
          <Entrada type="email" value={form.email} onChange={(e) => alterar('email', e.target.value)} />
        </Campo>
      </div>
      <Campo rotulo="Endereço da instalação" obrigatorio>
        <Entrada value={form.endereco} onChange={(e) => alterar('endereco', e.target.value)} placeholder="Rua, número, complemento" required />
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Bairro">
          <Entrada value={form.bairro} onChange={(e) => alterar('bairro', e.target.value)} />
        </Campo>
        <Campo rotulo="Cidade">
          <Entrada value={form.cidade} onChange={(e) => alterar('cidade', e.target.value)} />
        </Campo>
      </div>
      <Campo rotulo="Observações">
        <AreaTexto value={form.observacoes} onChange={(e) => alterar('observacoes', e.target.value)} rows={2} />
      </Campo>
      {erro && <Aviso>{erro}</Aviso>}
      <div className="flex gap-2">
        <Botao type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar cliente'}
        </Botao>
        {aoCancelar && (
          <Botao variante="secundario" onClick={aoCancelar}>
            Cancelar
          </Botao>
        )}
      </div>
    </form>
  )
}
