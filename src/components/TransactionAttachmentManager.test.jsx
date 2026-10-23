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
  it('mostra o sucesso parcial quando um lote contém anexos que falharam', async () => {
    mocks.upload
      .mockResolvedValueOnce({
        id: 'receipt-ok',
        name: 'primeiro.pdf',
        size: 2,
        kind: 'payment',
        chunkCount: 1,
      })
      .mockRejectedValueOnce(new Error('Conexão interrompida'))

    render(
      <TransactionAttachmentManager
        transaction={transaction}
        isOpen
        onClose={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Selecionar comprovantes'), {
      target: {
        files: [
          new File(['A'], 'primeiro.pdf', { type: 'application/pdf' }),
          new File(['B'], 'segundo.pdf', { type: 'application/pdf' }),
        ],
      },
    })

    await waitFor(() => expect(mocks.upload).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('primeiro.pdf')).toBeInTheDocument()
    expect(screen.queryByText('segundo.pdf')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('1 de 6 comprovantes')
    await waitFor(() =>
      expect(mocks.notify).toHaveBeenCalledWith('1 comprovante salvo; 1 não enviado.', 'warning'),
    )
  })

  it('oculta imediatamente o anexo removido mesmo antes da atualização do Firestore', async () => {
    const attached = {
      id: 'persisted-1',
      name: 'boleto.pdf',
      size: 10,
      kind: 'transaction',
      chunkCount: 1,
    }
    mocks.remove.mockResolvedValue(undefined)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(
      <TransactionAttachmentManager
        transaction={{ ...transaction, attachments: [attached] }}
        isOpen
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('boleto.pdf')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Excluir boleto.pdf' }))
    await waitFor(() =>
      expect(mocks.remove).toHaveBeenCalledWith('receipt-test-user', 'expense-1', attached),
    )
    await waitFor(() => expect(screen.queryByText('boleto.pdf')).not.toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent('0 de 6 comprovantes')
    confirm.mockRestore()
  })

})
