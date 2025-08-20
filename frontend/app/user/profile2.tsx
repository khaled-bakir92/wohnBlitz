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
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { ProfileService } from '@/user/profileService';

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
      <Text style={styles.logoBlitz}>Blitz</Text>
    </Text>
  </View>
);

interface Profile2FormProps {
  onComplete?: (data: any) => void;
}

export default function Profile2Screen({ onComplete }: Profile2FormProps = {}) {
  const [strasse, setStrasse] = useState('');
  const [plz, setPlz] = useState('');
  const [ort, setOrt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!onComplete) {
      loadExistingProfile();
    }
  }, [onComplete]);

  const loadExistingProfile = async () => {
    const existingProfile = await ProfileService.getBewerbungsprofil();
    if (existingProfile) {
      if (existingProfile.strasse) setStrasse(existingProfile.strasse);
      if (existingProfile.plz) setPlz(existingProfile.plz);
      if (existingProfile.ort) setOrt(existingProfile.ort);
    }
  };

  const handleWeiter = async () => {
    // Validate required fields
    if (!strasse || !plz || !ort) {
      Alert.alert('Fehler', 'Bitte füllen Sie alle Adressfelder aus.');
      return;
    }

    setIsLoading(true);

    const addressData = {
      strasse,
      plz,
      ort,
    };

    if (onComplete) {
      // Used in profile completion flow
      onComplete(addressData);
    } else {
      // Standalone usage
      const success = await ProfileService.updateBewerbungsprofil(addressData);

      if (success) {
        console.log('Address data saved:', addressData);
        router.push('/user/wbs');
      } else {
        Alert.alert('Fehler', 'Adressdaten konnten nicht gespeichert werden.');
      }
    }

    setIsLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.logoSection}>
            <WohnBlitzLogo />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.title}>Bewerbungsprofile</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Strasse</Text>
              <TextInput
                style={styles.input}
                placeholder="Müller str"
                placeholderTextColor="#C7C7CC"
                value={strasse}
                onChangeText={setStrasse}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PLZ</Text>
              <TextInput
                style={styles.input}
                placeholder="11111"
                placeholderTextColor="#C7C7CC"
                value={plz}
                onChangeText={setPlz}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ort</Text>
              <TextInput
                style={styles.input}
                placeholder="Musterstadt"
                placeholderTextColor="#C7C7CC"
                value={ort}
                onChangeText={setOrt}
                autoCapitalize="words"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.weiterButton,
                isLoading && styles.weiterButtonDisabled,
              ]}
              onPress={handleWeiter}
              disabled={isLoading}
            >
              <Text style={styles.weiterButtonText}>
                {isLoading ? 'Speichern...' : 'Weiter'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
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
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '400',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    minHeight: 44,
  },
  weiterButton: {
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
  weiterButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '600',
  },
  weiterButtonDisabled: {
    backgroundColor: '#E5E7EB',
    opacity: 0.6,
  },
});
