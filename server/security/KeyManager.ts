import crypto from 'crypto';
import { Cleanable } from '../types/common';

export class KeyManager implements Cleanable {
  private keys: Map<
    string,
    {
      key: crypto.KeyObject;
      createdAt: number;
      expiresAt: number;
    }
  >;
  private currentKeyId: string;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.keys = new Map();
    this.currentKeyId = '';
    this.rotateKey(); // Initial key creation
    this.cleanupInterval = setInterval(() => this.cleanup(), 3600000); // Hourly cleanup
  }

  rotateKey(): string {
    const keyId = crypto.randomBytes(16).toString('hex');
    const { privateKey } = crypto.generateKeyPairSync('ed25519');

    const now = Date.now();
    this.keys.set(keyId, {
      key: privateKey,
      createdAt: now,
      expiresAt: now + 48 * 60 * 60 * 1000, // 48 hours expiry
    });

    this.currentKeyId = keyId;
    return keyId;
  }

  getCurrentKeyId(): string {
    return this.currentKeyId;
  }

  getKey(keyId: string): crypto.KeyObject | null {
    const keyData = this.keys.get(keyId);
    if (!keyData) return null;

    if (Date.now() > keyData.expiresAt) {
      this.keys.delete(keyId);
      return null;
    }

    return keyData.key;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [keyId, keyData] of this.keys.entries()) {
      if (now > keyData.expiresAt) {
        this.keys.delete(keyId);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.keys.clear();
  }
}
