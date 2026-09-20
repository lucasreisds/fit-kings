import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { webcrypto } from 'node:crypto'

// jsdom não expõe crypto.randomUUID nem isSecureContext. O aplicativo exige os
// dois (D11, FR-124) — o ambiente de teste precisa ser um contexto seguro de
// verdade, e não um caminho alternativo de geração de identificador.
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
}
if (!globalThis.isSecureContext) {
  Object.defineProperty(globalThis, 'isSecureContext', { value: true, configurable: true })
}
