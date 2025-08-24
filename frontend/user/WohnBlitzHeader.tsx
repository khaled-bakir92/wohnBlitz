import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Surface } from 'react-native-paper';
import { router } from 'expo-router';
import { ProfileService } from './profileService';
import { useNotifications } from '@/shared/contexts/NotificationContext';
import NotificationModal, {
  NotificationModalRef,
} from '@/shared/NotificationModal';

interface WohnBlitzHeaderProps {
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
}

export default function WohnBlitzHeader({
  onNotificationPress,
  onProfilePress,
}: WohnBlitzHeaderProps) {
  const insets = useSafeAreaInsets();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [menuAnimation] = useState(new Animated.Value(0));
  const notificationModalRef = useRef<NotificationModalRef>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } =
    useNotifications();

  const toggleProfileMenu = () => {
    if (showProfileMenu) {
      Animated.timing(menuAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowProfileMenu(false));
    } else {
      setShowProfileMenu(true);
      Animated.timing(menuAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleLogout = async () => {
    setShowProfileMenu(false);
    Alert.alert('Abmelden', 'Möchten Sie sich wirklich abmelden?', [
      {
        text: 'Abbrechen',
        style: 'cancel',
      },
      {
        text: 'Abmelden',
        style: 'destructive',
        onPress: async () => {
          try {
            await ProfileService.logout();
            router.replace('/login');
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Fehler', 'Beim Abmelden ist ein Fehler aufgetreten.');
          }
        },
      },
    ]);
  };

  const handleSupport = () => {
    setShowProfileMenu(false);
    console.log('Kontakt Support pressed');
    // You can implement support functionality here
  };

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      notificationModalRef.current?.present();
    }
  };

  const handleNotificationItemPress = (notification: any) => {
    console.log('Notification item pressed:', notification);

    // Close the notification modal first
    notificationModalRef.current?.dismiss();

    // Navigate to chat with the conversation ID
    if (notification.id) {
      router.push(`/user/chat/${notification.id}`);
    }
  };

  const handleProfileIconPress = () => {
    if (onProfilePress) {
      onProfilePress();
    } else {
      toggleProfileMenu();
    }
  };

  return (
    <>
      <StatusBar
        backgroundColor="#f2f2f7"
        barStyle="dark-content"
      />
      {showProfileMenu && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowProfileMenu(false)}
        />
      )}
      <View style={styles.headerWithSafeArea}>
        <View style={[styles.safeAreaTop, { height: insets.top }]} />
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            {/* Center - Logo (Facebook style) */}
            <View style={styles.centerSection}>
              <Image
                source={require('@/assets/images/logo2.png')}
                style={styles.facebookLogo}
                contentFit="contain"
              />
            </View>

            {/* Right side - Icons (Facebook style) */}
            <View style={styles.rightSection}>
              <TouchableOpacity
                style={styles.cleanIconButton}
                onPress={handleNotificationPress}
              >
                <View style={styles.notificationContainer}>
                  <MaterialIcons
                    name="notifications-none"
                    size={28}
                    color="#000000"
                  />
                  {unreadCount > 0 && (
                    <View style={styles.facebookNotificationBadge}>
                      <Text style={styles.notificationText}>
                        {unreadCount > 99 ? '99+' : unreadCount.toString()}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cleanIconButton}
                onPress={handleProfileIconPress}
              >
                <MaterialIcons
                  name="account-circle"
                  size={28}
                  color="#000000"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <Animated.View
              style={[
                styles.dropdownMenu,
                {
                  opacity: menuAnimation,
                  transform: [
                    {
                      translateY: menuAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-10, 0],
                      }),
                    },
                    {
                      scale: menuAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.95, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Surface style={styles.menuSurface} elevation={8}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleSupport}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={styles.menuIconContainer}>
                      <MaterialIcons name="chat" size={20} color="#6b7280" />
                    </View>
                    <Text style={styles.menuItemText}>Kontakt Support</Text>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color="#d1d5db"
                  />
                </TouchableOpacity>

                <View style={styles.menuDivider} />

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleLogout}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={styles.menuIconContainer}>
                      <MaterialIcons name="logout" size={20} color="#ef4444" />
                    </View>
                    <Text style={[styles.menuItemText, { color: '#ef4444' }]}>
                      Logout
                    </Text>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color="#d1d5db"
                  />
                </TouchableOpacity>
              </Surface>
            </Animated.View>
          )}
        </View>
      </View>

      <NotificationModal
        ref={notificationModalRef}
        notifications={notifications}
        onNotificationPress={handleNotificationItemPress}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onClearAll={clearAll}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    backgroundColor: 'transparent',
  },
  headerWithSafeArea: {
    backgroundColor: '#f2f2f7', // App background color
    zIndex: 1000,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  safeAreaTop: {
    backgroundColor: '#f2f2f7', // App background color
  },
  headerContainer: {
    backgroundColor: '#f2f2f7', // App background color
    borderBottomWidth: 0.5,
    borderBottomColor: '#d1d5db',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 56,
  },
  centerSection: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  facebookLogo: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cleanIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContainer: {
    position: 'relative',
  },
  facebookNotificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff3040',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  notificationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 16,
    zIndex: 1000,
    minWidth: 200,
  },
  menuSurface: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
    marginVertical: 4,
  },
});
