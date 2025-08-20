import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from '@/constants/api';
import { useUser } from '@/shared/contexts/UserContext';

import ProfileForm from './profile';
import Profile2Form from './profile2';
import WBSForm from './wbs';

type Step = 'profile' | 'profile2' | 'wbs' | 'completed';

export default function ProfileCompletion() {
  const [currentStep, setCurrentStep] = useState<Step>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>({});
  const { refreshUser, isProfileCompleted, isLoading: userLoading } = useUser();

  // Redirect if profile is already completed
  useEffect(() => {
    if (!userLoading && isProfileCompleted) {
      router.replace('/user');
    }
  }, [isProfileCompleted, userLoading]);

  const steps = [
    { key: 'profile', title: 'Persönliche Daten', icon: 'person' },
    { key: 'profile2', title: 'Weitere Angaben', icon: 'document-text' },
    { key: 'wbs', title: 'WBS-Berechtigung', icon: 'home' },
  ];

  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.key === currentStep);
  };

  const handleStepComplete = (stepData: any) => {
    setProfileData(prev => ({ ...prev, ...stepData }));

    const currentIndex = getCurrentStepIndex();
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].key as Step);
    } else {
      // All steps completed - save profile
      saveCompleteProfile({ ...profileData, ...stepData });
    }
  };

  const saveCompleteProfile = async (completeData: any) => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert('Fehler', 'Sie sind nicht angemeldet');
        router.replace('/login');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/bewerbungsprofil`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(completeData),
        }
      );

      if (response.ok) {
        // Update user context to reflect profile completion
        await refreshUser();
        
        // Show success toast
        Toast.show({
          type: 'success',
          text1: 'Profil vervollständigt!',
          text2: 'Ihr Bewerbungsprofil wurde erfolgreich gespeichert.',
          position: 'top',
          visibilityTime: 2000,
          autoHide: true,
        });

        // Automatically redirect to dashboard after a short delay
        setTimeout(() => {
          router.replace('/user');
        }, 2000);
      } else {
        const errorData = await response.json();
        Toast.show({
          type: 'error',
          text1: 'Fehler',
          text2: errorData.detail || 'Profil konnte nicht gespeichert werden',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Toast.show({
        type: 'error',
        text1: 'Verbindungsfehler',
        text2: 'Bitte überprüfen Sie Ihre Internetverbindung',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'profile':
        return <ProfileForm onComplete={handleStepComplete} />;
      case 'profile2':
        return <Profile2Form onComplete={handleStepComplete} />;
      case 'wbs':
        return <WBSForm onComplete={handleStepComplete} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Profil wird gespeichert...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {steps.map((step, index) => {
          const isActive = step.key === currentStep;
          const isCompleted = getCurrentStepIndex() > index;

          return (
            <View key={step.key} style={styles.stepContainer}>
              <View
                style={[
                  styles.stepCircle,
                  isActive && styles.stepCircleActive,
                  isCompleted && styles.stepCircleCompleted,
                ]}
              >
                <Ionicons
                  name={step.icon as any}
                  size={20}
                  color={isActive || isCompleted ? '#fff' : '#9CA3AF'}
                />
              </View>
              <Text
                style={[
                  styles.stepTitle,
                  isActive && styles.stepTitleActive,
                  isCompleted && styles.stepTitleCompleted,
                ]}
              >
                {step.title}
              </Text>
              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.stepConnector,
                    isCompleted && styles.stepConnectorCompleted,
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>

      {/* Current Step Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#fff',
    marginBottom: 20,
    marginTop: 20,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: '#667eea',
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepTitle: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontWeight: '500',
  },
  stepTitleActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  stepTitleCompleted: {
    color: '#10B981',
    fontWeight: '600',
  },
  stepConnector: {
    position: 'absolute',
    top: 24,
    left: '75%',
    right: '-75%',
    height: 2,
    backgroundColor: '#E5E7EB',
    zIndex: -1,
  },
  stepConnectorCompleted: {
    backgroundColor: '#10B981',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
});
