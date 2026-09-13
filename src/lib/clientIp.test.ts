import { describe, expect, it } from 'vitest'
import { clientIpFromHeaders } from '../../supabase/functions/_shared/clientIp.ts'

function headers(map: Record<string, string>) {
  return (name: string) => map[name.toLowerCase()] ?? null
}

describe('clientIpFromHeaders', () => {
  it('préfère cf-connecting-ip même si x-forwarded-for est falsifié', () => {
    expect(
      clientIpFromHeaders(headers({ 'cf-connecting-ip': '203.0.113.9', 'x-forwarded-for': '1.2.3.4' })),
    ).toBe('203.0.113.9')
  })

  it('prend la dernière entrée de x-forwarded-for sinon (le client peut préfixer une IP falsifiée)', () => {
    expect(clientIpFromHeaders(headers({ 'x-forwarded-for': 'spoofed, 68.65.164.215' }))).toBe('68.65.164.215')
  })

  it('renvoie unknown sans en-tête', () => {
    expect(clientIpFromHeaders(headers({}))).toBe('unknown')
  })

  it('retire les espaces', () => {
    expect(clientIpFromHeaders(headers({ 'cf-connecting-ip': '  203.0.113.9  ' }))).toBe('203.0.113.9')
    expect(clientIpFromHeaders(headers({ 'x-forwarded-for': '  1.2.3.4  ,  5.6.7.8  ' }))).toBe('5.6.7.8')
  })

  it('groupe deux IPv6 du même /64 (forme complète et compressée) sur la même clé', () => {
    const full = clientIpFromHeaders(headers({ 'cf-connecting-ip': '2001:0db8:0000:0000:0000:0000:0000:0001' }))
    const compressed = clientIpFromHeaders(headers({ 'cf-connecting-ip': '2001:db8::1' }))
    expect(full).toBe(compressed)
  })

  it('distingue deux /64 différents', () => {
    const a = clientIpFromHeaders(headers({ 'cf-connecting-ip': '2001:db8:1::1' }))
    const b = clientIpFromHeaders(headers({ 'cf-connecting-ip': '2001:db8:2::1' }))
    expect(a).not.toBe(b)
  })

  it('convertit une adresse IPv4-mappée en IPv4', () => {
    expect(clientIpFromHeaders(headers({ 'cf-connecting-ip': '::ffff:1.2.3.4' }))).toBe('1.2.3.4')
  })
})
