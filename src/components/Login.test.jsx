import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import Login from './Login'

const authMocks = vi.hoisted(() => ({
  loginEmail: vi.fn(),
  loginGoogle: vi.fn(),
  register: vi.fn(),
  forgotPassword: vi.fn(),
  clearError: vi.fn(),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    ...authMocks,
    error: '',
  }),
}))

vi.mock('./ThemeToggle', () => ({
  default: () => <button type="button">Alternar tema</button>,
}))

beforeEach(() => {
  Object.values(authMocks).forEach((mock) => mock.mockClear())
})

test('apresenta uma entrada clara e orientada ao produto', () => {
  render(<Login />)

  expect(
    screen.getByRole('heading', { name: 'Continue com clareza.' }),
  ).toBeInTheDocument()
  expect(screen.getByText(/Seu dinheiro,/i)).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Entrar no Meu Real' }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Continuar com Google' }),
  ).toBeInTheDocument()
  expect(screen.getByText(/não movimenta dinheiro/i)).toBeInTheDocument()
})

test('troca imediatamente para criação de conta e mostra o Premium', async () => {
  render(<Login />)

  fireEvent.click(
    screen.getByRole('button', { name: 'Criar conta', pressed: false }),
  )

  expect(
    await screen.findByRole('heading', {
      name: 'Comece simples. Evolua com inteligência.',
    }),
  ).toBeInTheDocument()
  expect(screen.getByText('Premium por 7 dias')).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Criar minha conta' }),
  ).toBeInTheDocument()
})

test('mantém recuperação de senha fácil de localizar', async () => {
  render(<Login />)

  fireEvent.click(screen.getByRole('button', { name: 'Esqueci a senha' }))

  expect(
    await screen.findByRole('heading', {
      name: 'Vamos recuperar seu acesso.',
    }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Enviar link de recuperação' }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Voltar para o acesso' }),
  ).toBeInTheDocument()
})

test('aciona o login Google sem submeter o formulário de senha', async () => {
  authMocks.loginGoogle.mockResolvedValue({})

  render(<Login />)

  fireEvent.click(
    screen.getByRole('button', { name: 'Continuar com Google' }),
  )

  await waitFor(() => {
    expect(authMocks.loginGoogle).toHaveBeenCalledTimes(1)
  })
  expect(authMocks.loginEmail).not.toHaveBeenCalled()
})
