import * as React from 'react';
import { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, Alert, RefreshControl, TextInput } from 'react-native';
import { 
  SafeAreaProvider, 
  SafeAreaView, 
  useSafeAreaInsets,
  initialWindowMetrics 
} from 'react-native-safe-area-context';
import { 
  PaperProvider, 
  MD3LightTheme, 
  MD3DarkTheme,
  Text,
  useTheme,
  ActivityIndicator
} from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import UniversalHeader from '@/shared/UniversalHeader';

interface User {
  id: number;
  email: string;
  vorname: string;
  nachname: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  bot_status: 'running' | 'stopped' | 'paused';
  last_activity: string;
}

// Bot Management Component
function BotManagementContent({ toggleTheme, isDarkMode }: { toggleTheme: () => void; isDarkMode: boolean }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingBots, setLoadingBots] = useState<{ [key: number]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  // Mock data for demonstration
  const mockUsers: User[] = [
    {
      id: 1,
      email: 'max.mueller@email.com',
      vorname: 'Max',
      nachname: 'Müller',
      is_admin: false,
      is_active: true,
      created_at: '2024-01-15T10:30:00Z',
      bot_status: 'running',
      last_activity: 'vor 5 Minuten'
    },
    {
      id: 2,
      email: 'anna.schmidt@email.com',
      vorname: 'Anna',
      nachname: 'Schmidt',
      is_admin: false,
      is_active: true,
      created_at: '2024-01-20T14:15:00Z',
      bot_status: 'stopped',
      last_activity: 'vor 2 Stunden'
    },
    {
      id: 3,
      email: 'thomas.weber@email.com',
      vorname: 'Thomas',
      nachname: 'Weber',
      is_admin: false,
      is_active: true,
      created_at: '2024-01-25T09:45:00Z',
      bot_status: 'running',
      last_activity: 'vor 1 Minute'
    },
    {
      id: 4,
      email: 'lisa.hoffmann@email.com',
      vorname: 'Lisa',
      nachname: 'Hoffmann',
      is_admin: false,
      is_active: false,
      created_at: '2024-01-30T16:20:00Z',
      bot_status: 'stopped',
      last_activity: 'vor 1 Tag'
    },
    {
      id: 5,
      email: 'michael.klein@email.com',
      vorname: 'Michael',
      nachname: 'Klein',
      is_admin: false,
      is_active: true,
      created_at: '2024-02-02T11:10:00Z',
      bot_status: 'paused',
      last_activity: 'vor 30 Minuten'
    },
  ];

  useEffect(() => {
    // Load users on component mount
    setUsers(mockUsers);
    setFilteredUsers(mockUsers);
  }, []);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${user.vorname} ${user.nachname}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.vorname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.nachname.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setUsers(mockUsers);
      setFilteredUsers(mockUsers);
      setRefreshing(false);
    }, 1000);
  };

  const handleBotToggle = async (userId: number, currentStatus: string) => {
    setLoadingBots(prev => ({ ...prev, [userId]: true }));
    
    // Simulate API call
    setTimeout(() => {
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { 
                ...user, 
                bot_status: currentStatus === 'running' ? 'stopped' : 'running',
                last_activity: 'gerade eben'
              }
            : user
        )
      );
      setLoadingBots(prev => ({ ...prev, [userId]: false }));
      
      const action = currentStatus === 'running' ? 'gestoppt' : 'gestartet';
      Alert.alert('Erfolg', `Bot wurde ${action}`);
    }, 1500);
  };

  const getBotStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#34c759';
      case 'paused': return '#ff9500';
      case 'stopped': return '#ff3b30';
      default: return '#8e8e93';
    }
  };

  const getBotStatusText = (status: string) => {
    switch (status) {
      case 'running': return 'Läuft';
      case 'paused': return 'Pausiert';
      case 'stopped': return 'Gestoppt';
      default: return 'Unbekannt';
    }
  };

  const statsData = [
    { 
      title: 'Aktive Bots', 
      value: users.filter(u => u.bot_status === 'running').length.toString(), 
      gradient: ['#34c759', '#32d74b'],
      icon: 'play-circle',
      subtitle: 'Derzeit laufend'
    },
    { 
      title: 'Gestoppte Bots', 
      value: users.filter(u => u.bot_status === 'stopped').length.toString(), 
      gradient: ['#ff3b30', '#ff6961'],
      icon: 'stop-circle',
      subtitle: 'Nicht aktiv'
    }
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
            { paddingBottom: Math.max(insets.bottom, 100) }
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Bot Management</Text>
            <Text style={styles.welcomeSubtitle}>Verwalten Sie alle Benutzer-Bots</Text>
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
                <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
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
            
            {filteredUsers.length === 0 && searchQuery ? (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search" size={48} color="#C7C7CC" />
                <Text style={styles.noResultsTitle}>Keine Benutzer gefunden</Text>
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
                        {(user.vorname?.[0] || '') + (user.nachname?.[0] || '')}
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
                      <Text style={styles.userActivity}>Letzte Aktivität: {user.last_activity}</Text>
                    </View>
                  </View>

                  {/* Bot Status & Controls */}
                  <View style={styles.userRight}>
                    <View style={styles.botStatusContainer}>
                      <View style={[styles.botStatusBadge, { backgroundColor: getBotStatusColor(user.bot_status) }]}>
                        <View style={styles.statusDot} />
                        <Text style={styles.botStatusText}>{getBotStatusText(user.bot_status)}</Text>
                      </View>
                      
                      {/* Bot Control Button */}
                      <TouchableOpacity
                        style={[
                          styles.botButton,
                          user.bot_status === 'running' ? styles.stopButton : styles.startButton
                        ]}
                        onPress={() => handleBotToggle(user.id, user.bot_status)}
                        disabled={loadingBots[user.id]}
                      >
                        {loadingBots[user.id] ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <>
                            <Ionicons 
                              name={user.bot_status === 'running' ? 'stop' : 'play'} 
                              size={16} 
                              color="white" 
                            />
                            <Text style={styles.botButtonText}>
                              {user.bot_status === 'running' ? 'Stoppen' : 'Starten'}
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
        <BotManagementContent toggleTheme={toggleTheme} isDarkMode={isDarkMode} />
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

  // Bot Controls
  userRight: {
    alignItems: 'flex-end',
  },
  botStatusContainer: {
    alignItems: 'center',
    gap: 12,
  },
  botStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
    marginRight: 6,
  },
  botStatusText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  botButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    minWidth: 90,
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#34c759',
  },
  stopButton: {
    backgroundColor: '#ff3b30',
  },
  disabledButton: {
    backgroundColor: '#c7c7cc',
  },
  botButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
}); 