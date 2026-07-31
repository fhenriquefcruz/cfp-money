const FORM_CONTROL_SELECTOR = 'input, select, textarea, [contenteditable="true"]'
const CONTROL_PADDING = 16
const CONTROL_TOLERANCE = 1
const STABILIZATION_WINDOW_MS = 700

function findScrollableAncestor(element, boundary) {
  let current = element.parentElement

  while (current && current !== boundary) {
    const overflowY = window.getComputedStyle(current).overflowY
    const canScroll =
      /(auto|scroll)/.test(overflowY) && current.scrollHeight > current.clientHeight + 1

    if (canScroll) return current
    current = current.parentElement
  }

  return Array.from(boundary?.children || []).find((child) => {
    const overflowY = window.getComputedStyle(child).overflowY
    return /(auto|scroll)/.test(overflowY)
  })
}

function getControlGeometry(target) {
  if (!target?.isConnected) return null

  const dialog = target.closest?.('[role="dialog"]')
  if (!dialog) return null

  const scrollRegion = findScrollableAncestor(target, dialog)
  if (!scrollRegion) return null

  const controlRect = target.getBoundingClientRect()
  const regionRect = scrollRegion.getBoundingClientRect()
  const topLimit = regionRect.top + CONTROL_PADDING
  const bottomLimit = regionRect.bottom - CONTROL_PADDING

  return {
    scrollRegion,
    controlRect,
    topLimit,
    bottomLimit,
  }
}

function revealFocusedControl(target) {
  const geometry = getControlGeometry(target)
  if (!geometry) return true

  const { scrollRegion, controlRect, topLimit, bottomLimit } = geometry

  let distance = 0
  if (controlRect.top < topLimit - CONTROL_TOLERANCE) {
    distance = controlRect.top - topLimit
  } else if (controlRect.bottom > bottomLimit + CONTROL_TOLERANCE) {
    distance = controlRect.bottom - bottomLimit
  }

  if (Math.abs(distance) <= CONTROL_TOLERANCE) return true

  const maxScrollTop = Math.max(0, scrollRegion.scrollHeight - scrollRegion.clientHeight)
  const nextScrollTop = Math.min(maxScrollTop, Math.max(0, scrollRegion.scrollTop + distance))

  scrollRegion.scrollTop = nextScrollTop
  return false
}

export function initializeMobileViewportExperience() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}

  const root = document.documentElement
  const visualViewport = window.visualViewport

  let focusTimer
  let viewportTimer
  let stabilizationFrame
  let resizeObserver
  let observedControl

  const stopStabilization = () => {
    if (stabilizationFrame) window.cancelAnimationFrame(stabilizationFrame)
    stabilizationFrame = undefined
  }

  const stabilizeFocusedControl = (target, duration = STABILIZATION_WINDOW_MS) => {
    if (!target?.isConnected) return

    stopStabilization()
    const deadline = performance.now() + duration

    const step = () => {
      if (!target.isConnected || document.activeElement !== target) {
        stabilizationFrame = undefined
        return
      }

      revealFocusedControl(target)

      if (performance.now() < deadline) {
        stabilizationFrame = window.requestAnimationFrame(step)
      } else {
        // Última correção após o fim da janela de estabilização.
        revealFocusedControl(target)
        stabilizationFrame = undefined
      }
    }

    stabilizationFrame = window.requestAnimationFrame(step)
  }

  const scheduleStabilization = (target, delay = 0, duration = STABILIZATION_WINDOW_MS) => {
    window.clearTimeout(viewportTimer)
    viewportTimer = window.setTimeout(() => stabilizeFocusedControl(target, duration), delay)
  }

  const stopObservingFocusedControl = () => {
    resizeObserver?.disconnect()
    resizeObserver = undefined
    observedControl = undefined
  }

  const observeFocusedControl = (target) => {
    if (!target?.matches?.(FORM_CONTROL_SELECTOR)) return
    if (!target.closest?.('[role="dialog"]')) return

    if (observedControl === target && resizeObserver) return

    stopObservingFocusedControl()
    observedControl = target

    if (typeof ResizeObserver === 'undefined') return

    const dialog = target.closest('[role="dialog"]')
    const scrollRegion = findScrollableAncestor(target, dialog)
    if (!dialog || !scrollRegion) return

    resizeObserver = new ResizeObserver(() => {
      if (document.activeElement === target) {
        stabilizeFocusedControl(target, 400)
      }
    })

    resizeObserver.observe(dialog)
    resizeObserver.observe(scrollRegion)
  }

  const updateViewportMetrics = () => {
    const viewportHeight = visualViewport?.height || window.innerHeight
    const viewportOffsetTop = visualViewport?.offsetTop || 0
    const keyboardInset = Math.max(0, window.innerHeight - viewportHeight - viewportOffsetTop)

    root.style.setProperty('--app-visual-viewport-height', `${Math.round(viewportHeight)}px`)
    root.style.setProperty(
      '--app-visual-viewport-offset-top',
      `${Math.max(0, Math.round(viewportOffsetTop))}px`,
    )
    root.style.setProperty('--app-keyboard-inset', `${Math.round(keyboardInset)}px`)
    root.classList.toggle('app-keyboard-open', keyboardInset > 100)

    const activeControl = document.activeElement
    if (
      activeControl?.matches?.(FORM_CONTROL_SELECTOR) &&
      activeControl.closest?.('[role="dialog"]')
    ) {
      observeFocusedControl(activeControl)
      scheduleStabilization(activeControl, 0)
    }
  }

  const handleFocusIn = (event) => {
    if (!event.target?.matches?.(FORM_CONTROL_SELECTOR)) return
    if (!event.target.closest?.('[role="dialog"]')) return

    observeFocusedControl(event.target)

    window.clearTimeout(focusTimer)
    focusTimer = window.setTimeout(
      () => stabilizeFocusedControl(event.target, STABILIZATION_WINDOW_MS),
      80,
    )
  }

  const handleFocusOut = () => {
    window.clearTimeout(focusTimer)
    focusTimer = window.setTimeout(() => {
      const activeControl = document.activeElement

      if (
        activeControl?.matches?.(FORM_CONTROL_SELECTOR) &&
        activeControl.closest?.('[role="dialog"]')
      ) {
        observeFocusedControl(activeControl)
        stabilizeFocusedControl(activeControl)
        return
      }

      stopStabilization()
      stopObservingFocusedControl()
      updateViewportMetrics()
    }, 80)
  }

  updateViewportMetrics()

  visualViewport?.addEventListener('resize', updateViewportMetrics)
  visualViewport?.addEventListener('scroll', updateViewportMetrics)
  window.addEventListener('resize', updateViewportMetrics)
  window.addEventListener('orientationchange', updateViewportMetrics)
  document.addEventListener('focusin', handleFocusIn)
  document.addEventListener('focusout', handleFocusOut)

  return () => {
    window.clearTimeout(focusTimer)
    window.clearTimeout(viewportTimer)
    stopStabilization()
    stopObservingFocusedControl()

    visualViewport?.removeEventListener('resize', updateViewportMetrics)
    visualViewport?.removeEventListener('scroll', updateViewportMetrics)
    window.removeEventListener('resize', updateViewportMetrics)
    window.removeEventListener('orientationchange', updateViewportMetrics)
    document.removeEventListener('focusin', handleFocusIn)
    document.removeEventListener('focusout', handleFocusOut)
    root.classList.remove('app-keyboard-open')
  }
}
