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
import { ProfileService } from '../services/profileService';

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

const RadioButton = ({ selected, onPress, label }: {
  selected: boolean;
  onPress: () => void;
  label: string;
}) => (
  <TouchableOpacity style={styles.radioContainer} onPress={onPress}>
    <View style={[styles.radioButton, selected && styles.radioButtonSelected]}>
      {selected && <View style={styles.radioButtonInner} />}
    </View>
    <Text style={styles.radioLabel}>{label}</Text>
  </TouchableOpacity>
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

export default function WBSScreen() {
  const [wbsVorhanden, setWbsVorhanden] = useState('nein');
  const [wbsGueltigBis, setWbsGueltigBis] = useState('');
  const [wbsZimmeranzahl, setWbsZimmeranzahl] = useState('1');
  const [einkommensgrenze, setEinkommensgrenze] = useState('WBS 100');
  const [wbsBesondererWohnbedarf, setWbsBesondererWohnbedarf] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const zimmeranzahlOptions = ['1', '2', '3', '4', '5', '6+'];
  const einkommensgrenzeOptions = ['WBS 100', 'WBS 140', 'WBS 160', 'WBS 180', 'WBS 220'];

  useEffect(() => {
    loadExistingProfile();
  }, []);

  const loadExistingProfile = async () => {
    const existingProfile = await ProfileService.getBewerbungsprofil();
    if (existingProfile) {
      if (existingProfile.wbs_vorhanden) setWbsVorhanden(existingProfile.wbs_vorhanden);
      if (existingProfile.wbs_gueltig_bis) setWbsGueltigBis(existingProfile.wbs_gueltig_bis);
      if (existingProfile.wbs_zimmeranzahl) setWbsZimmeranzahl(existingProfile.wbs_zimmeranzahl);
      if (existingProfile.einkommensgrenze) setEinkommensgrenze(existingProfile.einkommensgrenze);
      if (existingProfile.wbs_besonderer_wohnbedarf) setWbsBesondererWohnbedarf(existingProfile.wbs_besonderer_wohnbedarf);
    }
  };

  const validateDate = (dateString: string): boolean => {
    if (!dateString) return true; // Empty date is allowed
    
    // Check format dd.mm.yyyy
    const dateRegex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
    const match = dateString.match(dateRegex);
    
    if (!match) return false;
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    // Check if date is valid
    const date = new Date(year, month - 1, day);
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      return false;
    }
    
    // Check if date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    return date >= today;
  };

  const formatDateInput = (text: string): string => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    
    // Add dots automatically
    if (cleaned.length <= 2) {
      return cleaned;
    } else if (cleaned.length <= 4) {
      return cleaned.slice(0, 2) + '.' + cleaned.slice(2);
    } else {
      return cleaned.slice(0, 2) + '.' + cleaned.slice(2, 4) + '.' + cleaned.slice(4, 8);
    }
  };

  const handleDateChange = (text: string) => {
    const formatted = formatDateInput(text);
    setWbsGueltigBis(formatted);
  };

  const handleGetStarted = async () => {
    // Validate WBS date if provided
    if (wbsGueltigBis && !validateDate(wbsGueltigBis)) {
      if (!wbsGueltigBis.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)) {
        Alert.alert('Ungültiges Datum', 'Bitte geben Sie das Datum im Format TT.MM.JJJJ ein.');
      } else {
        Alert.alert('Ungültiges Datum', 'Das WBS-Gültigkeitsdatum muss in der Zukunft liegen.');
      }
      return;
    }

    setIsLoading(true);

    const wbsData = {
      wbs_vorhanden: wbsVorhanden,
      wbs_gueltig_bis: wbsGueltigBis,
      wbs_zimmeranzahl: wbsZimmeranzahl,
      einkommensgrenze: einkommensgrenze,
      wbs_besonderer_wohnbedarf: wbsBesondererWohnbedarf,
    };

    const success = await ProfileService.updateBewerbungsprofil(wbsData);

    if (success) {
      console.log('WBS data saved:', wbsData);
      Alert.alert('Erfolg', 'Bewerbungsprofil vollständig gespeichert!', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)'),
        },
      ]);
    } else {
      Alert.alert('Fehler', 'WBS-Daten konnten nicht gespeichert werden.');
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
            <Text style={styles.title}>WBS vorhanden</Text>

            <View style={styles.radioGroup}>
              <RadioButton
                selected={wbsVorhanden === 'Ja'}
                onPress={() => setWbsVorhanden('Ja')}
                label="Ja"
              />
              <RadioButton
                selected={wbsVorhanden === 'nein'}
                onPress={() => setWbsVorhanden('nein')}
                label="nein"
              />
              <RadioButton
                selected={wbsVorhanden === 'egal'}
                onPress={() => setWbsVorhanden('egal')}
                label="egal"
              />
            </View>

            {(wbsVorhanden === 'Ja' || wbsVorhanden === 'egal') && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>WBS gültig bis</Text>
                  <View style={styles.dateInputContainer}>
                    <TextInput
                      style={[
                        styles.dateInput,
                        wbsGueltigBis && !validateDate(wbsGueltigBis) && styles.dateInputError
                      ]}
                      placeholder="dd.mm.yyyy"
                      placeholderTextColor="#C7C7CC"
                      value={wbsGueltigBis}
                      onChangeText={handleDateChange}
                      keyboardType="numeric"
                      maxLength={10}
                    />
                    <Ionicons name="calendar-outline" size={20} color="#9CA3AF" style={styles.calendarIcon} />
                  </View>
                  {wbsGueltigBis && !validateDate(wbsGueltigBis) && (
                    <Text style={styles.errorText}>
                      {!wbsGueltigBis.match(/^(\d{2})\.(\d{2})\.(\d{4})$/) 
                        ? 'Format: TT.MM.JJJJ' 
                        : 'Datum muss in der Zukunft liegen'
                      }
                    </Text>
                  )}
                </View>

                <View style={[styles.inputGroup, { zIndex: 2000 }]}>
                  <Text style={styles.label}>WBS Zimmeranzahl</Text>
                  <DropdownPicker
                    value={wbsZimmeranzahl}
                    onValueChange={setWbsZimmeranzahl}
                    options={zimmeranzahlOptions}
                    placeholder="1"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Einkommensgrenze nach Einkommensbescheinigung § 9</Text>
                  <DropdownPicker
                    value={einkommensgrenze}
                    onValueChange={setEinkommensgrenze}
                    options={einkommensgrenzeOptions}
                    placeholder="WBS 100"
                  />
                </View>

                <View style={styles.radioSection}>
                  <Text style={styles.label}>WBS mit besonderem Wohnbedarf</Text>
                  <View style={styles.radioGroupHorizontal}>
                    <RadioButton
                      selected={wbsBesondererWohnbedarf === 'Ja'}
                      onPress={() => setWbsBesondererWohnbedarf(wbsBesondererWohnbedarf === 'Ja' ? '' : 'Ja')}
                      label="Ja"
                    />
                  </View>
                </View>
              </>
            )}

            <TouchableOpacity 
              style={[styles.getStartedButton, isLoading && styles.getStartedButtonDisabled]} 
              onPress={handleGetStarted}
              disabled={isLoading}
            >
              <Text style={styles.getStartedButtonText}>
                {isLoading ? 'Speichern...' : 'Get Started'}
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
    marginBottom: 30,
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  radioGroupHorizontal: {
    flexDirection: 'row',
    marginTop: 8,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#1F2937',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1F2937',
  },
  radioLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
  inputGroup: {
    marginBottom: 24,
    zIndex: 1,
  },
  radioSection: {
    marginBottom: 40,
  },
  label: {
    fontSize: 16,
    fontWeight: '400',
    color: '#1F2937',
    marginBottom: 8,
  },
  dateInputContainer: {
    position: 'relative',
  },
  dateInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 50,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    minHeight: 44,
  },
  calendarIcon: {
    position: 'absolute',
    right: 16,
    top: 12,
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 2000,
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
    zIndex: 2001,
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
    elevation: 5,
    zIndex: 2002,
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
  getStartedButton: {
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
  getStartedButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '600',
  },
  getStartedButtonDisabled: {
    backgroundColor: '#E5E7EB',
    opacity: 0.6,
  },
  dateInputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});