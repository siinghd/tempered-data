import crypto from 'crypto';
import { SecureCache } from '../cache/SecureCache';
import { Cleanable } from '../types/common';

export class CanaryManager implements Cleanable {
  private static readonly TOKEN_LENGTH = 32;
  private tokenCache: SecureCache<number>;

  constructor() {
    this.tokenCache = new SecureCache<number>();
  }

  generateCanary(): string {
    const token = crypto
      .randomBytes(CanaryManager.TOKEN_LENGTH)
      .toString('hex');
    this.tokenCache.set(token, Date.now(), 3600000); // 1 hour expiry
    return token;
  }

  verifyCanary(token: string): boolean {
    return this.tokenCache.get(token) !== null;
  }

  destroy(): void {
    this.tokenCache.destroy();
  }
}
