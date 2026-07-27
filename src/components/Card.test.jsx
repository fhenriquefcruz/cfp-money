import React from 'react'
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Card } from './ui'

test('Card aceita classes de layout sem perder a estrutura padrão', () => {
  render(
    <Card className="h-full overflow-hidden" padding={false}>
      Conteúdo
    </Card>,
  )

  const card = screen.getByText('Conteúdo').parentElement
  expect(card).toHaveClass('h-full')
  expect(card).toHaveClass('overflow-hidden')
  expect(card).not.toHaveClass('p-4')
  expect(card).toHaveClass('rounded-2xl')
})
