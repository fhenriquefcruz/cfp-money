import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { ThemeProvider } from '../contexts/ThemeContext'
import ThemeToggle from './ThemeToggle'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

test('alternância de tema é acessível e persiste a escolha', () => {
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  )

  const toggle = screen.getByRole('switch', { name: 'Ativar tema escuro' })
  expect(toggle).toHaveAttribute('aria-checked', 'false')

  fireEvent.click(toggle)

  expect(screen.getByRole('switch', { name: 'Ativar tema claro' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  expect(localStorage.getItem('meu-real-theme')).toBe('dark')
})
