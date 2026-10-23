import { describe, expect, it, vi } from 'vitest'
vi.mock('./firebase', () => ({ db: {} }))
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENTS_PER_TRANSACTION,
  validateReceiptFile,
} from './transactionAttachments'

const file = (name, size, type = '') => ({ name, size, type })

describe('Comprovantes opcionais e limites de segurança', () => {
  it('aceita documentos e mídias financeiras comuns', () => {
    for (const name of [
      'nota.pdf',
      'foto.JPG',
      'boleto.png',
      'relatorio.xlsx',
      'dados.csv',
      'comprovante.docx',
      'texto.txt',
      'imagem.webp',
    ]) {
      expect(validateReceiptFile(file(name, 2024)).name).toBe(name)
    }
    expect(ATTACHMENT_ACCEPT).toContain('.pdf')
    expect(ATTACHMENT_ACCEPT).toContain('.xlsx')
  })

  it('rejeita tipos ativos, arquivos vazios e tamanhos abusivos', () => {
    for (const name of ['arquivo.exe', 'codigo.js', 'site.html', 'vetor.svg', 'script.pdf.exe']) {
      expect(() => validateReceiptFile(file(name, 300))).toThrow(/Formato não permitido/)
    }
    expect(() => validateReceiptFile(file('arquivo.pdf', 0))).toThrow(/válido/)
    expect(() => validateReceiptFile(file('arquivo.pdf', ATTACHMENT_MAX_BYTES + 1))).toThrow(/2 MB/)
    expect(() =>
      validateReceiptFile(file('arquivo.pdf', 100, ''), ATTACHMENTS_PER_TRANSACTION),
    ).toThrow(/seis/)
  })

  it('sanitiza o nome e preserva identificação documental', () => {
    expect(validateReceiptFile(file('fatura\\outubro.pdf', 50))).toMatchObject({
      name: 'fatura_outubro.pdf',
      contentType: 'application/pdf',
      size: 50,
    })
    expect(validateReceiptFile(file('nota\ncomprovante.pdf', 50)).name).toBe('nota_comprovante.pdf')
  })
})

// Diagnóstico temporário da formatação (remover após corrigir o arquivo).
it('imprime diferenças do Prettier para o módulo de comprovantes', async () => {
  const [{ readFile }, prettier] = await Promise.all([
    import('node:fs/promises'),
    import('prettier'),
  ])
  const original = await readFile('src/services/transactionAttachments.js', 'utf8')
  const formatted = await prettier.format(original, {
    parser: 'babel',
    semi: false,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 100,
  })
  const currentLines = original.split('\n')
  const wantedLines = formatted.split('\n')
  const differences = []
  for (let i = 0; i < Math.max(currentLines.length, wantedLines.length); i++) {
    if (currentLines[i] !== wantedLines[i]) {
      differences.push({ line: i + 1, current: currentLines[i], expected: wantedLines[i] })
    }
    if (differences.length >= 8) break
  }
  console.info('PRETTIER_FULL_SOURCE', JSON.stringify(formatted))
})
