import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  Surface, 
  TextInput, 
  Menu,
  TouchableRipple,
  Modal,
  Portal,
  Checkbox
} from 'react-native-paper';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import WohnBlitzHeader from '@/user/WohnBlitzHeader';

// Berlin districts list
const BERLIN_DISTRICTS = [
  'CHARLOTTENBURG-WILMERSDORF',
  'FRIEDRICHSHAIN-KREUZBERG', 
  'LICHTENBERG',
  'MARZAHN-HELLERSDORF',
  'MITTE',
  'NEUKÖLLN',
  'PANKOW',
  'REINICKENDORF',
  'SPANDAU',
  'STEGLITZ-ZEHLENDORF',
  'TEMPELHOF-SCHÖNEBERG',
  'TREPTOW-KÖPENICK'
];

export default function SuchfilterScreen() {
  const [maxMiete, setMaxMiete] = useState('');
  const [minZimmer, setMinZimmer] = useState('1 Zimmer');
  const [ausgeschlosseneBezirke, setAusgeschlosseneBezirke] = useState<string[]>([]);
  const [zimmerMenuVisible, setZimmerMenuVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [bezirkeModalVisible, setBezirkeModalVisible] = useState(false);
  const [hasExistingFilters, setHasExistingFilters] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const zimmerOptions = [
    '1 Zimmer',
    '2 Zimmer', 
    '3 Zimmer',
    '4 Zimmer',
    '5+ Zimmer'
  ];

  useEffect(() => {
    loadExistingFilters();
  }, []);

  const loadExistingFilters = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch('http://localhost:8000/api/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userInfo = await response.json();
        if (userInfo.filter_einstellungen) {
          try {
            const filters = JSON.parse(userInfo.filter_einstellungen);
            const hasAnyFilters = filters.maxMiete || filters.minZimmer !== '1 Zimmer' || (filters.ausgeschlosseneBezirke && filters.ausgeschlosseneBezirke.length > 0);
            
            if (hasAnyFilters) {
              setHasExistingFilters(true);
              if (filters.maxMiete) setMaxMiete(filters.maxMiete);
              if (filters.minZimmer) setMinZimmer(filters.minZimmer);
              if (filters.ausgeschlosseneBezirke) {
                // Handle both string and array formats
                if (typeof filters.ausgeschlosseneBezirke === 'string') {
                  const bezirkeArray = filters.ausgeschlosseneBezirke.split(',').map(b => b.trim().toUpperCase()).filter(b => b);
                  setAusgeschlosseneBezirke(bezirkeArray);
                } else if (Array.isArray(filters.ausgeschlosseneBezirke)) {
                  setAusgeschlosseneBezirke(filters.ausgeschlosseneBezirke.map(b => b.toUpperCase()));
                }
              }
            }
          } catch (error) {
            console.error('Error parsing filter settings:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading filters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveFilters = async () => {
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Fehler',
          text2: 'Sie sind nicht angemeldet',
          position: 'top',
          visibilityTime: 2500,
        });
        return;
      }

      const filterData = {
        maxMiete: maxMiete.trim(),
        minZimmer,
        ausgeschlosseneBezirke: ausgeschlosseneBezirke,
      };

      const response = await fetch('http://localhost:8000/api/filter-einstellungen', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filter_einstellungen: JSON.stringify(filterData) }),
      });

      if (response.ok) {
        setHasExistingFilters(true);
        setIsEditMode(false);
        Toast.show({
          type: 'success',
          text1: 'Filter gespeichert!',
          text2: 'Ihre Suchfilter wurden erfolgreich gespeichert',
          position: 'top',
          visibilityTime: 2000,
        });
      } else {
        const errorData = await response.json();
        Toast.show({
          type: 'error',
          text1: 'Fehler beim Speichern',
          text2: errorData.detail || 'Filter konnten nicht gespeichert werden',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      console.error('Error saving filters:', error);
      Toast.show({
        type: 'error',
        text1: 'Verbindungsfehler',
        text2: 'Bitte überprüfen Sie Ihre Internetverbindung',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleBezirk = (bezirk: string) => {
    setAusgeschlosseneBezirke(prev => {
      if (prev.includes(bezirk)) {
        return prev.filter(b => b !== bezirk);
      } else {
        return [...prev, bezirk];
      }
    });
  };

  const getSelectedBezirkeText = () => {
    if (ausgeschlosseneBezirke.length === 0) {
      return 'Keine Bezirke ausgeschlossen';
    }
    if (ausgeschlosseneBezirke.length === 1) {
      return `1 Bezirk ausgeschlossen: ${ausgeschlosseneBezirke[0]}`;
    }
    return `${ausgeschlosseneBezirke.length} Bezirke ausgeschlossen`;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <WohnBlitzHeader />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Filter werden geladen...</Text>
        </View>
      </View>
    );
  }

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
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.mainTitle}>Suchfilter</Text>
            <Text style={styles.subtitle}>Passen Sie Ihre Wohnungssuche an Ihre Bedürfnisse an</Text>
            {hasExistingFilters && !isEditMode && (
              <View style={styles.filterStatusContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.filterStatusText}>Filter gespeichert</Text>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => setIsEditMode(true)}
                >
                  <Ionicons name="pencil" size={16} color="#667eea" />
                  <Text style={styles.editButtonText}>Bearbeiten</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Filter Card */}
          <View style={[styles.filterCard, hasExistingFilters && !isEditMode && styles.filterCardReadOnly]}>
            {/* Max. Miete */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Maximale Miete</Text>
              {hasExistingFilters && !isEditMode ? (
                <View style={styles.readOnlyContainer}>
                  <Ionicons name="cash-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                  <Text style={styles.readOnlyText}>{maxMiete || 'Nicht festgelegt'}</Text>
                </View>
              ) : (
                <View style={styles.inputContainer}>
                  <Ionicons name="cash-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.modernInput}
                    value={maxMiete}
                    onChangeText={setMaxMiete}
                    placeholder="z.B. 1.200 €"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="default"
                  />
                </View>
              )}
            </View>

            {/* Min. Zimmer */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mindestanzahl Zimmer</Text>
              {hasExistingFilters && !isEditMode ? (
                <View style={styles.readOnlyContainer}>
                  <Ionicons name="home-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                  <Text style={styles.readOnlyText}>{minZimmer}</Text>
                </View>
              ) : (
                <Menu
                  visible={zimmerMenuVisible}
                  onDismiss={() => setZimmerMenuVisible(false)}
                  anchor={
                    <TouchableOpacity
                      onPress={() => setZimmerMenuVisible(true)}
                      style={styles.modernDropdown}
                    >
                      <Ionicons name="home-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <Text style={styles.dropdownValue}>{minZimmer}</Text>
                      <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  }
                  contentStyle={styles.modernMenuContent}
                >
                  {zimmerOptions.map((option, index) => (
                    <Menu.Item
                      key={index}
                      onPress={() => {
                        setMinZimmer(option);
                        setZimmerMenuVisible(false);
                      }}
                      title={option}
                      titleStyle={styles.modernMenuItemTitle}
                    />
                  ))}
                </Menu>
              )}
            </View>

            {/* Ausgeschlossene Bezirke */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ausgeschlossene Bezirke</Text>
              {hasExistingFilters && !isEditMode ? (
                <View style={styles.readOnlyContainer}>
                  <Ionicons name="location-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                  <Text style={styles.readOnlyText}>{getSelectedBezirkeText()}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.bezirkeSelector}
                  onPress={() => setBezirkeModalVisible(true)}
                >
                  <Ionicons name="location-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <Text style={[styles.dropdownValue, { color: ausgeschlosseneBezirke.length > 0 ? '#1F2937' : '#9CA3AF' }]}>
                    {getSelectedBezirkeText()}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Save Button */}
          {(isEditMode || !hasExistingFilters) && (
            <TouchableOpacity 
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
              onPress={saveFilters}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              )}
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Wird gespeichert...' : 'Filter speichern'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Bezirke Selection Modal */}
        <Portal>
          <Modal
            visible={bezirkeModalVisible}
            onDismiss={() => setBezirkeModalVisible(false)}
            contentContainerStyle={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Bezirke auswählen</Text>
                <TouchableOpacity
                  onPress={() => setBezirkeModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalSubtitle}>
                Wählen Sie die Bezirke aus, die von der Suche ausgeschlossen werden sollen:
              </Text>
              
              <FlatList
                data={BERLIN_DISTRICTS}
                keyExtractor={(item) => item}
                style={styles.bezirkeList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.bezirkItem}
                    onPress={() => toggleBezirk(item)}
                  >
                    <Checkbox
                      status={ausgeschlosseneBezirke.includes(item) ? 'checked' : 'unchecked'}
                      onPress={() => toggleBezirk(item)}
                    />
                    <Text style={styles.bezirkName}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
              
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setBezirkeModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Fertig</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </Portal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  titleContainer: {
    marginBottom: 32,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    minHeight: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  modernInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 12,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    minHeight: 120,
    paddingVertical: 16,
  },
  textAreaIcon: {
    marginTop: 2,
  },
  textAreaInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modernDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    minHeight: 52,
  },
  dropdownValue: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  modernMenuContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modernMenuItemTitle: {
    color: '#1F2937',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#667eea',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0.1,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  filterStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  filterStatusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 8,
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
    marginLeft: 4,
  },
  filterCardReadOnly: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  readOnlyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 16,
    minHeight: 52,
  },
  readOnlyText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    paddingVertical: 12,
  },
  bezirkeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    minHeight: 52,
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    maxHeight: '80%',
  },
  modalContent: {
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    padding: 24,
    paddingBottom: 16,
  },
  bezirkeList: {
    maxHeight: 300,
    paddingHorizontal: 24,
  },
  bezirkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  bezirkName: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
    flex: 1,
  },
  modalFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});