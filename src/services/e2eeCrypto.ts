/**
 * Client-Side Zero-Knowledge End-to-End Encryption (E2EE) Engine
 * Uses Web Crypto API (PBKDF2-SHA256 + AES-GCM 256-bit) so sensitive messages,
 * documents, projects, and notes are encrypted before leaving the device.
 */

const SALT_TEXT = 'hujju-e2ee-zero-knowledge-salt-v2';

function bufferToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function deriveVaultKey(passphrase: string, userUid: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(`${passphrase}::${userUid}`),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(SALT_TEXT),
      iterations: 120000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function computeKeyFingerprint(passphrase: string, userUid: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await window.crypto.subtle.digest(
    'SHA-256',
    enc.encode(`fingerprint::${passphrase}::${userUid}`)
  );
  const hex = Array.from(new Uint8Array(digest))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(':');
  return hex;
}

export async function encryptPayload(
  plaintext: string,
  key: CryptoKey | null
): Promise<{ content: string; iv: string; isEncrypted: boolean }> {
  if (!key || !plaintext) {
    return { content: plaintext, iv: '', isEncrypted: false };
  }
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  return {
    content: bufferToBase64(encryptedBuf),
    iv: bufferToBase64(iv),
    isEncrypted: true,
  };
}

export async function decryptPayload(
  content: string,
  iv: string,
  isEncrypted: boolean,
  key: CryptoKey | null
): Promise<string> {
  if (!isEncrypted || !iv) {
    return content;
  }
  if (!key) {
    return '[Encrypted with E2EE Vault Key — Unlock Vault to View]';
  }
  try {
    const ivBytes = base64ToBuffer(iv);
    const cipherBytes = base64ToBuffer(content);
    const decryptedBuf = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(ivBytes) },
      key,
      new Uint8Array(cipherBytes)
    );
    return new TextDecoder().decode(decryptedBuf);
  } catch {
    return '[E2EE Decryption Locked — Key Mismatch]';
  }
}
