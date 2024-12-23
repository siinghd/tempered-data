import { ApiError, SecureData } from '../types/data';

const API_URL = 'http://localhost:8080';

class ApiService {
  private static generateRequestSignature(): {
    signature: string;
    timestamp: string;
  } {
    // In a real app, this would use a proper signing algorithm
    return {
      signature: 'test-signature',
      timestamp: Date.now().toString(),
    };
  }

  private static async fetchWithAuth(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const { signature, timestamp } = this.generateRequestSignature();

    return fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        'x-request-signature': signature,
        'x-request-timestamp': timestamp,
      },
    });
  }

  static async getData(id: string): Promise<SecureData> {
    const response = await this.fetchWithAuth(`/data/${id}`);
    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  }

  static async updateData(
    id: string,
    data: string,
    version?: number
  ): Promise<SecureData> {
    const response = await this.fetchWithAuth('/data', {
      method: 'POST',
      body: JSON.stringify({ id, data, version }),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  }

  static async verifyData(id: string, data: string): Promise<boolean> {
    const response = await this.fetchWithAuth(`/data/verify/${id}`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error);
    }

    const result = await response.json();
    return result.valid;
  }
  static async restoreVersion(
    id: string,
    version: number
  ): Promise<SecureData> {
    const response = await this.fetchWithAuth(`/data/restore/${id}`, {
      method: 'POST',
      body: JSON.stringify({ version }),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  }
  static async recoverData(id: string): Promise<SecureData> {
    const response = await this.fetchWithAuth(`/data/recover/${id}`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  }

  static async getHistory(id: string): Promise<SecureData[]> {
    const response = await this.fetchWithAuth(`/data/history/${id}`);
    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  }
}

export default ApiService;
