export interface SecureData {
  id: string;
  encrypted: Buffer;
  iv: Buffer;
  authTag: Buffer;
  signature: Buffer;
  keyId: string;
  version: number;
  timestamp: number;
  canary: string;
}
