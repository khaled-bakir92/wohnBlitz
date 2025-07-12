import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  Surface, 
  TextInput, 
  Button,
  Switch,
  Menu,
  Divider,
  TouchableRipple 
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import WohnBlitzHeader from '@/components/WohnBlitzHeader';

export default function SuchfilterScreen() {
  const [maxMiete, setMaxMiete] = useState('1.200 €');
  const [minZimmer, setMinZimmer] = useState('1 Zimmer');
  const [ausgeschlosseneBezirke, setAusgeschlosseneBezirke] = useState('z.B. Wedding, Marzahn, Lichtenberg');
  const [filterAktiviert, setFilterAktiviert] = useState(true);
  const [zimmerMenuVisible, setZimmerMenuVisible] = useState(false);

  const zimmerOptions = [
    '1 Zimmer',
    '2 Zimmer', 
    '3 Zimmer',
    '4 Zimmer',
    '5+ Zimmer'
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
        {/* Suchkriterien Section */}
        <Surface style={[styles.section, { backgroundColor: 'white' }]} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Suchkriterien
          </Text>
          
          {/* Max. Miete */}
          <View style={styles.inputContainer}>
            <Text variant="bodyMedium" style={styles.inputLabel}>
              Max. Miete
            </Text>
            <TextInput
              mode="outlined"
              value={maxMiete}
              onChangeText={setMaxMiete}
              style={styles.textInput}
              outlineStyle={styles.inputOutline}
              contentStyle={styles.inputContent}
              placeholder="1.200 €"
            />
          </View>

          {/* Min. Zimmer */}
          <View style={styles.inputContainer}>
            <Text variant="bodyMedium" style={styles.inputLabel}>
              Min. Zimmer
            </Text>
            <Menu
              visible={zimmerMenuVisible}
              onDismiss={() => setZimmerMenuVisible(false)}
              anchor={
                <TouchableRipple
                  onPress={() => setZimmerMenuVisible(true)}
                  style={styles.dropdownContainer}
                >
                  <View style={styles.dropdown}>
                    <Text variant="bodyMedium" style={styles.dropdownText}>
                      {minZimmer}
                    </Text>
                    <MaterialIcons 
                      name="keyboard-arrow-down" 
                      size={24} 
                      color="#6b7280" 
                    />
                  </View>
                </TouchableRipple>
              }
              contentStyle={styles.menuContent}
            >
              {zimmerOptions.map((option, index) => (
                <Menu.Item
                  key={index}
                  onPress={() => {
                    setMinZimmer(option);
                    setZimmerMenuVisible(false);
                  }}
                  title={option}
                  titleStyle={styles.menuItemTitle}
                />
              ))}
            </Menu>
          </View>

          {/* Ausgeschlossene Bezirke */}
          <View style={styles.inputContainer}>
            <Text variant="bodyMedium" style={styles.inputLabel}>
              Ausgeschlossene Bezirke
            </Text>
            <TextInput
              mode="outlined"
              value={ausgeschlosseneBezirke}
              onChangeText={setAusgeschlosseneBezirke}
              style={[styles.textInput, styles.textArea]}
              outlineStyle={styles.inputOutline}
              contentStyle={styles.inputContent}
              placeholder="z.B. Wedding, Marzahn, Lichtenberg"
              multiline={true}
              numberOfLines={4}
            />
          </View>
        </Surface>

        {/* Filter aktivieren Section */}
        <Surface style={[styles.section, { backgroundColor: 'white' }]} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Filter aktivieren
          </Text>
          
          <View style={styles.switchContainer}>
            <Text variant="bodyMedium" style={styles.switchLabel}>
              Filter verwenden
            </Text>
            <Switch
              value={filterAktiviert}
              onValueChange={setFilterAktiviert}
              thumbColor={filterAktiviert ? '#3b82f6' : '#f4f3f4'}
              trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
            />
          </View>
        </Surface>
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
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#374151',
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: 'white',
  },
  inputOutline: {
    borderColor: '#d1d5db',
    borderWidth: 1,
  },
  inputContent: {
    color: '#1f2937',
  },
  textArea: {
    minHeight: 100,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    backgroundColor: 'white',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    minHeight: 56,
  },
  dropdownText: {
    color: '#1f2937',
    flex: 1,
  },
  menuContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 8,
  },
  menuItemTitle: {
    color: '#1f2937',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    color: '#374151',
    fontWeight: '500',
  },
});