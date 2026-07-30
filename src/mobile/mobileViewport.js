const FORM_CONTROL_SELECTOR = 'input, select, textarea, [contenteditable="true"]'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const CONTROL_PADDING = 16

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

function revealFocusedControl(target) {
  const dialog = target?.closest?.('[role="dialog"]')
  if (!dialog) return

  const scrollRegion = findScrollableAncestor(target, dialog)
  if (!scrollRegion) return

  const controlRect = target.getBoundingClientRect()
  const regionRect = scrollRegion.getBoundingClientRect()
  const topLimit = regionRect.top + CONTROL_PADDING
  const bottomLimit = regionRect.bottom - CONTROL_PADDING
  let distance = 0

  if (controlRect.top < topLimit) {
    distance = controlRect.top - topLimit
  } else if (controlRect.bottom > bottomLimit) {
    distance = controlRect.bottom - bottomLimit
  }

  if (Math.abs(distance) < 1) return

  const reduceMotion = window.matchMedia?.(REDUCED_MOTION_QUERY).matches
  scrollRegion.scrollBy({
    top: distance,
    behavior: reduceMotion ? 'auto' : 'smooth',
  })
}

export function initializeMobileViewportExperience() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}

  const root = document.documentElement
  const visualViewport = window.visualViewport
  let focusTimer
  let viewportTimer

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
      window.clearTimeout(viewportTimer)
      viewportTimer = window.setTimeout(() => revealFocusedControl(activeControl), 80)
    }
  }

  const handleFocusIn = (event) => {
    if (!event.target?.matches?.(FORM_CONTROL_SELECTOR)) return
    if (!event.target.closest?.('[role="dialog"]')) return

    window.clearTimeout(focusTimer)
    focusTimer = window.setTimeout(() => revealFocusedControl(event.target), 180)
  }

  const handleFocusOut = () => {
    window.clearTimeout(viewportTimer)
    viewportTimer = window.setTimeout(updateViewportMetrics, 80)
  }

  updateViewportMetrics()
  visualViewport?.addEventListener('resize', updateViewportMetrics)
  visualViewport?.addEventListener('scroll', updateViewportMetrics)
  window.addEventListener('resize', updateViewportMetrics)
  document.addEventListener('focusin', handleFocusIn)
  document.addEventListener('focusout', handleFocusOut)

  return () => {
    window.clearTimeout(focusTimer)
    window.clearTimeout(viewportTimer)
    visualViewport?.removeEventListener('resize', updateViewportMetrics)
    visualViewport?.removeEventListener('scroll', updateViewportMetrics)
    window.removeEventListener('resize', updateViewportMetrics)
    document.removeEventListener('focusin', handleFocusIn)
    document.removeEventListener('focusout', handleFocusOut)
    root.classList.remove('app-keyboard-open')
  }
}
