import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { AgatarkDevice } from '../types/agatark-devices';

export interface AgatarkLoginResponse {
  authorization: string;
  nodeName: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  sites: Array<{
    id: number;
    name: string;
    type: string;
  }>;
}

export interface AgatarkEvent {
  id: number;
  status: Record<string, any>;
}

export interface AgatarkEventsResponse {
  events: AgatarkEvent[];
}

export class AgatarkClient {
  private client: AxiosInstance;
  private authorization: string | null = null;
  private host: string;
  private baseURL: string;
  private email: string;
  private password: string;
  private remember: string;
  private sessionCookies: string | null = null;

  constructor(host: string, email: string, password: string, remember: string = 'on') {
    this.host = host;
    this.email = email;
    this.password = password;
    this.remember = remember;

    // Auto-detect protocol or use provided protocol
    this.baseURL = this.normalizeBaseURL(host);

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor to include authorization and cookies
    this.client.interceptors.request.use((config) => {
      if (this.authorization) {
        config.headers['Authorization'] = this.authorization;
      }
      if (this.sessionCookies) {
        config.headers['Cookie'] = this.sessionCookies;
      }
      if (config.url && !config.url.startsWith('http')) {
        config.headers['Origin'] = this.baseURL;
        config.headers['Referer'] = `${this.baseURL}/`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.authorization = null;
          this.sessionCookies = null;
        }
        return Promise.reject(error);
      }
    );
  }

  private normalizeBaseURL(host: string): string {
    // If host already has protocol, use as-is
    if (host.startsWith('http://') || host.startsWith('https://')) {
      const normalized = host.replace(/\/$/, ''); // Remove trailing slash
      logger.info(`Using provided protocol: ${normalized}`);
      return normalized;
    }

    // Check if host looks like an IP address or localhost
    const isIP = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(host);
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('::1');
    
    // Default to HTTP for local/IP addresses, HTTPS for domains
    if (isIP || isLocalhost) {
      logger.info(`Auto-detected HTTP protocol for host: ${host}`);
      return `http://${host}`;
    } else {
      logger.info(`Auto-detected HTTPS protocol for host: ${host}`);
      return `https://${host}`;
    }
  }

  async login(): Promise<AgatarkLoginResponse> {
    try {
      logger.info('Attempting to login to Agatark system');
      
      const loginData = {
        a: "23h",
        email: this.email,
        remember: this.remember,
        token: "7df5c7ff3ca5373e446f83a610c91b35c6660f0630ee8ee433ba21e9d350fb18"
      };

      const response = await this.client.put<AgatarkLoginResponse>('/hello', loginData);
      
      // Extract authorization from response
      this.authorization = response.data.authorization;
      
      // Set session cookies - extract the token part after "S "
      const authToken = response.data.authorization.replace(/^S\s+/, '');
      this.sessionCookies = `a=${authToken}; b=1mr`;
      
      logger.info(`Successfully logged in as ${response.data.user.name} (${response.data.user.email})`);
      logger.info(`Connected to node: ${response.data.nodeName}`);
      logger.info(`Available sites: ${response.data.sites.map(s => s.name).join(', ')}`);
      
      return response.data;
    } catch (error) {
      logger.error('Login failed:', error);
      throw new Error(`Authentication failed: ${error}`);
    }
  }

  async getDevices(): Promise<AgatarkDevice[]> {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated. Please login first.');
      }

      const response = await this.client.get<AgatarkDevice[]>('/devices');
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch devices:', error);
      throw error;
    }
  }

  async pollEvents(): Promise<AgatarkEventsResponse> {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated. Please login first.');
      }

      const response = await this.client.post<AgatarkEventsResponse>('/events');
      return response.data;
    } catch (error) {
      logger.error('Failed to poll events:', error);
      throw error;
    }
  }

  async controlDevice(deviceId: number, status: Record<string, any>): Promise<void> {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated. Please login first.');
      }

      const data = {
        status
      };

      await this.client.patch(`/devices?id=${deviceId}`, data);
      
      logger.info(`Successfully controlled device ${deviceId}:`, status);
    } catch (error) {
      logger.error(`Failed to control device ${deviceId}:`, error);
      throw error;
    }
  }

  async getRoles(): Promise<any> {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated. Please login first.');
      }

      const response = await this.client.get('/roles');
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch roles:', error);
      throw error;
    }
  }

  async getSecurityAreas(): Promise<any> {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated. Please login first.');
      }

      const response = await this.client.get('/security_areas');
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch security areas:', error);
      throw error;
    }
  }

  get isAuthenticated(): boolean {
    return this.authorization !== null;
  }

  disconnect(): void {
    this.authorization = null;
    this.sessionCookies = null;
    logger.info('Disconnected from Agatark system');
  }
}