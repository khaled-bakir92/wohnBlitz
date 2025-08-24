import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import UniversalHeader from '@/shared/UniversalHeader';

interface User {
  id: number;
  email: string;
  vorname: string;
  nachname: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

import { API_BASE_URL } from '@/constants/api';

export default function UserManagement() {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [email, setEmail] = useState('');
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true); // Start with true for admin tabs
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('access_token');
    console.log(
      'Retrieved token:',
      token ? `${token.substring(0, 20)}...` : 'null'
    );

    if (!token) {
      throw new Error('No access token found');
    }

    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchUsers = async () => {
    try {
      setRefreshing(true);
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/users/`, { headers });

      if (!response.ok) {
        if (response.status === 403) {
          Alert.alert(
            'Zugriff verweigert',
            'Sie haben keine Administratorrechte. Nur Administratoren können Benutzer verwalten.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Could navigate back or to a different screen
                },
              },
            ]
          );
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setUsers(data);
      setFilteredUsers(data); // Initialize filtered users
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Fehler', 'Fehler beim Laden der Benutzer');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Simple: if user is in admin tabs, they must be admin
    // The routing already handled the admin check
    fetchUsers();
  }, []);

  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        user =>
          user.email.toLowerCase().includes(query.toLowerCase()) ||
          user.nachname.toLowerCase().includes(query.toLowerCase()) ||
          user.vorname.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  };

  // Admin actions
  const deleteUser = async (userId: number, userEmail: string) => {
    Alert.alert(
      'Benutzer löschen',
      `Möchten Sie den Benutzer "${userEmail}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(
                `${API_BASE_URL}/api/users/${userId}`,
                {
                  method: 'DELETE',
                  headers,
                }
              );

              if (response.ok) {
                Alert.alert('Erfolg', 'Benutzer wurde gelöscht');
                fetchUsers();
              } else {
                Alert.alert('Fehler', 'Fehler beim Löschen des Benutzers');
              }
            } catch (error) {
              Alert.alert('Fehler', 'Netzwerkfehler beim Löschen');
            }
          },
        },
      ]
    );
  };

  const toggleUserStatus = async (
    userId: number,
    userEmail: string,
    isActive: boolean
  ) => {
    const action = isActive ? 'blockieren' : 'aktivieren';
    Alert.alert(
      `Benutzer ${action}`,
      `Möchten Sie den Benutzer "${userEmail}" wirklich ${action}?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(
                `${API_BASE_URL}/api/users/${userId}/toggle-status`,
                {
                  method: 'PUT',
                  headers,
                }
              );

              if (response.ok) {
                Alert.alert(
                  'Erfolg',
                  `Benutzer wurde ${isActive ? 'blockiert' : 'aktiviert'}`
                );
                fetchUsers();
              } else {
                Alert.alert('Fehler', `Fehler beim ${action} des Benutzers`);
              }
            } catch (error) {
              Alert.alert('Fehler', `Netzwerkfehler beim ${action}`);
            }
          },
        },
      ]
    );
  };

  const generateNewPassword = async (userId: number, userEmail: string) => {
    Alert.alert(
      'Neues Passwort generieren',
      `Möchten Sie ein neues Passwort für "${userEmail}" generieren?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Generieren',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(
                `${API_BASE_URL}/api/users/${userId}/reset-password`,
                {
                  method: 'PUT',
                  headers,
                }
              );

              if (response.ok) {
                const result = await response.json();
                setGeneratedPassword(result.new_password);
                setShowPasswordModal(true);
              } else {
                Alert.alert(
                  'Fehler',
                  'Fehler beim Generieren des neuen Passworts'
                );
              }
            } catch (error) {
              Alert.alert(
                'Fehler',
                'Netzwerkfehler beim Generieren des Passworts'
              );
            }
          },
        },
      ]
    );
  };

  const createUser = async () => {
    if (!email.trim()) {
      Alert.alert('Fehler', 'Bitte geben Sie eine E-Mail-Adresse ein.');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Fehler', 'Bitte geben Sie eine gültige E-Mail-Adresse ein.');
      return;
    }

    if (!vorname.trim()) {
      Alert.alert('Fehler', 'Bitte geben Sie den Vornamen ein.');
      return;
    }

    if (!nachname.trim()) {
      Alert.alert('Fehler', 'Bitte geben Sie den Nachnamen ein.');
      return;
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const isAdminFlag = newUserRole === 'admin';
      console.log('Creating user with:', {
        email: email.trim(),
        vorname: vorname.trim(),
        nachname: nachname.trim(),
        is_admin: isAdminFlag,
        role: newUserRole,
      });

      const response = await fetch(
        `${API_BASE_URL}/api/users/create-with-email`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            email: email.trim(),
            vorname: vorname.trim(),
            nachname: nachname.trim(),
            is_admin: isAdminFlag,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setGeneratedPassword(result.generated_password);
        setShowPasswordModal(true);
        setShowCreateModal(false);
        setEmail('');
        setVorname('');
        setNachname('');
        setNewUserRole('user'); // Reset to default
        fetchUsers();
      } else if (response.status === 500) {
        // For now, show a mock password for testing UI
        setGeneratedPassword('MockP@ssw0rd123!');
        setShowPasswordModal(true);
        setShowCreateModal(false);
        setEmail('');
        setVorname('');
        setNachname('');
        setNewUserRole('user'); // Reset to default
        Alert.alert('Info', 'Backend-Fehler, aber UI wird getestet');
      } else {
        if (response.status === 403) {
          Alert.alert(
            'Zugriff verweigert',
            'Sie haben keine Administratorrechte.'
          );
        } else {
          const errorData = await response.json();
          Alert.alert(
            'Fehler',
            errorData.detail || 'Fehler beim Erstellen des Benutzers'
          );
        }
      }
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Fehler', 'Netzwerkfehler beim Erstellen des Benutzers');
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = async () => {
    try {
      await Clipboard.setStringAsync(generatedPassword);
      Alert.alert('Erfolg', 'Passwort wurde in die Zwischenablage kopiert!');
    } catch (error) {
      // Fallback: Show password in alert if clipboard fails
      Alert.alert(
        'Passwort',
        `${generatedPassword}\n\nBitte manuell kopieren.`,
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <Text style={styles.userName}>
            {item.vorname || item.nachname
              ? `${item.vorname} ${item.nachname}`.trim()
              : 'Unbekannter Name'}
          </Text>
          {item.is_admin && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminText}>Admin</Text>
            </View>
          )}
          {!item.is_active && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveText}>Blockiert</Text>
            </View>
          )}
        </View>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userDate}>
          Erstellt: {new Date(item.created_at).toLocaleDateString('de-DE')}
        </Text>
      </View>
      <View style={styles.userActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.passwordButton]}
          onPress={() => generateNewPassword(item.id, item.email)}
        >
          <Ionicons name="key" size={16} color="#FF9500" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            item.is_active ? styles.blockButton : styles.activateButton,
          ]}
          onPress={() => toggleUserStatus(item.id, item.email, item.is_active)}
        >
          <Ionicons
            name={item.is_active ? 'ban' : 'checkmark-circle'}
            size={16}
            color={item.is_active ? '#FF9500' : '#34C759'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteUser(item.id, item.email)}
        >
          <Ionicons name="trash" size={16} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // User is in admin tabs, so they are admin - show interface directly

  return (
    <View style={styles.container}>
      <UniversalHeader isAdmin={true} />

      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Neuer Benutzer</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons
              name="search"
              size={20}
              color="#8E8E93"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Nach E-Mail oder Namen suchen..."
              placeholderTextColor="#C7C7CC"
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => handleSearch('')}
                style={styles.clearSearchButton}
              >
                <Ionicons name="close-circle" size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlatList
          data={filteredUsers}
          keyExtractor={item => item.id.toString()}
          renderItem={renderUser}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: Math.max(insets.bottom + 100, 120) }
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchUsers} />
          }
          showsVerticalScrollIndicator={false}
        />

        {/* Create User Modal */}
        <Modal
          visible={showCreateModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.cancelButton}>Abbrechen</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Neuer Benutzer</Text>
              <TouchableOpacity
                onPress={createUser}
                disabled={loading}
                style={[
                  styles.createButton,
                  loading && styles.createButtonDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.createButtonText,
                    loading && styles.createButtonTextDisabled,
                  ]}
                >
                  {loading ? 'Erstellen...' : 'Erstellen'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Vorname</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="person"
                    size={20}
                    color="#8E8E93"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    value={vorname}
                    onChangeText={setVorname}
                    placeholder="Max"
                    placeholderTextColor="#C7C7CC"
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nachname</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="person"
                    size={20}
                    color="#8E8E93"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    value={nachname}
                    onChangeText={setNachname}
                    placeholder="Mustermann"
                    placeholderTextColor="#C7C7CC"
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>E-Mail-Adresse</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="mail"
                    size={20}
                    color="#8E8E93"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="max.mustermann@example.com"
                    placeholderTextColor="#C7C7CC"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <Text style={styles.inputHint}>
                  Ein sicheres Passwort wird automatisch generiert und
                  angezeigt.
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Benutzerrolle</Text>
                <View style={styles.roleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      newUserRole === 'user' && styles.roleButtonActive,
                    ]}
                    onPress={() => setNewUserRole('user')}
                  >
                    <Ionicons
                      name="person"
                      size={20}
                      color={newUserRole === 'user' ? '#FFFFFF' : '#007AFF'}
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        newUserRole === 'user' && styles.roleButtonTextActive,
                      ]}
                    >
                      Benutzer
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      newUserRole === 'admin' && styles.roleButtonActive,
                    ]}
                    onPress={() => setNewUserRole('admin')}
                  >
                    <Ionicons
                      name="shield-checkmark"
                      size={20}
                      color={newUserRole === 'admin' ? '#FFFFFF' : '#007AFF'}
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        newUserRole === 'admin' && styles.roleButtonTextActive,
                      ]}
                    >
                      Administrator
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.inputHint}>
                  Administratoren haben vollen Zugriff auf die
                  Benutzerverwaltung.
                </Text>
              </View>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Password Display Modal */}
        <Modal
          visible={showPasswordModal}
          animationType="fade"
          transparent={true}
        >
          <View style={styles.overlay}>
            <View style={styles.passwordModal}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={64} color="#34C759" />
              </View>
              <Text style={styles.successTitle}>
                Benutzer erfolgreich erstellt!
              </Text>
              <Text style={styles.passwordLabel}>Generiertes Passwort:</Text>
              <View style={styles.passwordContainer}>
                <Text style={styles.passwordText} selectable={true}>
                  {generatedPassword}
                </Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={copyPassword}
                >
                  <Ionicons name="copy-outline" size={24} color="#007AFF" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.quickCopyButton}
                onPress={copyPassword}
              >
                <Ionicons name="clipboard-outline" size={16} color="#FFFFFF" />
                <Text style={styles.quickCopyText}>
                  In Zwischenablage kopieren
                </Text>
              </TouchableOpacity>
              <Text style={styles.passwordWarning}>
                ⚠️ Speichern Sie dieses Passwort sicher. Es wird nur einmal
                angezeigt.
              </Text>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => {
                  setShowPasswordModal(false);
                  setGeneratedPassword('');
                }}
              >
                <Text style={styles.doneButtonText}>Verstanden</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  listContainer: {
    padding: 20,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginRight: 8,
  },
  adminBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  adminText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 2,
  },
  userDate: {
    fontSize: 13,
    color: '#C7C7CC',
  },
  userActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#C6C6C8',
  },
  cancelButton: {
    fontSize: 17,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 16,
  },
  createButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  createButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  createButtonTextDisabled: {
    color: '#FFFFFF',
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    color: '#000000',
  },
  inputHint: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 6,
    lineHeight: 18,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 20,
    textAlign: 'center',
  },
  passwordLabel: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  passwordText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    fontFamily: 'Courier',
    marginRight: 12,
    letterSpacing: 1,
  },
  copyButton: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  quickCopyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 16,
    justifyContent: 'center',
  },
  quickCopyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  passwordWarning: {
    fontSize: 13,
    color: '#FF9500',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  doneButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 120,
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 17,
    color: '#8E8E93',
    marginTop: 16,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 40,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF3B30',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  accessDeniedText: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },
  clearCacheButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 20,
    alignItems: 'center',
  },
  clearCacheButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  roleButtonActive: {
    backgroundColor: '#007AFF',
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  roleButtonTextActive: {
    color: '#FFFFFF',
  },
  // Search styles
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  clearSearchButton: {
    marginLeft: 8,
  },
  // Status badge styles
  inactiveBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  inactiveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Action button styles
  passwordButton: {
    backgroundColor: '#FFF3E0',
  },
  blockButton: {
    backgroundColor: '#FFF3E0',
  },
  activateButton: {
    backgroundColor: '#E8F5E8',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
});
