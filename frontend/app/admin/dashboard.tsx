import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
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
  Card,
  Surface,
  Text,
  IconButton,
  useTheme,
  Badge,
  ActivityIndicator,
} from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import UniversalHeader from '@/shared/UniversalHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

interface DashboardStats {
  total_users: number;
  running_bots: number;
  daily_applications: number;
  blocked_users: number;
  weekly_registrations: number;
}

interface ChartDataPoint {
  day: string;
  users: number;
  applications: number;
  userHeight: number;
  appHeight: number;
}

interface Activity {
  activity: string;
  user: string;
  time: string;
  type: string;
  typeColor: string;
}

interface DashboardData {
  stats: DashboardStats;
  weekly_chart_data: ChartDataPoint[];
}

// Admin Dashboard Component
function AdminDashboardContent({
  toggleTheme,
  isDarkMode,
}: {
  toggleTheme: () => void;
  isDarkMode: boolean;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [activitiesData, setActivitiesData] = useState<Activity[]>([]);
  const [connectionError, setConnectionError] = useState(false);
  const autoRefreshInterval = useRef<number | null>(null);

  const getActivityBadgeStyle = (type: string) => {
    switch (type) {
      case 'Registrierung':
        return {
          backgroundColor: '#e8f5e8',
          borderWidth: 1,
          borderColor: '#34c759',
        };
      case 'Bot Aktivität':
        return {
          backgroundColor: '#e6f3ff',
          borderWidth: 1,
          borderColor: '#007aff',
        };
      case 'Moderation':
        return {
          backgroundColor: '#ffe6e6',
          borderWidth: 1,
          borderColor: '#ff3b30',
        };
      case 'Bewerbung':
        return {
          backgroundColor: '#fff3e6',
          borderWidth: 1,
          borderColor: '#ff9500',
        };
      case 'Fehler':
        return {
          backgroundColor: '#ffe6e6',
          borderWidth: 1,
          borderColor: '#ff3b30',
        };
      case 'Info':
        return {
          backgroundColor: '#f0f0f0',
          borderWidth: 1,
          borderColor: '#86868b',
        };
      default:
        return {
          backgroundColor: '#f0f0f0',
          borderWidth: 1,
          borderColor: '#86868b',
        };
    }
  };

  const getActivityTextStyle = (type: string) => {
    switch (type) {
      case 'Registrierung':
        return { color: '#1e7e1e' };
      case 'Bot Aktivität':
        return { color: '#0056b3' };
      case 'Moderation':
        return { color: '#cc2e2e' };
      case 'Bewerbung':
        return { color: '#cc7a00' };
      case 'Fehler':
        return { color: '#cc2e2e' };
      case 'Info':
        return { color: '#555555' };
      default:
        return { color: '#555555' };
    }
  };

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        console.error('No auth token found');
        // Set fallback data if no token
        setDashboardData({
          stats: {
            total_users: 0,
            running_bots: 0,
            daily_applications: 0,
            blocked_users: 0,
            weekly_registrations: 0
          },
          weekly_chart_data: []
        });
        setActivitiesData([]);
        if (!isRefresh) setLoading(false);
        return;
      }

      console.log(`${isRefresh ? 'Refreshing' : 'Fetching'} dashboard data with token...`);
      setConnectionError(false); // Reset error state on new attempt

      // Fetch dashboard stats with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const statsResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/dashboard-stats`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
          console.log('Stats response status:', statsResponse.status);

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          console.log('Dashboard stats data:', JSON.stringify(statsData, null, 2));
          setDashboardData(statsData);
        } else {
          const errorText = await statsResponse.text();
          console.error('Stats API error:', statsResponse.status, errorText);
          // Set fallback data auch bei API-Fehler
          setDashboardData({
            stats: {
              total_users: 0,
              running_bots: 0,
              daily_applications: 0,
              blocked_users: 0,
              weekly_registrations: 0
            },
            weekly_chart_data: []
          });
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('Stats API fetch error:', fetchError);
        setConnectionError(true);
        // Set fallback data on fetch error (including timeout)
        setDashboardData({
          stats: {
            total_users: 0,
            running_bots: 0,
            daily_applications: 0,
            blocked_users: 0,
            weekly_registrations: 0
          },
          weekly_chart_data: []
        });
      }

      // Fetch recent activities with timeout
      const activitiesController = new AbortController();
      const activitiesTimeoutId = setTimeout(() => activitiesController.abort(), 10000);

      try {
        const activitiesResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/recent-activities`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: activitiesController.signal,
        });
        clearTimeout(activitiesTimeoutId);

        console.log('Activities response status:', activitiesResponse.status);

        if (activitiesResponse.ok) {
          const activitiesData = await activitiesResponse.json();
          console.log('Activities data:', JSON.stringify(activitiesData, null, 2));
          setActivitiesData(activitiesData.activities || []);
        } else {
          const errorText = await activitiesResponse.text();
          console.error('Activities API error:', activitiesResponse.status, errorText);
          // Set fallback activities
          setActivitiesData([{
            activity: 'Keine aktuellen Aktivitäten',
            user: 'System',
            time: 'Jetzt',
            type: 'Info',
            typeColor: '#86868b',
          }]);
        }
      } catch (fetchError) {
        clearTimeout(activitiesTimeoutId);
        console.error('Activities API fetch error:', fetchError);
        setConnectionError(true);
        // Set fallback activities on fetch error (including timeout)
        setActivitiesData([{
          activity: 'Netzwerk-Timeout - Daten konnten nicht geladen werden',
          user: 'System',
          time: 'Jetzt',
          type: 'Fehler',
          typeColor: '#ff3b30',
        }]);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set fallback data on error
      setDashboardData({
        stats: {
          total_users: 0,
          running_bots: 0,
          daily_applications: 0,
          blocked_users: 0,
          weekly_registrations: 0
        },
        weekly_chart_data: []
      });
      setActivitiesData([]);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData(true);
    setRefreshing(false);
  };

  const startAutoRefresh = () => {
    // Clear existing interval
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
    }
    
    // Set up auto-refresh every 60 seconds (reduced frequency to prevent timeouts)
    autoRefreshInterval.current = setInterval(() => {
      console.log('Auto-refreshing dashboard data...');
      fetchDashboardData(true);
    }, 60000);
  };

  const stopAutoRefresh = () => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Auto-refresh when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('Admin dashboard focused - starting auto refresh');
      startAutoRefresh();
      // Refresh data immediately when screen becomes focused
      fetchDashboardData(true);

      return () => {
        console.log('Admin dashboard unfocused - stopping auto refresh');
        stopAutoRefresh();
      };
    }, [])
  );

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      stopAutoRefresh();
    };
  }, []);

  // Create stats data from API response with fallback
  const statsData = [
    {
      title: 'Alle Benutzer',
      value: dashboardData?.stats.total_users?.toString() || '0',
      gradient: ['#667eea', '#764ba2'] as const,
      icon: 'people' as const,
      subtitle: 'Registrierte Benutzer',
    },
    {
      title: 'Laufende Bots',
      value: dashboardData?.stats.running_bots?.toString() || '0',
      gradient: ['#f093fb', '#f5576c'] as const,
      icon: 'smart-toy' as const,
      subtitle: 'Aktiv suchend',
    },
  ];

  const secondRowStats = [
    {
      title: 'Bewerbungen (24h)',
      value: dashboardData?.stats.daily_applications?.toString() || '0',
      gradient: ['#4facfe', '#00f2fe'] as const,
      icon: 'description' as const,
      subtitle: 'Letzte 24 Stunden',
    },
    {
      title: 'Blockierte Benutzer',
      value: dashboardData?.stats.blocked_users?.toString() || '0',
      gradient: ['#ff9a9e', '#fecfef'] as const,
      icon: 'block' as const,
      subtitle: 'Gesperrt',
    },
  ];

  const weeklyStats = {
    title: 'Diese Woche',
    value: dashboardData?.stats.weekly_registrations?.toString() || '0',
    subtitle: 'Neue Registrierungen',
    gradient: ['#4facfe', '#00f2fe'] as const,
    icon: 'trending-up' as const,
    change: '+' + (dashboardData?.stats.weekly_registrations?.toString() || '0'),
    changeType: 'increase',
  };

  // Use real chart data from API with fallback
  const weeklyChartData = dashboardData?.weekly_chart_data || [
    { day: 'Mo', users: 0, applications: 0, userHeight: 8, appHeight: 8 },
    { day: 'Di', users: 0, applications: 0, userHeight: 8, appHeight: 8 },
    { day: 'Mi', users: 0, applications: 0, userHeight: 8, appHeight: 8 },
    { day: 'Do', users: 0, applications: 0, userHeight: 8, appHeight: 8 },
    { day: 'Fr', users: 0, applications: 0, userHeight: 8, appHeight: 8 },
    { day: 'Sa', users: 0, applications: 0, userHeight: 8, appHeight: 8 },
    { day: 'So', users: 0, applications: 0, userHeight: 8, appHeight: 8 },
  ];

  const recentActivities = activitiesData.length > 0 ? activitiesData : [
    {
      activity: 'Keine aktuellen Aktivitäten',
      user: 'System',
      time: 'Jetzt',
      type: 'Info',
      typeColor: '#86868b',
    },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#86868b' }}>Lade Dashboard...</Text>
      </View>
    );
  }

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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#667eea']}
              tintColor={'#667eea'}
              title="Dashboard aktualisieren..."
              titleColor={'#667eea'}
            />
          }
        >
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.welcomeTitle}>Admin Dashboard</Text>
                <Text style={styles.welcomeSubtitle}>
                  System Übersicht und Statistiken
                </Text>
              </View>
              <View style={styles.statusIndicators}>
                <View style={styles.refreshIndicator}>
                  <View style={[styles.autoRefreshDot, { backgroundColor: autoRefreshInterval.current ? '#34c759' : '#86868b' }]} />
                  <Text style={styles.autoRefreshText}>
                    Auto-Refresh {autoRefreshInterval.current ? 'An' : 'Aus'}
                  </Text>
                </View>
                {connectionError && (
                  <View style={[styles.refreshIndicator, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                    <View style={[styles.autoRefreshDot, { backgroundColor: '#ff3b30' }]} />
                    <Text style={[styles.autoRefreshText, { color: '#ff3b30' }]}>
                      Verbindungsfehler
                    </Text>
                  </View>
                )}
              </View>
            </View>
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
          {weeklyStats && (
            <View style={styles.weeklyStatsCard}>
              <LinearGradient
                colors={weeklyStats.gradient}
                style={styles.weeklyGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.weeklyHeader}>
                  <View style={styles.weeklyIconContainer}>
                    <MaterialIcons
                      name={weeklyStats.icon}
                      size={24}
                      color="white"
                    />
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
          )}

          {/* Weekly Chart */}
          {weeklyChartData && weeklyChartData.length > 0 && (
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Wochenstatistik</Text>
                <Text style={styles.chartSubtitle}>
                  Benutzer & Bewerbungen der letzten 7 Tage
                </Text>
              </View>
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendColor, { backgroundColor: '#667eea' }]}
                  />
                  <Text style={styles.legendText}>Benutzer</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendColor, { backgroundColor: '#f093fb' }]}
                  />
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
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.bar,
                            {
                              height: day.appHeight,
                              backgroundColor: '#f093fb',
                              width: 12,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.chartDayLabel}>{day.day}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

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

            {recentActivities && recentActivities.map((activity: Activity, index: number) => (
              <TouchableOpacity key={index} style={styles.applicationCard}>
                <View style={styles.applicationContent}>
                  <View style={styles.applicationLeft}>
                    <View
                      style={[
                        styles.statusBadge,
                        getActivityBadgeStyle(activity.type),
                      ]}
                    >
                      <Text style={[styles.statusText, getActivityTextStyle(activity.type)]}>{activity.type}</Text>
                    </View>
                    <View style={styles.applicationInfo}>
                      <Text style={styles.companyName}>
                        {activity.activity}
                      </Text>
                      <Text style={styles.companyAddress}>{activity.user}</Text>
                      <Text style={styles.applicationTime}>
                        {activity.time}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.applicationRight}>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#c7c7cc"
                    />
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
        <AdminDashboardContent
          toggleTheme={toggleTheme}
          isDarkMode={isDarkMode}
        />
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  statusIndicators: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  },
  refreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  autoRefreshDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  autoRefreshText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '500',
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
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
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
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
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
