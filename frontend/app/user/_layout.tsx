import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, TouchableOpacity, Alert } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useUser } from '@/shared/contexts/UserContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isProfileCompleted } = useUser();

  // Custom tab bar button that handles disabled state
  const CustomTabBarButton = ({ children, onPress, disabled, ...props }: any) => {
    const handlePress = () => {
      if (disabled) {
        Alert.alert(
          'Profil unvollständig',
          'Bitte vervollständigen Sie zuerst Ihr Bewerbungsprofil, um auf diese Funktion zugreifen zu können.',
          [{ text: 'OK' }]
        );
        return;
      }
      if (onPress) {
        onPress();
      }
    };

    return (
      <TouchableOpacity
        {...props}
        onPress={handlePress}
        style={[
          props.style,
          disabled && { opacity: 0.3 }
        ]}
      >
        {children}
      </TouchableOpacity>
    );
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <IconSymbol 
              size={28} 
              name="chart.bar.fill" 
              color={isProfileCompleted ? color : '#9CA3AF'} 
            />
          ),
          tabBarButton: (props) => (
            <CustomTabBarButton
              {...props}
              disabled={!isProfileCompleted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Suchfilter',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="line.3.horizontal.decrease.circle"
              color={isProfileCompleted ? color : '#9CA3AF'}
            />
          ),
          tabBarButton: (props) => (
            <CustomTabBarButton
              {...props}
              disabled={!isProfileCompleted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="suche"
        options={{
          title: 'Suche',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="magnifyingglass.circle.fill"
              color={isProfileCompleted ? color : '#9CA3AF'}
            />
          ),
          tabBarButton: (props) => (
            <CustomTabBarButton
              {...props}
              disabled={!isProfileCompleted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => (
            <IconSymbol 
              size={28} 
              name="person.fill" 
              color={isProfileCompleted ? color : '#9CA3AF'} 
            />
          ),
          tabBarButton: (props) => (
            <CustomTabBarButton
              {...props}
              disabled={!isProfileCompleted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="wbs"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile2"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile-completion"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
