import { describe, expect, test } from 'vitest'
import viteConfig from '../../vite.config.js'

describe('Vite development server exposure', () => {
  test('binds the development server to loopback by default', () => {
    expect(viteConfig.server?.host).toBe('127.0.0.1')
  })

  test('binds the preview server to loopback by default', () => {
    expect(viteConfig.preview?.host).toBe('127.0.0.1')
  })
})
