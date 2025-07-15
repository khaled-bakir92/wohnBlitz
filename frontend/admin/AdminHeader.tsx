import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Alert, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Surface } from 'react-native-paper';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotifications } from '@/contexts/NotificationContext';
import NotificationModal, { NotificationModalRef } from './NotificationModal';

// Konstante Farbe für durchgängige Hintergrundfarbe
const HEADER_BACKGROUND_COLOR = 'rgba(43, 93, 111, 0.15)';

interface AdminHeaderProps {
  title?: string;
  onNotificationPress?: () => void;
}

export default function AdminHeader({ 
  title = "Admin Dashboard",
  onNotificationPress
}: AdminHeaderProps) {
  const insets = useSafeAreaInsets();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [menuAnimation] = useState(new Animated.Value(0));
  const notificationModalRef = useRef<NotificationModalRef>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

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
    Alert.alert(
      'Admin Abmelden',
      'Möchten Sie sich wirklich als Administrator abmelden?',
      [
        {
          text: 'Abbrechen',
          style: 'cancel',
        },
        {
          text: 'Abmelden',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all stored data
              await AsyncStorage.multiRemove([
                'access_token',
                'refresh_token',
                'user_email',
                'stay_logged_in',
                'stored_email',
                'stored_password'
              ]);
              router.replace('/login');
            } catch (error) {
              console.error('Admin logout error:', error);
              Alert.alert('Fehler', 'Beim Abmelden ist ein Fehler aufgetreten.');
            }
          },
        },
      ]
    );
  };

  const handleSettings = () => {
    setShowProfileMenu(false);
    console.log('Admin Settings pressed');
    // Navigate to admin settings if available
  };

  const handleSupport = () => {
    setShowProfileMenu(false);
    console.log('Admin Support pressed');
    // You can implement admin support functionality here
  };

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      notificationModalRef.current?.present();
    }
  };

  const handleNotificationItemPress = (notification: any) => {
    console.log('Admin notification item pressed:', notification);
    
    // Close the notification modal first
    notificationModalRef.current?.dismiss();
    
    // Navigate to admin chat with the conversation ID
    if (notification.id) {
      router.push(`/admin/chat/${notification.id}`);
    }
  };

  return (
    <>
      <StatusBar 
        backgroundColor="transparent" 
        barStyle="dark-content" 
        translucent={true}
      />
      {showProfileMenu && (
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={() => setShowProfileMenu(false)}
        />
      )}
      <View style={[styles.headerWithSafeArea, { paddingTop: insets.top }]}>
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            {/* Left side - Logo and Title */}
            <View style={styles.leftSection}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('@/assets/images/app-logo.png')}
                  style={styles.logo}
                  contentFit="contain"
                />
              </View>
              <View style={styles.titleContainer}>
                <Text style={styles.appName}>WohnBlitz</Text>
                <View style={styles.adminBadge}>
                  <MaterialIcons name="shield" size={12} color="#FFFFFF" />
                  <Text style={styles.adminText}>Admin</Text>
                </View>
              </View>
            </View>

            {/* Center - Page Title */}
            <View style={styles.centerSection}>
              <Text style={styles.pageTitle}>{title}</Text>
            </View>

            {/* Right side - Icons */}
            <View style={styles.rightSection}>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={handleNotificationPress}
              >
                <View style={styles.notificationContainer}>
                  <MaterialIcons 
                    name="notifications-none" 
                    size={24} 
                    color="#374151" 
                  />
                  {unreadCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationText}>
                        {unreadCount > 99 ? '99+' : unreadCount.toString()}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={toggleProfileMenu}
              >
                <MaterialIcons 
                  name="account-circle" 
                  size={24} 
                  color="#374151" 
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
              <Surface style={styles.menuSurface}>
                <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
                  <View style={styles.menuItemLeft}>
                    <View style={styles.menuIconContainer}>
                      <MaterialIcons name="settings" size={20} color="#6b7280" />
                    </View>
                    <Text style={styles.menuItemText}>Admin Einstellungen</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#d1d5db" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.menuItem} onPress={handleSupport}>
                  <View style={styles.menuItemLeft}>
                    <View style={styles.menuIconContainer}>
                      <MaterialIcons name="help" size={20} color="#6b7280" />
                    </View>
                    <Text style={styles.menuItemText}>Admin Support</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#d1d5db" />
                </TouchableOpacity>
                
                <View style={styles.menuDivider} />
                
                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                  <View style={styles.menuItemLeft}>
                    <View style={styles.menuIconContainer}>
                      <MaterialIcons name="logout" size={20} color="#ef4444" />
                    </View>
                    <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Abmelden</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#d1d5db" />
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
    backgroundColor: HEADER_BACKGROUND_COLOR,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerContainer: {
    backgroundColor: HEADER_BACKGROUND_COLOR,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(43, 93, 111, 0.3)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    marginRight: 8,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    letterSpacing: 0.5,
    marginRight: 8,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  adminText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  iconButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 20,
  },
  notificationContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
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
    minWidth: 220,
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