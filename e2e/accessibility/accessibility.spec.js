import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import { prepareE2EPage } from '../support.js'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const ROUTES = [
  ['/dashboard', '.dashboard-premium'],
  ['/money', '.money-premium'],
  ['/cards', '.credit-cards-premium'],
  ['/transactions', '.transactions-premium'],
  ['/categories', '.categories-premium'],
  ['/goals', '.goals-premium'],
  ['/budgets', '.budgets-premium'],
  ['/reports', '.reports-premium'],
  ['/profile', '.profile-premium'],
]

function summarizeViolations(violations) {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      html: node.html,
      failureSummary: node.failureSummary,
    })),
  }))
}

async function waitForStableDocument(page, selector = 'main') {
  await expect(page.locator(selector)).toBeVisible()

  await expect
    .poll(
      async () => {
        try {
          return await page.evaluate(
            (targetSelector) =>
              document.readyState === 'complete' &&
              Boolean(document.querySelector(targetSelector)) &&
              !document.querySelector('[aria-busy="true"]'),
            selector,
          )
        } catch {
          return false
        }
      },
      {
        message: `Documento não estabilizou para ${selector}.`,
        timeout: 10_000,
      },
    )
    .toBe(true)

  await page.waitForTimeout(180)
}

async function analyzeWithRetry(page, include) {
  let lastError

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS)
      if (include) builder = builder.include(include)
      return await builder.analyze()
    } catch (error) {
      lastError = error
      const transientNavigation = /Execution context was destroyed|navigation|Target page/i.test(
        error.message,
      )

      if (!transientNavigation || attempt === 3) throw error

      await page.waitForLoadState('domcontentloaded').catch(() => {})
      await waitForStableDocument(page)
    }
  }

  throw lastError
}

async function audit(page, testInfo, name, options = {}) {
  await waitForStableDocument(page, options.stableSelector || 'main')
  const results = await analyzeWithRetry(page, options.include)
  const violations = summarizeViolations(results.violations)

  await testInfo.attach(`${name}-axe-results`, {
    body: Buffer.from(JSON.stringify(results, null, 2)),
    contentType: 'application/json',
  })

  expect(
    violations,
    `Violações de acessibilidade em ${name}:\n${JSON.stringify(violations, null, 2)}`,
  ).toEqual([])
}

for (const [route, selector] of ROUTES) {
  test(`${route} não possui violações WCAG detectáveis automaticamente`, async ({
    page,
  }, testInfo) => {
    await prepareE2EPage(page, route)
    await audit(page, testInfo, route.replace('/', '') || 'root', {
      stableSelector: selector,
    })
  })
}

test('modal de nova transação mantém foco contido, fecha com Escape e devolve o foco', async ({
  page,
}, testInfo) => {
  await prepareE2EPage(page, '/transactions')

  const opener = page.getByRole('button', { name: 'Nova', exact: true })
  await opener.focus()
  await opener.press('Enter')

  const dialog = page.getByRole('dialog', { name: 'Nova transação' })
  await expect(dialog).toBeVisible()
  await audit(page, testInfo, 'modal-nova-transacao', {
    stableSelector: '[role="dialog"]',
    include: '[role="dialog"]',
  })

  const focusable = dialog.locator(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  const count = await focusable.count()
  expect(count, 'O modal precisa possuir controles focalizáveis.').toBeGreaterThan(1)

  const first = focusable.first()
  const last = focusable.nth(count - 1)

  await last.focus()
  await page.keyboard.press('Tab')
  await expect(first).toBeFocused()

  await first.focus()
  await page.keyboard.press('Shift+Tab')
  await expect(last).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
})

test('menu Mais gerencia foco, Escape e retorno ao acionador', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name === 'a11y-desktop-chromium',
    'O menu Mais pertence à navegação móvel.',
  )

  await prepareE2EPage(page, '/dashboard')

  const opener = page.getByRole('button', { name: 'Mais', exact: true })
  await opener.focus()
  await opener.press('Enter')

  const drawer = page.getByRole('dialog', { name: 'Mais opções de navegação' })
  await expect(drawer).toBeVisible()
  await audit(page, testInfo, 'menu-mais', {
    stableSelector: '#mobile-more-menu',
    include: '#mobile-more-menu',
  })

  const focusable = drawer.locator(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  const count = await focusable.count()
  expect(count, 'O drawer precisa possuir controles focalizáveis.').toBeGreaterThan(1)

  const first = focusable.first()
  const last = focusable.nth(count - 1)

  await last.focus()
  await page.keyboard.press('Tab')
  await expect(first).toBeFocused()

  await first.focus()
  await page.keyboard.press('Shift+Tab')
  await expect(last).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(opener).toBeFocused()
})

test('ordem inicial de teclado alcança navegação e conteúdo principal', async ({
  page,
}, testInfo) => {
  await prepareE2EPage(page, '/dashboard')
  await waitForStableDocument(page, '.dashboard-premium')

  const sequence = []

  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press('Tab')
    const focused = page.locator(':focus')

    sequence.push(
      await focused.evaluate((active) => {
        const rect = active.getBoundingClientRect()

        return {
          tag: active.tagName,
          text: active.textContent?.trim()?.slice(0, 80),
          ariaLabel: active.getAttribute('aria-label'),
          href: active.getAttribute('href'),
          visible: rect.width > 0 && rect.height > 0,
        }
      }),
    )
  }

  await testInfo.attach('keyboard-focus-sequence', {
    body: Buffer.from(JSON.stringify(sequence, null, 2)),
    contentType: 'application/json',
  })

  expect(
    sequence.every((item) => item.tag && item.tag !== 'BODY' && item.visible),
    `Sequência de foco inválida:\n${JSON.stringify(sequence, null, 2)}`,
  ).toBe(true)

  expect(
    sequence.some((item) => item.href?.includes('/dashboard')),
    `A navegação principal não foi alcançada:\n${JSON.stringify(sequence, null, 2)}`,
  ).toBe(true)
})
