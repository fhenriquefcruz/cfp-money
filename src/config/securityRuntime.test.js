import { describe, expect, it } from 'vitest'
import { resolveSecurityRuntime } from './securityRuntime'

describe('resolveSecurityRuntime', () => {
  it('mantém App Check desabilitado quando não existe configuração', () => {
    expect(
      resolveSecurityRuntime({
        MODE: 'development',
      }),
    ).toEqual({
      mode: 'development',
      appCheckEnabled: false,
      appCheckRequired: false,
      appCheckDebug: false,
      appCheckSiteKey: '',
    })
  })

  it('habilita App Check implicitamente quando existe uma chave', () => {
    expect(
      resolveSecurityRuntime({
        MODE: 'development',
        VITE_RECAPTCHA_ENTERPRISE_SITE_KEY: 'enterprise-key',
      }),
    ).toMatchObject({
      appCheckEnabled: true,
      appCheckRequired: false,
      appCheckDebug: false,
      appCheckSiteKey: 'enterprise-key',
    })
  })

  it('aceita configuração obrigatória completa em produção', () => {
    expect(
      resolveSecurityRuntime({
        MODE: 'production',
        VITE_APP_CHECK_ENABLED: 'true',
        VITE_REQUIRE_APP_CHECK: 'true',
        VITE_APP_CHECK_DEBUG: 'false',
        VITE_RECAPTCHA_ENTERPRISE_SITE_KEY: 'enterprise-key',
      }),
    ).toMatchObject({
      mode: 'production',
      appCheckEnabled: true,
      appCheckRequired: true,
      appCheckDebug: false,
    })
  })

  it('permite desabilitação explícita mesmo quando existe uma chave', () => {
    expect(
      resolveSecurityRuntime({
        MODE: 'development',
        VITE_APP_CHECK_ENABLED: 'false',
        VITE_RECAPTCHA_ENTERPRISE_SITE_KEY: 'enterprise-key',
      }),
    ).toMatchObject({
      appCheckEnabled: false,
      appCheckSiteKey: 'enterprise-key',
    })
  })

  it('recusa App Check obrigatório quando está desabilitado', () => {
    expect(() =>
      resolveSecurityRuntime({
        MODE: 'production',
        VITE_APP_CHECK_ENABLED: 'false',
        VITE_REQUIRE_APP_CHECK: 'true',
      }),
    ).toThrow(/app check é obrigatório/i)
  })

  it('recusa App Check habilitado sem chave Enterprise', () => {
    expect(() =>
      resolveSecurityRuntime({
        MODE: 'development',
        VITE_APP_CHECK_ENABLED: 'true',
      }),
    ).toThrow(/chave recaptcha enterprise/i)
  })

  it('proíbe o modo debug em produção', () => {
    expect(() =>
      resolveSecurityRuntime({
        MODE: 'production',
        VITE_APP_CHECK_ENABLED: 'true',
        VITE_APP_CHECK_DEBUG: 'true',
        VITE_RECAPTCHA_ENTERPRISE_SITE_KEY: 'enterprise-key',
      }),
    ).toThrow(/proibido em produção/i)
  })

  it('recusa modo debug quando App Check está desabilitado', () => {
    expect(() =>
      resolveSecurityRuntime({
        MODE: 'development',
        VITE_APP_CHECK_ENABLED: 'false',
        VITE_APP_CHECK_DEBUG: 'true',
        VITE_RECAPTCHA_ENTERPRISE_SITE_KEY: 'enterprise-key',
      }),
    ).toThrow(/exige que o app check esteja habilitado/i)
  })

  it('permite modo debug em desenvolvimento', () => {
    expect(
      resolveSecurityRuntime({
        MODE: 'development',
        VITE_APP_CHECK_ENABLED: 'true',
        VITE_APP_CHECK_DEBUG: 'true',
        VITE_RECAPTCHA_ENTERPRISE_SITE_KEY: 'enterprise-key',
      }),
    ).toMatchObject({
      appCheckEnabled: true,
      appCheckDebug: true,
    })
  })

  it.each([
    ['VITE_APP_CHECK_ENABLED', 'talvez'],
    ['VITE_REQUIRE_APP_CHECK', 'obrigatório'],
    ['VITE_APP_CHECK_DEBUG', 'debug'],
  ])('recusa valor inválido em %s', (variableName, value) => {
    expect(() =>
      resolveSecurityRuntime({
        MODE: 'development',
        [variableName]: value,
      }),
    ).toThrow(new RegExp(variableName))
  })
})
