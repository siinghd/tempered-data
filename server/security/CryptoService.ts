import crypto from 'crypto';

export class CryptoService {
  static async generateHash(data: string): Promise<string> {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  static encryptData(
    data: string,
    key: Buffer
  ): {
    encrypted: Buffer;
    iv: Buffer;
    authTag: Buffer;
  } {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final(),
    ]);
    return {
      encrypted,
      iv,
      authTag: cipher.getAuthTag(),
    };
  }

  static decryptData(
    encrypted: Buffer,
    key: Buffer,
    iv: Buffer,
    authTag: Buffer
  ): string {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }
}
