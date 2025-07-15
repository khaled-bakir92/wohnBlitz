import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration for notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class PushNotificationService {
  private static instance: PushNotificationService;
  private expoPushToken: string | null = null;
  private API_BASE_URL = 'http://localhost:8000';
  private onNotificationReceived?: (notification: Notifications.Notification) => void;

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Register device for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if running on physical device
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return null;
      }

      // Set up Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('wohnblitzer', {
          name: 'WohnBlitzer Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3b82f6',
        });
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return null;
      }

      // Get project ID from constants
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) {
        console.warn('Project ID not found in constants');
        return null;
      }

      // Get Expo push token
      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      
      this.expoPushToken = tokenResponse.data;
      console.log('Expo Push Token:', this.expoPushToken);

      // Store token in AsyncStorage
      await AsyncStorage.setItem('expo_push_token', this.expoPushToken);

      // Send token to backend
      await this.sendTokenToBackend(this.expoPushToken);

      return this.expoPushToken;

    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Send push token to backend
   */
  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      const accessToken = await AsyncStorage.getItem('access_token');
      if (!accessToken) {
        console.warn('No access token found, cannot send push token to backend');
        return;
      }

      const response = await fetch(`${this.API_BASE_URL}/api/push/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS,
          device_type: 'expo',
        }),
      });

      if (!response.ok) {
        console.warn('Failed to send push token to backend:', response.status);
      } else {
        console.log('Successfully sent push token to backend');
      }
    } catch (error) {
      console.error('Error sending push token to backend:', error);
    }
  }

  /**
   * Get current push token
   */
  async getCurrentToken(): Promise<string | null> {
    if (this.expoPushToken) {
      return this.expoPushToken;
    }

    // Try to get from AsyncStorage
    const storedToken = await AsyncStorage.getItem('expo_push_token');
    if (storedToken) {
      this.expoPushToken = storedToken;
      return storedToken;
    }

    return null;
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners(): {
    notificationListener: Notifications.EventSubscription;
    responseListener: Notifications.EventSubscription;
  } {
    // Listen for notifications received while app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // You can add custom logic here, like updating UI or state
      // For example, refresh the notification count
      this.onNotificationReceived?.(notification);
    });

    // Listen for user interaction with notifications
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Handle notification tap/action
      this.handleNotificationResponse(response);
    });

    return { notificationListener, responseListener };
  }

  /**
   * Handle notification response (when user taps on notification)
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const { notification } = response;
    const data = notification.request.content.data;

    // Handle different notification types
    if (data?.type === 'chat_message') {
      // Navigate to chat screen
      console.log('Navigate to chat:', data.conversation_id);
    } else if (data?.type === 'apartment_found') {
      // Navigate to apartment details
      console.log('Navigate to apartment:', data.apartment_id);
    }
  }

  /**
   * Schedule local notification (for testing)
   */
  async scheduleLocalNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: {
          seconds: 2,
        },
      });
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * Get last notification response (for handling app launch from notification)
   * Note: This method is not available on all platforms/versions
   */
  async getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
    // Skip this method entirely on iOS to avoid errors
    console.log('getLastNotificationResponse: Skipping on iOS - using alternative deep linking methods');
    return null;
  }

  /**
   * Set callback for when notifications are received
   */
  setNotificationReceivedCallback(callback: (notification: Notifications.Notification) => void): void {
    this.onNotificationReceived = callback;
  }

  /**
   * Remove notification listeners
   */
  removeListeners(listeners: { notificationListener: Notifications.EventSubscription; responseListener: Notifications.EventSubscription }): void {
    listeners.notificationListener?.remove();
    listeners.responseListener?.remove();
  }
}

export default PushNotificationService;