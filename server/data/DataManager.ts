import crypto from 'crypto';
import { SecureCache } from '../cache/SecureCache';
import { CanaryManager } from '../security/CanaryManager';
import { CryptoService } from '../security/CryptoService';
import { KeyManager } from '../security/KeyManager';
import { Cleanable } from '../types/common';
import { SecureData } from '../types/data';
import { BackupManager } from './BackupManager';

interface DefaultDataItem {
  id: string;
  content: string;
}

export class DataManager implements Cleanable {
  private data: Map<string, SecureData>;
  private keyManager: KeyManager;
  private canaryManager: CanaryManager;
  private backupManager: BackupManager;
  private encryptionKeys: SecureCache<Buffer>;

  constructor(defaultData: DefaultDataItem[] = []) {
    this.data = new Map();
    this.keyManager = new KeyManager();
    this.canaryManager = new CanaryManager();
    this.backupManager = new BackupManager();
    this.encryptionKeys = new SecureCache<Buffer>(3600000);

    // Initialize with default data if provided
    this.initializeDefaultData(defaultData);
  }

  private createEncryptionKey(id: string): Buffer {
    const key = crypto.randomBytes(32);
    this.encryptionKeys.set(id, key, 48 * 60 * 60 * 1000);
    return key;
  }
  private async initializeDefaultData(
    defaultData: DefaultDataItem[]
  ): Promise<void> {
    for (const item of defaultData) {
      try {
        await this.createSecureData(item.id, item.content);
      } catch (error) {
        console.error(
          `Failed to initialize default data for ID ${item.id}:`,
          error
        );
      }
    }
  }

  async createSecureData(id: string, data: string): Promise<SecureData> {
    // Check if data already exists
    const existingData = this.data.get(id);
    const version = existingData ? existingData.version + 1 : 0;

    const key = this.createEncryptionKey(id);
    const { encrypted, iv, authTag } = CryptoService.encryptData(data, key);
    const keyId = this.keyManager.getCurrentKeyId();
    const signingKey = this.keyManager.getKey(keyId);

    if (!signingKey) throw new Error('Signing key not found');

    const signature = crypto.sign(null, Buffer.from(data), signingKey);
    const canary = this.canaryManager.generateCanary();

    const secureData: SecureData = {
      id,
      encrypted,
      iv,
      authTag,
      signature,
      keyId,
      version,
      timestamp: Date.now(),
      canary,
    };

    // Add to backup before setting as current
    this.backupManager.addBackup(id, secureData);
    this.data.set(id, secureData);

    return secureData;
  }

  async getData(id: string): Promise<SecureData | null> {
    return this.data.get(id) || null;
  }

  async updateSecureData(id: string, data: string): Promise<SecureData> {
    const current = this.data.get(id);
    if (!current) {
      // If no existing data, create new and ensure it's backed up
      return this.createSecureData(id, data);
    }

    // Create backup before updating
    this.backupManager.addBackup(id, current);

    // Get encryption key
    const key = this.encryptionKeys.get(id);
    if (!key) throw new Error('Encryption key not found');

    // Encrypt and sign new data
    const { encrypted, iv, authTag } = CryptoService.encryptData(data, key);
    const keyId = this.keyManager.getCurrentKeyId();
    const signingKey = this.keyManager.getKey(keyId);

    if (!signingKey) throw new Error('Signing key not found');

    const signature = crypto.sign(null, Buffer.from(data), signingKey);
    const canary = this.canaryManager.generateCanary();

    const updated: SecureData = {
      ...current,
      encrypted,
      iv,
      authTag,
      signature,
      keyId,
      version: current.version + 1,
      timestamp: Date.now(),
      canary,
    };

    // Add the new version to backup before setting as current
    this.backupManager.addBackup(id, updated);
    this.data.set(id, updated);

    return updated;
  }

  async verifyAndDecrypt(
    id: string,
    secureData: SecureData
  ): Promise<string | null> {
    const key = this.encryptionKeys.get(id);
    if (!key) return null;

    try {
      // Decrypt data
      const decrypted = CryptoService.decryptData(
        secureData.encrypted,
        key,
        secureData.iv,
        secureData.authTag
      );

      // Verify canary
      if (!this.canaryManager.verifyCanary(secureData.canary)) {
        return null;
      }

      // Verify signature
      const signingKey = this.keyManager.getKey(secureData.keyId);
      if (!signingKey) return null;

      const isValid = crypto.verify(
        null,
        Buffer.from(decrypted),
        signingKey,
        secureData.signature
      );

      return isValid ? decrypted : null;
    } catch {
      return null;
    }
  }
  async restoreVersion(
    id: string,
    version: number
  ): Promise<SecureData | null> {
    const restored = this.backupManager.restoreToVersion(id, version);
    if (!restored) return null;

    // Verify the restored data
    const decrypted = await this.verifyAndDecrypt(id, restored);
    if (!decrypted) return null;

    // Update the current data without creating a new backup
    this.data.set(id, restored);

    return restored;
  }

  async recoverData(id: string): Promise<SecureData | null> {
    const backup = this.backupManager.getLatestBackup(id);
    if (!backup) return null;

    // Verify backup integrity
    const decrypted = await this.verifyAndDecrypt(id, backup);
    if (!decrypted) return null;

    // Update current data without creating a new backup
    this.data.set(id, backup);

    return backup;
  }
  async verifyData(id: string, data: string): Promise<boolean> {
    const secureData = this.data.get(id);
    if (!secureData) return false;

    const decrypted = await this.verifyAndDecrypt(id, secureData);
    if (!decrypted) return false;

    return decrypted === data;
  }

  async getDataHistory(id: string): Promise<SecureData[]> {
    const history = this.backupManager.getAllBackups(id);
    return history.sort((a, b) => b.version - a.version); // Sort by version descending
  }

  async createSnapshot(
    id: string
  ): Promise<{ id: string; timestamp: number; version: number }> {
    const current = this.data.get(id);
    if (!current) throw new Error('Data not found');

    // Create a special backup for the snapshot
    this.backupManager.addBackup(id, current);

    return {
      id: crypto.randomBytes(16).toString('hex'),
      timestamp: Date.now(),
      version: current.version,
    };
  }

  destroy(): void {
    this.keyManager.destroy();
    this.canaryManager.destroy();
    this.encryptionKeys.destroy();
  }
}
