// Encryption utilities for healthcare data
// Note: This is a simplified implementation. In production, use Lit Protocol or similar

export class EncryptionService {

  // Generate a random encryption key
  async generateKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    )
  }

  // Convert CryptoKey to exportable format
  async exportKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('jwk', key)
    return JSON.stringify(exported)
  }

  // Import key from string
  async importKey(keyString: string): Promise<CryptoKey> {
    const keyData = JSON.parse(keyString)
    return await window.crypto.subtle.importKey(
      'jwk',
      keyData,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['encrypt', 'decrypt']
    )
  }

  // Encrypt file
  async encryptFile(file: File, key: CryptoKey): Promise<{ encryptedData: ArrayBuffer; iv: Uint8Array }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const fileData = await file.arrayBuffer()

    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
      },
      key,
      fileData
    )

    return { encryptedData, iv }
  }

  // Decrypt file
  async decryptFile(encryptedData: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<ArrayBuffer> {
    return await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
      },
      key,
      encryptedData
    )
  }

  // Create encrypted file blob
  createEncryptedBlob(encryptedData: ArrayBuffer, iv: Uint8Array): Blob {
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encryptedData), iv.length)

    return new Blob([combined], { type: 'application/octet-stream' })
  }

  // Extract IV and encrypted data from blob
  async extractFromBlob(blob: Blob): Promise<{ encryptedData: ArrayBuffer; iv: Uint8Array }> {
    const arrayBuffer = await blob.arrayBuffer()
    const combined = new Uint8Array(arrayBuffer)

    const iv = combined.slice(0, 12) // First 12 bytes are IV
    const encryptedData = combined.slice(12) // Rest is encrypted data

    return { encryptedData: encryptedData.buffer, iv }
  }
}

export const encryptionService = new EncryptionService()

// Utility function to generate a secure random ID
export function generateSecureId(): string {
  const array = new Uint8Array(16)
  window.crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}