import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/api';

export interface BewerbungsprofilData {
  anrede?: string;
  name?: string;
  vorname?: string;
  email?: string;
  telefon?: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  wbs_vorhanden?: string;
  wbs_gueltig_bis?: string;
  wbs_zimmeranzahl?: string;
  einkommensgrenze?: string;
  wbs_besonderer_wohnbedarf?: string;
}


export class ProfileService {
  static async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('access_token');
  }

  static async getRefreshToken(): Promise<string | null> {
    return await AsyncStorage.getItem('refresh_token');
  }

  static async getUserEmail(): Promise<string | null> {
    return await AsyncStorage.getItem('user_email');
  }

  static async refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        console.log('No refresh token available');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/api/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        console.log('Failed to refresh token:', response.status);
        return false;
      }

      const tokenData = await response.json();

      // Store new tokens
      await AsyncStorage.multiSet([
        ['access_token', tokenData.access_token],
        ['refresh_token', tokenData.refresh_token],
      ]);

      console.log('Token refreshed successfully');
      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }

  static async makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Add authorization header
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // If request fails with 401, try to refresh token and retry once
    if (response.status === 401) {
      console.log('Token expired, attempting to refresh...');
      const refreshSuccess = await this.refreshAccessToken();

      if (refreshSuccess) {
        // Retry the request with new token
        const newToken = await this.getAuthToken();
        response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${newToken}`,
          },
        });
      } else {
        // Refresh failed, user needs to log in again
        await this.logout();
        throw new Error('Authentication failed. Please log in again.');
      }
    }

    return response;
  }

  static async logout(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'access_token',
        'refresh_token',
        'user_email',
        'stay_logged_in',
        'stored_email',
        'stored_password',
      ]);
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  }

  static async isProfileComplete(): Promise<boolean> {
    try {
      const profileData = await this.getBewerbungsprofil();

      if (!profileData) {
        return false;
      }

      // Check if essential profile fields are filled
      const requiredFields = [
        'anrede',
        'vorname',
        'name',
        'email',
        'telefon',
        'strasse',
        'plz',
        'ort',
      ];

      const isComplete = requiredFields.every(
        field =>
          profileData[field as keyof BewerbungsprofilData] &&
          profileData[field as keyof BewerbungsprofilData]?.trim() !== ''
      );

      return isComplete;
    } catch (error) {
      console.error('Error checking profile completeness:', error);
      return false;
    }
  }

  static async updateBewerbungsprofil(
    data: BewerbungsprofilData
  ): Promise<boolean> {
    try {
      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/bewerbungsprofil`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error updating bewerbungsprofil:', error);
      return false;
    }
  }

  static async getBewerbungsprofil(): Promise<BewerbungsprofilData | null> {
    try {
      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/bewerbungsprofil`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching bewerbungsprofil:', error);
      return null;
    }
  }
}
