import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, Avatar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ProfileService, BewerbungsprofilData } from '@/services/profileService';
import WohnBlitzHeader from '@/components/WohnBlitzHeader';

export default function ProfilScreen() {
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('Max Mustermann');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      
      // Get user email from storage
      const email = await ProfileService.getUserEmail();
      if (email) {
        setUserEmail(email);
      }

      // Try to get profile data to get the full name
      const profileData = await ProfileService.getBewerbungsprofil();
      if (profileData?.vorname && profileData?.name) {
        setUserName(`${profileData.vorname} ${profileData.name}`);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserEmail('Keine Email verfügbar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
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

  const menuItems = [
    {
      id: 1,
      title: 'Datenschutz',
      icon: 'shield',
      iconColor: '#6b7280',
      onPress: () => console.log('Datenschutz pressed')
    },
    {
      id: 2,
      title: 'Kontakt Support',
      icon: 'chat',
      iconColor: '#6b7280',
      onPress: () => console.log('Kontakt Support pressed')
    },
    {
      id: 3,
      title: 'Logout',
      icon: 'logout',
      iconColor: '#ef4444',
      onPress: handleLogout
    }
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <WohnBlitzHeader />
      
      <View style={styles.contentContainer}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        {/* User Profile Header */}
        <Surface style={[styles.profileHeader, { backgroundColor: 'white' }]} elevation={1}>
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <Avatar.Icon 
                size={64} 
                icon="account" 
                style={styles.avatar}
                color="#3b82f6"
              />
            </View>
            
            <View style={styles.userInfo}>
              <Text variant="titleLarge" style={styles.userName}>
                {userName}
              </Text>
              <Text variant="bodyMedium" style={styles.userEmail}>
                {userEmail || 'Keine Email verfügbar'}
              </Text>
            </View>
          </View>
        </Surface>

        {/* Einstellungen Section */}
        <View style={styles.settingsSection}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Einstellungen
          </Text>
          
          <Surface style={[styles.menuContainer, { backgroundColor: 'white' }]} elevation={1}>
            {menuItems.map((item, index) => (
              <View key={item.id}>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={item.onPress}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={styles.iconContainer}>
                      <MaterialIcons 
                        name={item.icon} 
                        size={20} 
                        color={item.iconColor} 
                      />
                    </View>
                    
                    <Text 
                      variant="bodyLarge" 
                      style={[
                        styles.menuItemText,
                        { color: item.iconColor }
                      ]}
                    >
                      {item.title}
                    </Text>
                  </View>
                  
                  <MaterialIcons 
                    name="chevron-right" 
                    size={24} 
                    color="#d1d5db" 
                  />
                </TouchableOpacity>
                
                {index < menuItems.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            ))}
          </Surface>
        </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileHeader: {
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    backgroundColor: '#dbeafe',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#1f2937',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    color: '#6b7280',
  },
  settingsSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: '#1f2937',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  menuContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 56, // Align with text
  },
});