import { useEffect } from 'react';
import { Platform, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

/**
 * Hook to observe and handle notification responses
 * Compatible with Expo Router for deep linking
 */
export function useNotificationObserver() {
  useEffect(() => {
    let isMounted = true;

    function redirect(notification: Notifications.Notification) {
      const data = notification.request.content.data;

      // Handle different notification types
      if (data?.type === 'chat_message' && data?.conversation_id) {
        // Navigate to specific chat conversation
        try {
          router.push(`/user/chat/${data.conversation_id}`);
        } catch (error) {
          console.warn('Navigation error:', error);
        }
      } else if (data?.type === 'apartment_found' && data?.apartment_id) {
        // Navigate to apartment details
        try {
          router.push(`/user/apartment/${data.apartment_id}`);
        } catch (error) {
          console.warn('Navigation error:', error);
        }
      } else if (data?.url) {
        // Generic URL navigation
        try {
          router.push(data.url);
        } catch (error) {
          console.warn('Navigation error:', error);
        }
      }
    }

    // Check for initial deep link that opened the app
    const checkInitialNotification = async () => {
      try {
        // Use Linking API for deep links (more reliable across platforms)
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && isMounted) {
          console.log('App opened with URL:', initialUrl);
          // Parse URL and navigate if it's a notification URL
          if (
            initialUrl.includes('notification') ||
            initialUrl.includes('chat') ||
            initialUrl.includes('apartment')
          ) {
            try {
              router.push(initialUrl.replace(/.*\/\/[^\/]+/, '')); // Remove scheme and host
            } catch (error) {
              console.warn('URL navigation error:', error);
            }
          }
        }
      } catch (error) {
        console.warn('Could not check initial URL:', error);
      }
    };

    checkInitialNotification();

    // Listen for notification responses while app is running
    const notificationSubscription =
      Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response received:', response);
        redirect(response.notification);
      });

    // Listen for incoming deep links while app is running
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      console.log('Deep link received:', url);
      if (
        url.includes('notification') ||
        url.includes('chat') ||
        url.includes('apartment')
      ) {
        try {
          router.push(url.replace(/.*\/\/[^\/]+/, '')); // Remove scheme and host
        } catch (error) {
          console.warn('Deep link navigation error:', error);
        }
      }
    });

    return () => {
      isMounted = false;
      notificationSubscription.remove();
      linkingSubscription?.remove();
    };
  }, []);
}
