import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="min-h-[60vh] grid place-items-center text-center px-4">
      <div className="max-w-md space-y-3">
        <p className="text-sm font-bold text-[--brand-600]">Erro 404</p>
        <h1 className="text-2xl font-black text-[--text-primary]">Página não encontrada</h1>
        <p className="text-sm text-[--text-secondary]">
          O endereço informado não existe ou não está disponível para sua conta.
        </p>
        <Link
          className="inline-flex min-h-11 items-center rounded-xl bg-[--brand-600] px-5 text-white font-semibold no-underline"
          to="/dashboard"
        >
          Voltar ao dashboard
        </Link>
      </div>
    </section>
  )
}
