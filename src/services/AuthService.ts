import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// User interface
export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  aiServiceConnected?: boolean;
  aiServiceInfo?: {
    provider: string;
    accountId: string;
    lastSync?: string;
  };
}

// Auth service class
export class AuthService {
  private static instance: AuthService;
  
  private constructor() {}
  
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }
  
  // Save user info securely
  public async saveUser(user: User): Promise<void> {
    await SecureStore.setItemAsync('user', JSON.stringify(user));
  }
  
  // Get current user
  public async getUser(): Promise<User | null> {
    const userData = await SecureStore.getItemAsync('user');
    if (!userData) return null;
    
    try {
      return JSON.parse(userData) as User;
    } catch (e) {
      console.error('Error parsing user data:', e);
      return null;
    }
  }
  
  // Log out
  public async logout(): Promise<void> {
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync('auth_token');
  }
  
  // Email login/signup
  public async loginWithEmail(email: string, password: string): Promise<User> {
    // This is a mock implementation - in a real app, you would call your auth API
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const mockUser: User = {
          id: 'user_' + Date.now(),
          email: email,
          name: email.split('@')[0],
        };
        
        this.saveUser(mockUser);
        resolve(mockUser);
      }, 1000);
    });
  }
  
  // Connect to ChatGPT/AI service
  public async connectToAIService(provider: string): Promise<boolean> {
    try {
      // This would be a real OAuth flow in a production app
      // For this demo, we'll just simulate the connection
      
      // Example OAuth flow (not executed, just for reference):
      /*
      const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
      const authUrl = `https://api.openai.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=${redirectUri}&response_type=code&scope=api.read`;
      
      const result = await AuthSession.startAsync({
        authUrl,
      });
      
      if (result.type === 'success') {
        const { code } = result.params;
        // Exchange code for token with your backend
      }
      */
      
      // Mock implementation
      const user = await this.getUser();
      if (user) {
        user.aiServiceConnected = true;
        user.aiServiceInfo = {
          provider,
          accountId: `${provider}_user_${Date.now()}`,
          lastSync: new Date().toISOString()
        };
        
        await this.saveUser(user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error connecting to AI service:', error);
      return false;
    }
  }
  
  // Disconnect from AI service
  public async disconnectAIService(): Promise<boolean> {
    try {
      const user = await this.getUser();
      if (user) {
        user.aiServiceConnected = false;
        user.aiServiceInfo = undefined;
        
        await this.saveUser(user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error disconnecting AI service:', error);
      return false;
    }
  }
} 