import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Alert, Animated, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Surface } from 'react-native-paper';
import { router } from 'expo-router';
import { ProfileService } from '@/services/profileService';
import { useNotifications } from '@/contexts/NotificationContext';
import NotificationModal, { NotificationModalRef } from './NotificationModal';

interface WohnBlitzHeaderProps {
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
}

export default function WohnBlitzHeader({ 
  onNotificationPress, 
  onProfilePress
}: WohnBlitzHeaderProps) {
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
      'Abmelden',
      'Möchten Sie sich wirklich abmelden?',
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
              await ProfileService.logout();
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Fehler', 'Beim Abmelden ist ein Fehler aufgetreten.');
            }
          },
        },
      ]
    );
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
    // Handle notification item press - could navigate to specific screen
    console.log('Notification item pressed:', notification);
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
      <StatusBar backgroundColor="rgba(43, 93, 111, 0.15)" barStyle="dark-content" />
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
            {/* Left side - Logo and App Name */}
            <View style={styles.leftSection}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('@/assets/images/app-logo.png')}
                  style={styles.logo}
                  contentFit="contain"
                />
              </View>
              <Text style={styles.appName}>WohnBlitz</Text>
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
                onPress={handleProfileIconPress}
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
              <Surface style={styles.menuSurface} elevation={8}>
                <TouchableOpacity style={styles.menuItem} onPress={handleSupport}>
                  <View style={styles.menuItemLeft}>
                    <View style={styles.menuIconContainer}>
                      <MaterialIcons name="chat" size={20} color="#6b7280" />
                    </View>
                    <Text style={styles.menuItemText}>Kontakt Support</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#d1d5db" />
                </TouchableOpacity>
                
                <View style={styles.menuDivider} />
                
                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                  <View style={styles.menuItemLeft}>
                    <View style={styles.menuIconContainer}>
                      <MaterialIcons name="logout" size={20} color="#ef4444" />
                    </View>
                    <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Logout</Text>
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
    backgroundColor: 'rgba(43, 93, 111, 0.15)',
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
  safeAreaTop: {
    backgroundColor: 'rgba(43, 93, 111, 0.15)',
  },
  headerContainer: {
    backgroundColor: 'rgba(43, 93, 111, 0.15)',
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
  appName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    letterSpacing: 0.5,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
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