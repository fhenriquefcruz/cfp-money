import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import InvoiceLifecycleModal from './InvoiceLifecycleModal'

const invoice = {
  card: { id: 'card-1', name: 'Cartão de teste', last4: '1234' },
  lifecycle: {
    invoiceTotal: 300,
    remainingAmount: 300,
    paidAmount: 0,
    creditAmount: 0,
    events: [],
    manuallyClosed: false,
  },
}

function renderPayment(onCreateEvent) {
  render(
    <InvoiceLifecycleModal
      isOpen
      invoice={invoice}
      invoiceMonth="2026-11"
      onCreateEvent={onCreateEvent}
      onClose={vi.fn()}
    />,
  )
  return screen.getByRole('button', { name: 'Registrar pagamento' })
}

test('dois cliques enquanto grava envia uma única operação', async () => {
  let finish
  const onCreateEvent = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const confirm = renderPayment(onCreateEvent)
  fireEvent.click(confirm)
  fireEvent.click(confirm)

  expect(onCreateEvent).toHaveBeenCalledTimes(1)
  const attempted = onCreateEvent.mock.calls[0][0]
  expect(attempted.operationId).toMatch(/^[a-f0-9]{32}$/)
  expect(attempted.amount).toBe(300)

  finish('op_confirmed')
  await waitFor(() => expect(confirm).not.toBeDisabled())
})

test('retry após resposta incerta reutiliza o mesmo operationId', async () => {
  const onCreateEvent = vi
    .fn()
    .mockRejectedValueOnce(new Error('Conexão interrompida.'))
    .mockResolvedValueOnce('op_confirmed')
  const confirm = renderPayment(onCreateEvent)

  fireEvent.click(confirm)
  await screen.findByRole('alert')
  expect(onCreateEvent).toHaveBeenCalledTimes(1)

  fireEvent.click(confirm)
  await waitFor(() => expect(onCreateEvent).toHaveBeenCalledTimes(2))
  expect(onCreateEvent.mock.calls[1][0].operationId).toBe(
    onCreateEvent.mock.calls[0][0].operationId,
  )
})

test('não cria segunda operação ao alterar dados após timeout não confirmado', async () => {
  const onCreateEvent = vi.fn().mockRejectedValueOnce(new Error('Resposta não recebida.'))
  const confirm = renderPayment(onCreateEvent)

  fireEvent.click(confirm)
  await screen.findByRole('alert')
  fireEvent.change(screen.getByLabelText('Valor pago'), { target: { value: '250,00' } })
  fireEvent.click(confirm)

  expect(onCreateEvent).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('alert')).toHaveTextContent('Confira o histórico')
})

test('MR-005: histórico de fatura sinaliza evento legado sem data, sem inventar vencimento', () => {
  render(
    <InvoiceLifecycleModal
      isOpen
      invoice={{
        ...invoice,
        lifecycle: {
          ...invoice.lifecycle,
          events: [{ id: 'legacy-undated', type: 'manual_close', notes: 'Histórico preservado' }],
        },
      }}
      invoiceMonth="2026-11"
      onCreateEvent={vi.fn()}
      onClose={vi.fn()}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Histórico' }))
  expect(screen.getByText('Data do evento não registrada')).toBeInTheDocument()
  expect(screen.getByText('Histórico preservado')).toBeInTheDocument()
})
