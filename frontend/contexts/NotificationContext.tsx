import React, { createContext, useContext, useState, ReactNode } from 'react';
import { NotificationItem } from '@/components/NotificationModal';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (notificationId: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      title: 'Neue Wohnung gefunden!',
      message: '3-Zimmer Wohnung in München-Schwabing, 85m², 1.850€ kalt. Passt perfekt zu Ihren Suchkriterien.',
      timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      type: 'apartment',
      isRead: false,
    },
    {
      id: '2',
      title: 'Bewerbung versendet',
      message: 'Ihre Bewerbung für die 2-Zimmer Wohnung in Berlin-Mitte wurde erfolgreich versendet.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      type: 'success',
      isRead: false,
    },
    {
      id: '3',
      title: 'Profil aktualisiert',
      message: 'Ihr Bewerbungsprofil wurde erfolgreich aktualisiert. Vergessen Sie nicht, regelmäßig nach neuen Wohnungen zu suchen.',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      type: 'info',
      isRead: true,
    },
    {
      id: '4',
      title: '5 neue Wohnungen gefunden',
      message: 'Ihre automatische Suche hat 5 neue Wohnungen gefunden, die Ihren Kriterien entsprechen.',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      type: 'apartment',
      isRead: false,
    },
    {
      id: '5',
      title: 'Besichtigungstermin bestätigt',
      message: 'Ihr Besichtigungstermin für morgen um 14:00 Uhr wurde vom Vermieter bestätigt.',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      type: 'success',
      isRead: true,
    },
  ]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const addNotification = (notificationData: Omit<NotificationItem, 'id' | 'timestamp'>) => {
    const newNotification: NotificationItem = {
      ...notificationData,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, isRead: true }))
    );
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
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};