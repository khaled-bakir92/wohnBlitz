import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import { NotificationItem } from '@/components/NotificationModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotificationService from '../services/pushNotificationService';
import { API_BASE_URL } from '@/constants/api';
import * as Notifications from 'expo-notifications';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (
    notification: Omit<NotificationItem, 'id' | 'timestamp'>
  ) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (notificationId: string) => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushService] = useState(() => PushNotificationService.getInstance());
  const [isAdmin, setIsAdmin] = useState(false);

  // API Base URL (from centralized config)

  // Check if user is admin
  const checkUserAdminStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userInfo = await response.json();
        const adminStatus =
          userInfo.is_admin === true || userInfo.is_admin === 1;
        setIsAdmin(adminStatus);
        console.log('User admin status:', adminStatus);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  // Get notification count from backend
  const fetchNotificationCount = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/api/chat/notifications/count`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      } else if (response.status === 401) {
        // stale/invalid token on device; ignore and wait for fresh login
        return;
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  // Get chat messages as notifications
  const fetchNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      // Choose endpoint based on admin status
      const endpoint = isAdmin
        ? '/api/chat/admin/conversations'
        : '/api/chat/conversations';
      console.log(
        'Fetching notifications from:',
        endpoint,
        'isAdmin:',
        isAdmin
      );

      // Get conversations
      const conversationsResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (conversationsResponse.ok) {
        const conversations = await conversationsResponse.json();
        const notificationItems: NotificationItem[] = [];

        for (const conversation of conversations) {
          if (conversation.unread_count > 0) {
            const title = isAdmin
              ? `Neue Nachricht von ${conversation.user_name}`
              : 'Neue Nachricht';

            notificationItems.push({
              id: conversation.id,
              title: title,
              message:
                conversation.last_message ||
                'Sie haben eine neue Nachricht erhalten.',
              timestamp: new Date(conversation.last_message_at),
              type: 'info',
              isRead: conversation.unread_count === 0,
            });
          }
        }

        setNotifications(notificationItems);
        console.log('Fetched notifications:', notificationItems.length);
      } else if (conversationsResponse.status === 401) {
        // stale/invalid token; ignore until user logs in again
        return;
      } else {
        console.error(
          'Failed to fetch conversations:',
          conversationsResponse.status
        );
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Refresh notifications
  const refreshNotifications = async () => {
    await checkUserAdminStatus();
    fetchNotificationCount();
    fetchNotifications();
  };

  // Initialize push notifications
  useEffect(() => {
    const initializePushNotifications = async () => {
      try {
        // Register for push notifications
        await pushService.registerForPushNotifications();

        // Set callback for when notifications are received
        pushService.setNotificationReceivedCallback(notification => {
          console.log('Notification received in context:', notification);
          // Refresh notifications when a new one arrives
          refreshNotifications();
        });

        // Set up notification listeners
        const listeners = pushService.setupNotificationListeners();

        // Note: App launch from notification is handled by useNotificationObserver hook
        console.log('Push notifications initialized successfully');

        return () => {
          pushService.removeListeners(listeners);
        };
      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }
    };

    initializePushNotifications();
  }, [pushService]);

  // Check admin status on mount
  useEffect(() => {
    checkUserAdminStatus();
  }, []);

  // Fetch notifications when admin status changes
  useEffect(() => {
    if (isAdmin !== undefined) {
      fetchNotificationCount();
      fetchNotifications();
    }
  }, [isAdmin]);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(refreshNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const addNotification = (
    notificationData: Omit<NotificationItem, 'id' | 'timestamp'>
  ) => {
    const newNotification: NotificationItem = {
      ...notificationData,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = async (notificationId: string) => {
    // Update local state immediately for better UX
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )
    );

    // Also mark as read on backend
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const endpoint = isAdmin
        ? `/api/chat/admin/conversations/${notificationId}/mark-read`
        : `/api/chat/conversations/${notificationId}/messages`; // This will auto-mark as read

      await fetch(`${API_BASE_URL}${endpoint}`, {
        method: isAdmin ? 'POST' : 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Refresh count after marking as read
      await fetchNotificationCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    // Update local state immediately for better UX
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, isRead: true }))
    );

    // Also mark all as read on backend
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      // Mark all conversations as read
      const unreadNotifications = notifications.filter(n => !n.isRead);
      for (const notification of unreadNotifications) {
        const endpoint = isAdmin
          ? `/api/chat/admin/conversations/${notification.id}/mark-read`
          : `/api/chat/conversations/${notification.id}/messages`; // This will auto-mark as read

        await fetch(`${API_BASE_URL}${endpoint}`, {
          method: isAdmin ? 'POST' : 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }

      // Refresh count after marking all as read
      await fetchNotificationCount();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const removeNotification = (notificationId: string) => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
