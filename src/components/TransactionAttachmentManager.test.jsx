import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TransactionAttachmentManager from './TransactionAttachmentManager'

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  download: vi.fn(),
  notify: vi.fn(),
  transactions: [],
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'receipt-test-user' } }),
}))

vi.mock('../contexts/AppContext', () => ({
  useTransactions: () => ({ transactions: mocks.transactions }),
  useNotifications: () => ({ showNotification: mocks.notify }),
}))

vi.mock('../services/transactionAttachments', () => ({
  ATTACHMENT_ACCEPT: '.pdf,.png,.xlsx',
  ATTACHMENTS_PER_TRANSACTION: 6,
  validateReceiptFile: (file) => ({ name: file.name, size: file.size }),
  uploadTransactionAttachment: (...args) => mocks.upload(...args),
  removeTransactionAttachment: (...args) => mocks.remove(...args),
  downloadTransactionAttachment: (...args) => mocks.download(...args),
}))

beforeEach(() => {
  mocks.transactions = []
  mocks.upload.mockReset()
  mocks.remove.mockReset()
  mocks.download.mockReset()
  mocks.notify.mockReset()
})

describe('Comprovantes opcionais por transação', () => {
  const transaction = { id: 'expense-1', description: 'Conta de luz', attachments: [] }

  it('oferece anexar comprovante de pagamento e conserva a opção de fechar sem arquivo', () => {
    const onClose = vi.fn()
    render(
      <TransactionAttachmentManager
        transaction={transaction}
        isOpen
        initialKind="payment"
        onClose={onClose}
      />,
    )

    expect(screen.getByRole('button', { name: 'Pagamento' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('Nenhum comprovante nesta transação.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('vincula o arquivo à transação e mostra o clipe sem exigir um comprovante adicional', async () => {
    const attachment = {
      id: 'receipt-1',
      name: 'pagamento.pdf',
      size: 3,
      kind: 'payment',
      chunkCount: 1,
    }
    mocks.upload.mockResolvedValue(attachment)
    render(
      <TransactionAttachmentManager
        transaction={transaction}
        isOpen
        initialKind="payment"
        onClose={vi.fn()}
      />,
    )

    const file = new File(['PDF'], 'pagamento.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByLabelText('Selecionar comprovantes'), {
      target: { files: [file] },
    })

    await waitFor(() =>
      expect(mocks.upload).toHaveBeenCalledWith('receipt-test-user', 'expense-1', file, 'payment'),
    )
    expect(await screen.findByText('pagamento.pdf')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Baixar pagamento.pdf' })).toBeInTheDocument()

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mocks.remove.mockResolvedValue(undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Excluir pagamento.pdf' }))
    await waitFor(() =>
      expect(mocks.remove).toHaveBeenCalledWith('receipt-test-user', 'expense-1', attachment),
    )
    await waitFor(() => expect(screen.queryByText('pagamento.pdf')).not.toBeInTheDocument())
    confirm.mockRestore()
  })
})
