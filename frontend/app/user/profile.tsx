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
import { Ionicons } from '@expo/vector-icons';
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

const DropdownPicker = ({ value, onValueChange, options, placeholder }: {
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={[styles.dropdownText, !value && styles.placeholderText]}>
          {value || placeholder}
        </Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#9CA3AF"
        />
      </TouchableOpacity>
      
      {isOpen && (
        <View style={styles.dropdownList}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.dropdownOption}
              onPress={() => {
                onValueChange(option);
                setIsOpen(false);
              }}
            >
              <Text style={styles.dropdownOptionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

interface ProfileFormProps {
  onComplete?: (data: any) => void;
}

export default function ProfileScreen({ onComplete }: ProfileFormProps = {}) {
  const [anrede, setAnrede] = useState('');
  const [name, setName] = useState('');
  const [vorname, setVorname] = useState('');
  const [email, setEmail] = useState('');
  const [telefon, setTelefon] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const anredeOptions = ['Frau', 'Herr', 'Divers'];

  useEffect(() => {
    if (!onComplete) {
      loadExistingProfile();
    }
  }, [onComplete]);

  const loadExistingProfile = async () => {
    const existingProfile = await ProfileService.getBewerbungsprofil();
    if (existingProfile) {
      if (existingProfile.anrede) setAnrede(existingProfile.anrede);
      if (existingProfile.name) setName(existingProfile.name);
      if (existingProfile.vorname) setVorname(existingProfile.vorname);
      if (existingProfile.email) setEmail(existingProfile.email);
      if (existingProfile.telefon) setTelefon(existingProfile.telefon);
    }
  };

  const handleWeiter = async () => {
    // Validate required fields
    if (!anrede || !name || !vorname || !email || !telefon) {
      Alert.alert('Fehler', 'Bitte füllen Sie alle Felder aus.');
      return;
    }

    setIsLoading(true);

    const profileData = {
      anrede,
      name,
      vorname,
      email,
      telefon,
    };

    if (onComplete) {
      // Used in profile completion flow
      onComplete(profileData);
    } else {
      // Standalone usage
      const success = await ProfileService.updateBewerbungsprofil(profileData);

      if (success) {
        console.log('Profile data saved:', profileData);
        router.push('/user/profile2');
      } else {
        Alert.alert('Fehler', 'Profil konnte nicht gespeichert werden.');
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
              <Text style={styles.label}>Anrede</Text>
              <DropdownPicker
                value={anrede}
                onValueChange={setAnrede}
                options={anredeOptions}
                placeholder="Frau"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Mustermann"
                placeholderTextColor="#C7C7CC"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vorname</Text>
              <TextInput
                style={styles.input}
                placeholder="Max"
                placeholderTextColor="#C7C7CC"
                value={vorname}
                onChangeText={setVorname}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="E-Mail-Adresse"
                placeholderTextColor="#C7C7CC"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefon</Text>
              <TextInput
                style={styles.input}
                placeholder="Telefon"
                placeholderTextColor="#C7C7CC"
                value={telefon}
                onChangeText={setTelefon}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            </View>

            <TouchableOpacity 
              style={[styles.weiterButton, isLoading && styles.weiterButtonDisabled]} 
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
  dropdownContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdownButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
  dropdownText: {
    fontSize: 16,
    color: '#1F2937',
  },
  placeholderText: {
    color: '#C7C7CC',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1001,
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#1F2937',
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