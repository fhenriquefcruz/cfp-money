import React from 'react'

export default class ErrorBoundary extends React.Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[Meu Real] Falha não tratada', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <main className="min-h-screen grid place-items-center p-6 bg-[--bg-app] text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-black text-[--text-primary]">Algo não saiu como esperado</h1>
          <p className="text-[--text-secondary]">
            Seus dados não foram alterados. Recarregue a aplicação para tentar novamente.
          </p>
          <button
            className="min-h-11 rounded-xl bg-[--brand-600] px-5 text-white font-semibold"
            onClick={() => window.location.reload()}
          >
            Recarregar aplicação
          </button>
        </div>
      </main>
    )
  }
}
