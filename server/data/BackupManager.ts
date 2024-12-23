import { SecureData } from '../types/data';

export class BackupManager {
  private static readonly MAX_BACKUPS_PER_ID = 10;
  private backups: Map<string, Array<{ data: SecureData; timestamp: number }>>;

  constructor() {
    this.backups = new Map();
  }

  private cleanupBackupList(
    backupList: Array<{ data: SecureData; timestamp: number }>,
    maxVersion?: number
  ) {
    // First filter out any versions higher than maxVersion if specified
    let filteredList =
      maxVersion !== undefined
        ? backupList.filter((backup) => backup.data.version <= maxVersion)
        : backupList;

    // Sort by version descending to ensure we keep the latest timestamp
    filteredList.sort((a, b) => b.data.version - a.data.version);

    // Use a Map to keep only the latest timestamp for each version
    const versionMap = new Map<
      number,
      { data: SecureData; timestamp: number }
    >();

    for (const backup of filteredList) {
      if (backup.data !== null && !versionMap.has(backup.data.version)) {
        versionMap.set(backup.data.version, backup);
      }
    }

    // Convert back to array and sort
    return Array.from(versionMap.values()).sort(
      (a, b) => b.data.version - a.data.version
    );
  }

  addBackup(id: string, data: SecureData): void {
    let backupList = this.backups.get(id) || [];

    // Add new backup
    backupList.unshift({
      data,
      timestamp: Date.now(),
    });

    // Clean and deduplicate the list
    backupList = this.cleanupBackupList(backupList);

    // Enforce maximum backup limit
    if (backupList.length > BackupManager.MAX_BACKUPS_PER_ID) {
      backupList = backupList.slice(0, BackupManager.MAX_BACKUPS_PER_ID);
    }

    this.backups.set(id, backupList);
  }

  restoreToVersion(id: string, version: number): SecureData | null {
    const backupList = this.backups.get(id);
    if (!backupList || backupList.length === 0) return null;

    // Clean and deduplicate the list, removing any versions newer than the requested version
    const cleanedList = this.cleanupBackupList(backupList, version);

    // Find the backup with the specified version
    const backup = cleanedList.find((b) => b.data.version === version);
    if (!backup) return null;

    // Update the backups list with cleaned version
    this.backups.set(id, cleanedList);

    return backup.data;
  }

  getAllBackups(id: string): Array<SecureData> {
    const backupList = this.backups.get(id);
    if (!backupList) return [];

    const cleanedList = this.cleanupBackupList(backupList);
    this.backups.set(id, cleanedList);

    return cleanedList.map((backup) => backup.data);
  }

  getLatestBackup(id: string): SecureData | null {
    const backupList = this.backups.get(id);
    if (!backupList || backupList.length === 0) return null;

    const cleanedList = this.cleanupBackupList(backupList);
    this.backups.set(id, cleanedList);

    return cleanedList[0].data;
  }
}