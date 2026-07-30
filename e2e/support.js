import { expect } from '@playwright/test'

export async function prepareE2EPage(page, route = '/dashboard') {
  await page.addInitScript(() => {
    localStorage.setItem('cfp_onboarding_done_e2e-user', '1')
  })

  await page.goto(`./#${route}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main')).toBeVisible()
  await page.waitForTimeout(120)
}

export async function goToRoute(page, route, selector) {
  await page.goto(`./#${route}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator(selector)).toBeVisible()
  await page.waitForTimeout(100)
}

export async function expectNoHorizontalOverflow(page) {
  const measurements = await page.evaluate(() => {
    const main = document.querySelector('main')
    return {
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      mainClientWidth: main?.clientWidth || 0,
      mainScrollWidth: main?.scrollWidth || 0,
    }
  })

  expect(
    measurements.documentWidth,
    `documento excedeu a viewport: ${JSON.stringify(measurements)}`,
  ).toBeLessThanOrEqual(measurements.viewport + 1)

  expect(
    measurements.mainScrollWidth,
    `conteúdo principal excedeu o contêiner: ${JSON.stringify(measurements)}`,
  ).toBeLessThanOrEqual(measurements.mainClientWidth + 1)
}

export async function expectElementInsideViewport(locator) {
  await expect(locator).toBeVisible()

  let lastGeometry = null

  try {
    await expect
      .poll(
        async () => {
          lastGeometry = await locator.evaluate((element) => {
            const rect = element.getBoundingClientRect()
            const visualViewport = window.visualViewport
            const viewportLeft = visualViewport?.offsetLeft || 0
            const viewportTop = visualViewport?.offsetTop || 0
            const viewportWidth = visualViewport?.width || window.innerWidth
            const viewportHeight = visualViewport?.height || window.innerHeight
            const viewportRight = viewportLeft + viewportWidth
            const viewportBottom = viewportTop + viewportHeight
            const style = window.getComputedStyle(element)

            return {
              element: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                right: rect.right,
                bottom: rect.bottom,
              },
              viewport: {
                left: viewportLeft,
                top: viewportTop,
                width: viewportWidth,
                height: viewportHeight,
                right: viewportRight,
                bottom: viewportBottom,
              },
              layoutViewport: {
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
                clientWidth: document.documentElement.clientWidth,
                clientHeight: document.documentElement.clientHeight,
              },
              computed: {
                position: style.position,
                inset: style.inset,
                width: style.width,
                height: style.height,
                padding: style.padding,
                transform: style.transform,
                boxSizing: style.boxSizing,
              },
              inside:
                rect.left >= viewportLeft - 1 &&
                rect.top >= viewportTop - 1 &&
                rect.right <= viewportRight + 1 &&
                rect.bottom <= viewportBottom + 1,
            }
          })

          return lastGeometry.inside
        },
        {
          message: 'O elemento não entrou completamente na Visual Viewport.',
          timeout: 8_000,
        },
      )
      .toBe(true)
  } catch (error) {
    throw new Error(
      `O elemento não entrou completamente na Visual Viewport.\nGeometria final: ${JSON.stringify(
        lastGeometry,
        null,
        2,
      )}`,
      { cause: error },
    )
  }
}
export async function expectNavigationControlsInsideViewport(navigation) {
  await expect(navigation).toBeVisible()

  const controls = navigation.locator(':scope > a, :scope > button')
  await expect(controls).toHaveCount(6)

  const geometries = await controls.evaluateAll((elements) => {
    const visualViewport = window.visualViewport
    const viewportLeft = visualViewport?.offsetLeft || 0
    const viewportTop = visualViewport?.offsetTop || 0
    const viewportWidth = visualViewport?.width || document.documentElement.clientWidth
    const viewportHeight = visualViewport?.height || document.documentElement.clientHeight
    const viewportRight = viewportLeft + viewportWidth
    const viewportBottom = viewportTop + viewportHeight
    const tolerance = 1

    return elements.map((element) => {
      const rect = element.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      return {
        label: element.getAttribute('aria-label') || element.textContent?.trim() || element.tagName,
        rect: {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        },
        viewport: {
          left: viewportLeft,
          top: viewportTop,
          right: viewportRight,
          bottom: viewportBottom,
          width: viewportWidth,
          height: viewportHeight,
        },
        fullyInside:
          rect.left >= viewportLeft - tolerance &&
          rect.top >= viewportTop - tolerance &&
          rect.right <= viewportRight + tolerance &&
          rect.bottom <= viewportBottom + tolerance,
        centerInside:
          centerX >= viewportLeft &&
          centerX <= viewportRight &&
          centerY >= viewportTop &&
          centerY <= viewportBottom,
        touchTarget: rect.width >= 44 && rect.height >= 44,
      }
    })
  })

  for (const geometry of geometries) {
    expect(
      geometry.fullyInside,
      `Controle da navegação fora da Visual Viewport: ${JSON.stringify(geometry)}`,
    ).toBe(true)
    expect(
      geometry.centerInside,
      `Centro clicável fora da Visual Viewport: ${JSON.stringify(geometry)}`,
    ).toBe(true)
    expect(geometry.touchTarget, `Alvo de toque menor que 44 px: ${JSON.stringify(geometry)}`).toBe(
      true,
    )
  }
}
