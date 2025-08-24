import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import {
  PaperProvider,
  MD3LightTheme,
  MD3DarkTheme,
  Text,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import UniversalHeader from '@/shared/UniversalHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/api';

interface User {
  id: number;
  email: string;
  vorname: string;
  nachname: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  bot_status: 'running' | 'stopped' | 'paused' | 'starting' | 'stopping' | 'error';
  last_activity: string;
  current_action: string;
  applications_sent: number;
  listings_found: number;
}

// Bot Management Component
function BotManagementContent({
  toggleTheme,
  isDarkMode,
}: {
  toggleTheme: () => void;
  isDarkMode: boolean;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingBots, setLoadingBots] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('access_token');
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
      setLoading(true);
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/bot/admin/users`, { 
        headers 
      });

      if (!response.ok) {
        if (response.status === 403) {
          Alert.alert(
            'Zugriff verweigert',
            'Sie haben keine Administratorrechte.'
          );
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Daten für die Anzeige formatieren
      const formattedUsers = data.map((user: any) => ({
        ...user,
        last_activity: formatLastActivity(user.last_activity),
      }));
      
      setUsers(formattedUsers);
      setFilteredUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Fehler', 'Fehler beim Laden der Benutzer');
    } finally {
      setLoading(false);
    }
  };

  const formatLastActivity = (lastActivity: string | null) => {
    if (!lastActivity) return 'Noch nie aktiv';
    
    try {
      const activityDate = new Date(lastActivity);
      const now = new Date();
      const diffMs = now.getTime() - activityDate.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffMinutes < 1) return 'gerade eben';
      if (diffMinutes < 60) return `vor ${diffMinutes} Minute${diffMinutes !== 1 ? 'n' : ''}`;
      
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `vor ${diffHours} Stunde${diffHours !== 1 ? 'n' : ''}`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `vor ${diffDays} Tag${diffDays !== 1 ? 'en' : ''}`;
    } catch {
      return 'Unbekannt';
    }
  };

  useEffect(() => {
    // Load users on component mount
    fetchUsers();
  }, []);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        user =>
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          `${user.vorname} ${user.nachname}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          user.vorname.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.nachname.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const handleBotToggle = async (userId: number, currentStatus: string) => {
    setLoadingBots(prev => ({ ...prev, [userId]: true }));

    try {
      const headers = await getAuthHeaders();
      const action = currentStatus === 'running' ? 'stop' : 'start';
      const response = await fetch(
        `${API_BASE_URL}/api/bot/admin/${action}/${userId}`,
        {
          method: 'POST',
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Benutzer-Liste aktualisieren
        await fetchUsers();
        
        const actionText = currentStatus === 'running' ? 'gestoppt' : 'gestartet';
        Alert.alert('Erfolg', `Bot wurde ${actionText}`);
      } else {
        Alert.alert('Fehler', result.message || 'Fehler beim Bot-Toggle');
      }
    } catch (error) {
      console.error('Error toggling bot:', error);
      Alert.alert('Fehler', 'Netzwerkfehler beim Bot-Toggle');
    } finally {
      setLoadingBots(prev => ({ ...prev, [userId]: false }));
    }
  };

  const getBotStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return '#34c759';
      case 'starting':
        return '#007aff';
      case 'stopping':
        return '#ff9500';
      case 'paused':
        return '#ff9500';
      case 'stopped':
        return '#8e8e93';
      case 'error':
        return '#ff3b30';
      default:
        return '#8e8e93';
    }
  };

  const getBotStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return 'Läuft';
      case 'starting':
        return 'Startet...';
      case 'stopping':
        return 'Stoppt...';
      case 'paused':
        return 'Pausiert';
      case 'stopped':
        return 'Gestoppt';
      case 'error':
        return 'Fehler';
      default:
        return 'Unbekannt';
    }
  };

  const statsData = [
    {
      title: 'Aktive Bots',
      value: users.filter(u => u.bot_status === 'running').length.toString(),
      gradient: ['#34c759', '#32d74b'],
      icon: 'play-circle',
      subtitle: 'Derzeit laufend',
    },
    {
      title: 'Gestoppte Bots',
      value: users.filter(u => u.bot_status === 'stopped').length.toString(),
      gradient: ['#ff3b30', '#ff6961'],
      icon: 'stop-circle',
      subtitle: 'Nicht aktiv',
    },
  ];

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <UniversalHeader isAdmin={true} />

      {/* Main Content */}
      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 100) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Bot Management</Text>
            <Text style={styles.welcomeSubtitle}>
              Verwalten Sie alle Benutzer-Bots
            </Text>
          </View>

          {/* Stats Row */}
          <View style={styles.topStatsRow}>
            {statsData.map((stat, index) => (
              <View key={index} style={styles.topStatCard}>
                <LinearGradient
                  colors={stat.gradient}
                  style={styles.statGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.statIconContainer}>
                    <Ionicons name={stat.icon as any} size={28} color="white" />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statTitle}>{stat.title}</Text>
                    <Text style={styles.statSubtitle}>{stat.subtitle}</Text>
                  </View>
                </LinearGradient>
              </View>
            ))}
          </View>

          {/* Search Bar */}
          <View style={styles.searchCard}>
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
                  placeholder="Nach Name oder E-Mail suchen..."
                  placeholderTextColor="#C7C7CC"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearSearch}
                    style={styles.clearSearchButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Users List */}
          <View style={styles.usersSection}>
            <View style={styles.usersSectionHeader}>
              <Text style={styles.usersTitle}>
                {searchQuery ? 'Suchergebnisse' : 'Alle Benutzer'}
              </Text>
              <Text style={styles.usersCount}>
                {filteredUsers.length} {searchQuery ? 'gefunden' : 'Benutzer'}
              </Text>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={styles.loadingText}>Lade Benutzerdaten...</Text>
              </View>
            ) : filteredUsers.length === 0 && searchQuery ? (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search" size={48} color="#C7C7CC" />
                <Text style={styles.noResultsTitle}>
                  Keine Benutzer gefunden
                </Text>
                <Text style={styles.noResultsSubtitle}>
                  Versuchen Sie einen anderen Suchbegriff
                </Text>
              </View>
            ) : (
              filteredUsers.map((user, index) => (
                <View key={user.id} style={styles.userCard}>
                  <View style={styles.userContent}>
                    <View style={styles.userLeft}>
                      {/* Avatar */}
                      <View style={styles.userAvatar}>
                        <Text style={styles.avatarText}>
                          {(user.vorname?.[0] || '') +
                            (user.nachname?.[0] || '')}
                        </Text>
                      </View>

                      {/* User Info */}
                      <View style={styles.userInfo}>
                        <View style={styles.userNameRow}>
                          <Text style={styles.userName}>
                            {user.vorname} {user.nachname}
                          </Text>
                          {user.is_admin && (
                            <View style={styles.adminBadge}>
                              <Text style={styles.adminText}>Admin</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.userEmail}>{user.email}</Text>
                        <Text style={styles.userActivity}>
                          Letzte Aktivität: {user.last_activity}
                        </Text>
                        {user.current_action && (
                          <Text style={styles.currentAction}>
                            {user.current_action}
                          </Text>
                        )}
                        
                        {/* Bot Stats Row */}
                        <View style={styles.botStatsRow}>
                          <View style={styles.statsContainer}>
                            <View style={styles.statItem}>
                              <Ionicons name="document-text" size={14} color="#86868b" />
                              <Text style={styles.statText}>{user.applications_sent}</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                              <Ionicons name="eye" size={14} color="#86868b" />
                              <Text style={styles.statText}>{user.listings_found}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Bot Status & Controls */}
                    <View style={styles.userRight}>
                      <View style={styles.botControlsContainer}>
                        {/* Bot Status Badge */}
                        <View
                          style={[
                            styles.modernStatusBadge,
                            {
                              borderColor: getBotStatusColor(user.bot_status),
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.modernStatusDot,
                              {
                                backgroundColor: getBotStatusColor(user.bot_status),
                              },
                            ]}
                          />
                          <Text
                            style={[
                              styles.modernStatusText,
                              {
                                color: getBotStatusColor(user.bot_status),
                              },
                            ]}
                          >
                            {getBotStatusText(user.bot_status)}
                          </Text>
                        </View>

                        {/* Bot Control Button */}
                        <TouchableOpacity
                          style={[
                            styles.modernBotButton,
                            user.bot_status === 'running'
                              ? styles.modernStopButton
                              : styles.modernStartButton,
                            (user.bot_status === 'starting' || 
                             user.bot_status === 'stopping' || 
                             loadingBots[user.id]) && styles.modernDisabledButton,
                          ]}
                          onPress={() =>
                            handleBotToggle(user.id, user.bot_status)
                          }
                          disabled={
                            loadingBots[user.id] || 
                            user.bot_status === 'starting' || 
                            user.bot_status === 'stopping'
                          }
                        >
                          {(loadingBots[user.id] || 
                            user.bot_status === 'starting' || 
                            user.bot_status === 'stopping') ? (
                            <>
                              <ActivityIndicator size="small" color="white" />
                              <Text style={styles.modernButtonText}>
                                {user.bot_status === 'starting' ? 'Startet...' : 
                                 user.bot_status === 'stopping' ? 'Stoppt...' : 'Lädt...'}
                              </Text>
                            </>
                          ) : (
                            <>
                              <Ionicons
                                name={
                                  user.bot_status === 'running'
                                    ? 'stop-circle'
                                    : 'play-circle'
                                }
                                size={18}
                                color="white"
                              />
                              <Text style={styles.modernButtonText}>
                                {user.bot_status === 'running'
                                  ? 'Stoppen'
                                  : 'Starten'}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// Theme Provider Component
function BotManagementWithTheme() {
  const colorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');

  const theme = isDarkMode ? MD3DarkTheme : MD3LightTheme;

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <PaperProvider theme={theme}>
        <BotManagementContent
          toggleTheme={toggleTheme}
          isDarkMode={isDarkMode}
        />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default BotManagementWithTheme;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Welcome Section
  welcomeSection: {
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 17,
    color: '#86868b',
    fontWeight: '400',
  },

  // Stats Row
  topStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 16,
  },
  topStatCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  statGradient: {
    padding: 20,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },

  // Search Card
  searchCard: {
    backgroundColor: 'white',
    borderRadius: 20,
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
  searchContainer: {
    padding: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1d1d1f',
    fontWeight: '400',
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 4,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#86868b',
    marginTop: 16,
    fontWeight: '500',
  },

  // No Results
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#86868b',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtitle: {
    fontSize: 15,
    color: '#C7C7CC',
    textAlign: 'center',
  },

  // Users Section
  usersSection: {
    marginBottom: 24,
  },
  usersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  usersTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  usersCount: {
    fontSize: 16,
    color: '#86868b',
    fontWeight: '500',
  },

  // User Card
  userCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1d1d1f',
    marginRight: 10,
  },
  adminBadge: {
    backgroundColor: '#ff9500',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  adminText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  inactiveBadge: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  inactiveText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 15,
    color: '#86868b',
    marginBottom: 4,
  },
  userActivity: {
    fontSize: 13,
    color: '#c7c7cc',
  },
  currentAction: {
    fontSize: 12,
    color: '#007aff',
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Bot Stats Row
  botStatsRow: {
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#e5e5ea',
    marginHorizontal: 8,
  },
  statText: {
    fontSize: 12,
    color: '#86868b',
    fontWeight: '500',
  },
  
  // Modern Bot Controls
  userRight: {
    alignItems: 'flex-end',
    minWidth: 120,
  },
  botControlsContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  modernStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    minWidth: 85,
    justifyContent: 'center',
  },
  modernStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  modernStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modernBotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 85,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modernStartButton: {
    backgroundColor: '#34c759',
  },
  modernStopButton: {
    backgroundColor: '#ff3b30',
  },
  modernDisabledButton: {
    backgroundColor: '#c7c7cc',
    shadowOpacity: 0,
    elevation: 0,
  },
  modernButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
