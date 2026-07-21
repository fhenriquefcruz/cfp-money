import React from 'react'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

function Broken() {
  throw new Error('boom')
}

test('oferece recuperação quando um filho falha', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  render(
    <ErrorBoundary>
      <Broken />
    </ErrorBoundary>,
  )
  expect(screen.getByRole('heading', { name: /algo não saiu/i })).toBeInTheDocument()
  spy.mockRestore()
})
