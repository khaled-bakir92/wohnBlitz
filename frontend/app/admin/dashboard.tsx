import * as React from 'react';
import { useState } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, Dimensions } from 'react-native';
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
  Card,
  Surface,
  Text,
  IconButton,
  useTheme,
  Badge
} from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import UniversalHeader from '@/shared/UniversalHeader';

// Admin Dashboard Component
function AdminDashboardContent({ toggleTheme, isDarkMode }: { toggleTheme: () => void; isDarkMode: boolean }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  
  const statsData = [
    { 
      title: 'Aktive Benutzer', 
      value: '142', 
      gradient: ['#667eea', '#764ba2'],
      icon: 'people',
      subtitle: 'Online Benutzer'
    },
    { 
      title: 'Laufende Bots', 
      value: '8', 
      gradient: ['#f093fb', '#f5576c'],
      icon: 'smart-toy',
      subtitle: 'Aktiv suchend'
    }
  ];

  const secondRowStats = [
    { 
      title: 'Anzahl Bewerbungen', 
      value: '1,247', 
      gradient: ['#4facfe', '#00f2fe'],
      icon: 'description',
      subtitle: 'Diese Woche'
    },
    { 
      title: 'Blockierte Benutzer', 
      value: '12', 
      gradient: ['#ff9a9e', '#fecfef'],
      icon: 'block',
      subtitle: 'Gesperrt'
    }
  ];

  const weeklyStats = {
    title: 'Diese Woche',
    value: '89',
    subtitle: 'Neue Registrierungen',
    gradient: ['#4facfe', '#00f2fe'],
    icon: 'trending-up',
    change: '+23',
    changeType: 'increase'
  };

  // Weekly chart data for Users & Applications
  const weeklyChartData = [
    { day: 'Mo', users: 12, applications: 45, userHeight: 48, appHeight: 72 },
    { day: 'Di', users: 18, applications: 62, userHeight: 72, appHeight: 100 },
    { day: 'Mi', users: 8, applications: 38, userHeight: 32, appHeight: 61 },
    { day: 'Do', users: 15, applications: 71, userHeight: 60, appHeight: 114 },
    { day: 'Fr', users: 22, applications: 54, userHeight: 88, appHeight: 86 },
    { day: 'Sa', users: 6, applications: 29, userHeight: 24, appHeight: 46 },
    { day: 'So', users: 4, applications: 18, userHeight: 16, appHeight: 29 }
  ];

  const recentActivities = [
    {
      activity: 'Neue Benutzer Registrierung',
      user: 'max.mueller@email.com',
      time: 'vor 5 Minuten',
      type: 'Registrierung',
      typeColor: '#34c759'
    },
    {
      activity: 'Bot gestartet',
      user: 'anna.schmidt@email.com',
      time: 'vor 12 Minuten',
      type: 'Bot Aktivität',
      typeColor: '#007aff'
    },
    {
      activity: 'Bewerbung versendet',
      user: 'thomas.weber@email.com',
      time: 'vor 18 Minuten',
      type: 'Bewerbung',
      typeColor: '#ff9500'
    },
    {
      activity: 'Benutzer blockiert',
      user: 'spam.user@email.com',
      time: 'vor 1 Stunde',
      type: 'Moderation',
      typeColor: '#ff3b30'
    }
  ];

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
        >
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Admin Dashboard</Text>
            <Text style={styles.welcomeSubtitle}>System Übersicht und Statistiken</Text>
          </View>

          {/* Top Stats Row */}
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
                    <MaterialIcons name={stat.icon} size={28} color="white" />
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

          {/* Second Stats Row */}
          <View style={styles.topStatsRow}>
            {secondRowStats.map((stat, index) => (
              <View key={index} style={styles.topStatCard}>
                <LinearGradient
                  colors={stat.gradient}
                  style={styles.statGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.statIconContainer}>
                    <MaterialIcons name={stat.icon} size={28} color="white" />
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

          {/* Weekly Stats Card */}
          <View style={styles.weeklyStatsCard}>
            <LinearGradient
              colors={weeklyStats.gradient}
              style={styles.weeklyGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.weeklyHeader}>
                <View style={styles.weeklyIconContainer}>
                  <MaterialIcons name={weeklyStats.icon} size={24} color="white" />
                </View>
                <View style={styles.weeklyTextContainer}>
                  <Text style={styles.weeklyValue}>{weeklyStats.value}</Text>
                  <Text style={styles.weeklyTitle}>{weeklyStats.title}</Text>
                </View>
                <View style={styles.weeklyChangeContainer}>
                  <Text style={styles.weeklyChange}>{weeklyStats.change}</Text>
                  <Ionicons name="trending-up" size={16} color="white" />
                </View>
              </View>
              <Text style={styles.weeklySubtitle}>{weeklyStats.subtitle}</Text>
            </LinearGradient>
          </View>

          {/* Weekly Chart */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Wochenstatistik</Text>
              <Text style={styles.chartSubtitle}>Benutzer & Bewerbungen der letzten 7 Tage</Text>
            </View>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#667eea' }]} />
                <Text style={styles.legendText}>Benutzer</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#f093fb' }]} />
                <Text style={styles.legendText}>Bewerbungen</Text>
              </View>
            </View>
            <View style={styles.chartWrapper}>
              <View style={styles.chart}>
                {weeklyChartData.map((day, index) => (
                  <View key={index} style={styles.chartBar}>
                    <View style={styles.barGroup}>
                      <View 
                        style={[
                          styles.bar, 
                          { 
                            height: day.userHeight,
                            backgroundColor: '#667eea',
                            marginRight: 2,
                            width: 12,
                          }
                        ]} 
                      />
                      <View 
                        style={[
                          styles.bar, 
                          { 
                            height: day.appHeight,
                            backgroundColor: '#f093fb',
                            width: 12,
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.chartDayLabel}>
                      {day.day}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* System Status */}
          <View style={styles.quickActionsCard}>
            <View style={styles.quickActionsHeader}>
              <Text style={styles.quickActionsTitle}>System Status</Text>
              <View style={styles.statusContainer}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Alle Systeme Online</Text>
              </View>
            </View>
          </View>

          {/* Recent Activities */}
          <View style={styles.applicationsSection}>
            <View style={styles.applicationsSectionHeader}>
              <Text style={styles.applicationsTitle}>Letzte Aktivitäten</Text>
              <TouchableOpacity style={styles.seeAllButton}>
                <Text style={styles.seeAllText}>Alle anzeigen</Text>
                <Ionicons name="chevron-forward" size={16} color="#667eea" />
              </TouchableOpacity>
            </View>
            
            {recentActivities.map((activity, index) => (
              <TouchableOpacity key={index} style={styles.applicationCard}>
                <View style={styles.applicationContent}>
                  <View style={styles.applicationLeft}>
                    <View style={[styles.statusBadge, { backgroundColor: activity.typeColor }]}>
                      <Text style={styles.statusText}>{activity.type}</Text>
                    </View>
                    <View style={styles.applicationInfo}>
                      <Text style={styles.companyName}>{activity.activity}</Text>
                      <Text style={styles.companyAddress}>{activity.user}</Text>
                      <Text style={styles.applicationTime}>{activity.time}</Text>
                    </View>
                  </View>
                  <View style={styles.applicationRight}>
                    <Ionicons name="chevron-forward" size={20} color="#c7c7cc" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// Theme Provider Component with Theme Toggle
function AdminDashboardWithTheme() {
  const colorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');
  
  const theme = isDarkMode ? MD3DarkTheme : MD3LightTheme;

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <PaperProvider theme={theme}>
        <AdminDashboardContent toggleTheme={toggleTheme} isDarkMode={isDarkMode} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default AdminDashboardWithTheme;

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

  // Top Stats Row
  topStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
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

  // Weekly Stats Card
  weeklyStatsCard: {
    borderRadius: 20,
    marginBottom: 24,
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
  weeklyGradient: {
    padding: 24,
    minHeight: 120,
  },
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  weeklyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  weeklyTextContainer: {
    flex: 1,
  },
  weeklyValue: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
  },
  weeklyTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: 'white',
  },
  weeklyChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  weeklyChange: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginRight: 4,
  },
  weeklySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },

  // Chart Card
  chartCard: {
    backgroundColor: 'white',
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
  chartHeader: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 15,
    color: '#86868b',
    fontWeight: '400',
  },
  chartLegend: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#86868b',
    fontWeight: '500',
  },
  chartWrapper: {
    alignItems: 'center',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  barGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bar: {
    borderRadius: 6,
    minHeight: 8,
  },
  chartDayLabel: {
    fontSize: 13,
    color: '#86868b',
    marginTop: 12,
    fontWeight: '500',
  },

  // Status Card
  quickActionsCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
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
  quickActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickActionsTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34c759',
    marginRight: 8,
  },
  statusText: {
    fontSize: 15,
    color: '#34c759',
    fontWeight: '500',
  },

  // Activities Section
  applicationsSection: {
    marginBottom: 24,
  },
  applicationsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  applicationsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 15,
    color: '#667eea',
    fontWeight: '500',
    marginRight: 4,
  },
  applicationCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  applicationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  applicationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 14,
  },
  applicationInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 4,
  },
  companyAddress: {
    fontSize: 14,
    color: '#86868b',
    marginBottom: 2,
  },
  applicationTime: {
    fontSize: 13,
    color: '#86868b',
  },
  applicationRight: {
    padding: 4,
  },
}); 