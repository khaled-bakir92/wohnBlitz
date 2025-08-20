import React, {
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { Surface, Divider, Badge } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error' | 'apartment';
  isRead: boolean;
  imageUrl?: string;
  actionUrl?: string;
}

interface NotificationModalProps {
  notifications: NotificationItem[];
  onNotificationPress?: (notification: NotificationItem) => void;
  onMarkAsRead?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  onClearAll?: () => void;
}

export interface NotificationModalRef {
  present: () => void;
  dismiss: () => void;
}

const NotificationModal = forwardRef<
  NotificationModalRef,
  NotificationModalProps
>(
  (
    {
      notifications,
      onNotificationPress,
      onMarkAsRead,
      onMarkAllAsRead,
      onClearAll,
    },
    ref
  ) => {
    const bottomSheetModalRef = React.useRef<BottomSheetModal>(null);

    const snapPoints = useMemo(() => ['50%', '85%'], []);

    useImperativeHandle(ref, () => ({
      present: () => bottomSheetModalRef.current?.present(),
      dismiss: () => bottomSheetModalRef.current?.dismiss(),
    }));

    const handleSheetChanges = useCallback((index: number) => {
      console.log('handleSheetChanges', index);
    }, []);

    const getNotificationIcon = (type: NotificationItem['type']) => {
      switch (type) {
        case 'apartment':
          return { name: 'home', color: '#3b82f6' };
        case 'success':
          return { name: 'check-circle', color: '#10b981' };
        case 'warning':
          return { name: 'warning', color: '#f59e0b' };
        case 'error':
          return { name: 'error', color: '#ef4444' };
        default:
          return { name: 'info', color: '#6b7280' };
      }
    };

    const getNotificationBackground = (type: NotificationItem['type']) => {
      switch (type) {
        case 'apartment':
          return '#dbeafe';
        case 'success':
          return '#d1fae5';
        case 'warning':
          return '#fef3c7';
        case 'error':
          return '#fecaca';
        default:
          return '#f3f4f6';
      }
    };

    const formatTimeAgo = (date: Date) => {
      const now = new Date();
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60)
      );

      if (diffInMinutes < 1) return 'Gerade eben';
      if (diffInMinutes < 60) return `vor ${diffInMinutes} Min.`;

      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `vor ${diffInHours} Std.`;

      const diffInDays = Math.floor(diffInHours / 24);
      return `vor ${diffInDays} Tag${diffInDays > 1 ? 'en' : ''}`;
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const renderNotificationItem = (notification: NotificationItem) => {
      const icon = getNotificationIcon(notification.type);
      const backgroundColor = getNotificationBackground(notification.type);

      return (
        <TouchableOpacity
          key={notification.id}
          style={[
            styles.notificationItem,
            !notification.isRead && styles.unreadNotification,
          ]}
          onPress={() => {
            if (!notification.isRead && onMarkAsRead) {
              onMarkAsRead(notification.id);
            }
            if (onNotificationPress) {
              onNotificationPress(notification);
            }
          }}
        >
          <View style={styles.notificationContent}>
            <View style={[styles.iconContainer, { backgroundColor }]}>
              <MaterialIcons
                name={icon.name as any}
                size={24}
                color={icon.color}
              />
            </View>

            <View style={styles.textContainer}>
              <View style={styles.headerRow}>
                <Text
                  style={[
                    styles.notificationTitle,
                    !notification.isRead && styles.unreadTitle,
                  ]}
                >
                  {notification.title}
                </Text>
                {!notification.isRead && <View style={styles.unreadDot} />}
              </View>

              <Text style={styles.notificationMessage} numberOfLines={2}>
                {notification.message}
              </Text>

              <Text style={styles.notificationTime}>
                {formatTimeAgo(notification.timestamp)}
              </Text>
            </View>

            {notification.imageUrl && (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: notification.imageUrl }}
                  style={styles.notificationImage}
                />
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    };

    const renderHeader = () => (
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Benachrichtigungen</Text>
            {unreadCount > 0 && (
              <Badge style={styles.headerBadge} size={20}>
                {unreadCount}
              </Badge>
            )}
          </View>

          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onMarkAllAsRead}
              >
                <MaterialIcons name="done-all" size={20} color="#3b82f6" />
                <Text style={styles.actionButtonText}>Alle lesen</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.actionButton} onPress={onClearAll}>
              <MaterialIcons name="clear-all" size={20} color="#6b7280" />
              <Text style={[styles.actionButtonText, { color: '#6b7280' }]}>
                Löschen
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <LinearGradient
          colors={['rgba(59, 130, 246, 0.1)', 'transparent']}
          style={styles.headerGradient}
        />
      </View>
    );

    const renderEmptyState = () => (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <MaterialIcons name="notifications-none" size={64} color="#d1d5db" />
        </View>
        <Text style={styles.emptyTitle}>Keine Benachrichtigungen</Text>
        <Text style={styles.emptySubtitle}>
          Sie haben alle Benachrichtigungen gelesen
        </Text>
      </View>
    );

    return (
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={1}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={true}
        enableDismissOnClose={true}
        backgroundStyle={styles.modalBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.container}>
          {renderHeader()}

          {notifications.length === 0 ? (
            renderEmptyState()
          ) : (
            <BottomSheetScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.notificationsList}>
                {notifications.map(renderNotificationItem)}
              </View>
            </BottomSheetScrollView>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalBackground: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: '#d1d5db',
    width: 48,
    height: 4,
  },
  header: {
    position: 'relative',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerContent: {
    position: 'relative',
    zIndex: 2,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 8,
  },
  headerBadge: {
    backgroundColor: '#ef4444',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  notificationsList: {
    padding: 16,
  },
  notificationItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  imageContainer: {
    marginLeft: 12,
  },
  notificationImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default NotificationModal;
