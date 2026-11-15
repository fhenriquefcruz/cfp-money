import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import InvoiceLifecycleModal from './InvoiceLifecycleModal'

const ids = vi.hoisted(() => ({
  next: vi.fn(),
}))

vi.mock('../domain/invoiceEventIdempotency', async (importOriginal) => ({
  ...(await importOriginal()),
  newInvoiceOperationId: () => ids.next(),
}))

const invoice = {
  card: { id: 'card-1', name: 'Cartão pessoal', last4: '1234' },
  lifecycle: {
    invoiceTotal: 200,
    paidAmount: 0,
    remainingAmount: 200,
    creditAmount: 0,
    events: [],
    manuallyClosed: false,
  },
}

beforeEach(() => {
  ids.next.mockReset()
  ids.next
    .mockReturnValueOnce('a4d5072f-9bd7-4ca9-9129-9d2a621ed918')
    .mockReturnValueOnce('189dd740-6703-4c79-b889-3daecf2f3b7b')
})

test('MR-003: retry do mesmo pagamento reusa a operação após falha incerta', async () => {
  const onCreateEvent = vi.fn().mockRejectedValueOnce(new Error('Conexão indisponível'))
  onCreateEvent.mockResolvedValue('event-id')

  render(
    <InvoiceLifecycleModal
      isOpen
      invoice={invoice}
      invoiceMonth="2026-11"
      onCreateEvent={onCreateEvent}
      onClose={vi.fn()}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Registrar pagamento' }))
  await waitFor(() => expect(screen.getByText('Conexão indisponível')).toBeInTheDocument())

  fireEvent.click(screen.getByRole('button', { name: 'Registrar pagamento' }))
  await waitFor(() => expect(onCreateEvent).toHaveBeenCalledTimes(2))

  const first = onCreateEvent.mock.calls[0][0]
  const retry = onCreateEvent.mock.calls[1][0]
  expect(first.operationId).toBe('a4d5072f-9bd7-4ca9-9129-9d2a621ed918')
  expect(retry).toEqual(first)
  expect(ids.next).toHaveBeenCalledTimes(1)
})

test('MR-003: duplo clique simultâneo não dispara duas gravações', async () => {
  let resolveWrite
  const onCreateEvent = vi.fn(
    () =>
      new Promise((resolve) => {
        resolveWrite = resolve
      }),
  )

  render(
    <InvoiceLifecycleModal
      isOpen
      invoice={invoice}
      invoiceMonth="2026-11"
      onCreateEvent={onCreateEvent}
      onClose={vi.fn()}
    />,
  )

  const submit = screen.getByRole('button', { name: 'Registrar pagamento' })
  fireEvent.click(submit)
  fireEvent.click(submit)

  expect(onCreateEvent).toHaveBeenCalledTimes(1)
  expect(ids.next).toHaveBeenCalledTimes(1)
  resolveWrite('event-id')
  await waitFor(() => expect(submit).not.toBeDisabled())
})

test('MR-003: não troca silenciosamente o ID após falha e edição do valor', async () => {
  const onCreateEvent = vi.fn().mockRejectedValue(new Error('Timeout'))
  render(
    <InvoiceLifecycleModal
      isOpen
      invoice={invoice}
      invoiceMonth="2026-11"
      onCreateEvent={onCreateEvent}
      onClose={vi.fn()}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Registrar pagamento' }))
  await waitFor(() => expect(screen.getByText('Timeout')).toBeInTheDocument())

  fireEvent.change(screen.getByLabelText('Valor pago'), { target: { value: '1000' } })
  fireEvent.click(screen.getByRole('button', { name: 'Registrar pagamento' }))

  await waitFor(() =>
    expect(screen.getByText(/Uma tentativa anterior pode ter sido registrada/)).toBeInTheDocument(),
  )
  expect(onCreateEvent).toHaveBeenCalledTimes(1)
  expect(ids.next).toHaveBeenCalledTimes(1)
})
