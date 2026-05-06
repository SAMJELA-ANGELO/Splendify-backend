import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // AES-GCM recommended IV length

function getEncryptionKey(): Buffer {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error(
      'Missing ENCRYPTION_KEY environment variable for tenant secret encryption',
    );
  }

  let keyBuffer = Buffer.from(encryptionKey, 'utf8');

  if (keyBuffer.length === 44) {
    // likely base64 encoded 32 bytes
    keyBuffer = Buffer.from(encryptionKey, 'base64');
  }

  if (keyBuffer.length !== 32) {
    throw new Error(
      'ENCRYPTION_KEY must be 32 bytes long (256-bit) or a base64 encoding of 32 bytes',
    );
  }

  return keyBuffer;
}

export function encryptSecret(value: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(encrypted: string): string {
  const key = getEncryptionKey();
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }

  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const ciphertext = Buffer.from(parts[2], 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function tryDecryptSecret(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  if (!value.includes(':')) {
    return value;
  }

  try {
    return decryptSecret(value);
  } catch {
    return value;
  }
}
