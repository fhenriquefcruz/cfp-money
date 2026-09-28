import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test, vi } from 'vitest'
import TransactionCsvImportModal from './TransactionCsvImportModal'

test('só libera importação depois da análise e não seleciona duplicidades por padrão', async () => {
  const onImport = vi.fn()

  render(
    <MemoryRouter>
      <TransactionCsvImportModal
        isOpen
        onClose={() => {}}
        categories={[{ id: 'food', name: 'Alimentação', color: '#111', icon: '🍽️' }]}
        existingTransactions={[
          {
            date: '2026-09-01',
            type: 'expense',
            amount: 25.9,
            description: 'Almoço',
            categoryName: 'Alimentação',
          },
        ]}
        onImport={onImport}
      />
    </MemoryRouter>,
  )

  fireEvent.change(screen.getByLabelText('Conteúdo do CSV'), {
    target: {
      value: [
        'Data;Tipo;Descrição;Categoria;Valor;Pagamento',
        '01/09/2026;Despesa;Almoço;Alimentação;25,90;pix',
        '02/09/2026;Despesa;Café;Alimentação;12,00;pix',
      ].join('\n'),
    },
  })

  fireEvent.click(screen.getByRole('button', { name: 'Analisar CSV' }))

  expect(await screen.findByText(/1 possível\(is\) duplicidade/i)).toBeInTheDocument()
  expect(screen.getByText(/1 de 2 selecionada/i)).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /Importar 1/i }))

  expect(onImport).toHaveBeenCalledTimes(1)
  expect(onImport.mock.calls[0][0]).toHaveLength(1)
  expect(onImport.mock.calls[0][0][0].description).toBe('Café')
})
