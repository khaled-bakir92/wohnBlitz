import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileService } from '@/services/profileService';

const WohnBlitzLogo = () => (
  <View style={styles.logoContainer}>
    <View style={styles.appIconContainer}>
      <Image
        source={require('@/assets/images/app-logo.png')}
        style={styles.appIcon}
        contentFit="contain"
      />
    </View>
    <Text style={styles.logoText}>
      <Text style={styles.logoWohn}>Wohn</Text>
      <Text style={styles.logoBlitz}>Blitzer</Text>
    </Text>
  </View>
);

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);

  useEffect(() => {
    checkAutoLogin();
  }, []);

  const checkAutoLogin = async () => {
    try {
      const shouldStayLoggedIn = await AsyncStorage.getItem('stay_logged_in');
      const storedEmail = await AsyncStorage.getItem('stored_email');
      const storedPassword = await AsyncStorage.getItem('stored_password');
      const existingToken = await AsyncStorage.getItem('access_token');

      if (shouldStayLoggedIn === 'true' && storedEmail && storedPassword) {
        setEmail(storedEmail);
        setPassword(storedPassword);
        setStayLoggedIn(true);
        
        // If we have a valid token, try to navigate directly
        if (existingToken) {
          const isProfileComplete = await ProfileService.isProfileComplete();
          if (isProfileComplete) {
            router.replace('/(tabs)');
          } else {
            router.replace('/profile');
          }
          return;
        }
        
        // Auto-login
        setIsLoading(true);
        await performLogin(storedEmail, storedPassword, false);
      }
    } catch (error) {
      console.error('Auto-login check error:', error);
    }
  };

  const performLogin = async (loginEmail: string, loginPassword: string, showAlert: boolean = true) => {
    try {
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail.toLowerCase().trim(),
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('access_token', data.access_token);
        await AsyncStorage.setItem('refresh_token', data.refresh_token);
        await AsyncStorage.setItem('user_email', loginEmail.toLowerCase().trim());
        
        // Store stay logged in preference
        if (stayLoggedIn) {
          await AsyncStorage.setItem('stay_logged_in', 'true');
          await AsyncStorage.setItem('stored_email', loginEmail.toLowerCase().trim());
          await AsyncStorage.setItem('stored_password', loginPassword);
        } else {
          await AsyncStorage.removeItem('stay_logged_in');
          await AsyncStorage.removeItem('stored_email');
          await AsyncStorage.removeItem('stored_password');
        }
        
        // Check if profile is complete to determine navigation
        const isProfileComplete = await ProfileService.isProfileComplete();
        
        if (showAlert) {
          Alert.alert('Erfolg', 'Anmeldung erfolgreich!', [
            {
              text: 'OK',
              onPress: () => {
                if (isProfileComplete) {
                  router.replace('/(tabs)');
                } else {
                  router.replace('/profile');
                }
              },
            },
          ]);
        } else {
          if (isProfileComplete) {
            router.replace('/(tabs)');
          } else {
            router.replace('/profile');
          }
        }
      } else {
        if (showAlert) {
          Alert.alert('Anmeldung fehlgeschlagen', data.detail || 'Unbekannter Fehler');
        }
        // Clear stored credentials if auto-login fails
        await AsyncStorage.removeItem('stay_logged_in');
        await AsyncStorage.removeItem('stored_email');
        await AsyncStorage.removeItem('stored_password');
      }
    } catch (error) {
      if (showAlert) {
        Alert.alert('Verbindungsfehler', 'Bitte überprüfen Sie Ihre Internetverbindung.');
      }
      console.error('Login error:', error);
      // Clear stored credentials if auto-login fails
      await AsyncStorage.removeItem('stay_logged_in');
      await AsyncStorage.removeItem('stored_email');
      await AsyncStorage.removeItem('stored_password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Fehler', 'Bitte geben Sie E-Mail und Passwort ein.');
      return;
    }

    setIsLoading(true);
    await performLogin(email, password, true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.logoSection}>
          <WohnBlitzLogo />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.title}>Anmelden</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="E-Mail-Adresse"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Passwort*"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>

          {/* Stay Logged In Checkbox */}
          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => setStayLoggedIn(!stayLoggedIn)}
          >
            <View style={[styles.checkbox, stayLoggedIn && styles.checkboxChecked]}>
              {stayLoggedIn && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.checkboxLabel}>Angemeldet bleiben</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Anmelden...' : 'Anmelden'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -50,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appIconContainer: {
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 1,
  },
  logoWohn: {
    color: '#B8D4E3',
  },
  logoBlitz: {
    color: '#5A9BC4',
    fontWeight: '600',
  },
  formSection: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 18,
  },
  loginButton: {
    backgroundColor: '#C8D5DB',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loginButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButtonDisabled: {
    backgroundColor: '#E5E7EB',
    opacity: 0.6,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#5A9BC4',
    borderColor: '#5A9BC4',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
}); 