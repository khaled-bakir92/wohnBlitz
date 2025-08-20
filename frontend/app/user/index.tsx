import * as React from 'react';
import { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Dimensions,
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
  Modal,
  Portal,
} from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import WohnBlitzHeader from '@/user/WohnBlitzHeader';

// Helper function to get status configuration
const getStatusConfig = (status: string) => {
  switch (status.toLowerCase()) {
    case 'beworben':
      return {
        color: '#10B981',
        icon: 'checkmark-circle',
        displayText: 'Beworben',
      };
    case 'skiped':
      return {
        color: '#EF4444',
        icon: 'close-circle',
        displayText: 'Übersprungen',
      };
    default:
      return {
        color: '#6B7280',
        icon: 'help-circle',
        displayText: status,
      };
  }
};

// Dashboard Component
function DashboardContent({
  toggleTheme,
  isDarkMode,
}: {
  toggleTheme: () => void;
  isDarkMode: boolean;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const statsData = [
    {
      title: 'Gesamt Bewerbungen',
      value: '47',
      gradient: ['#667eea', '#764ba2'],
      icon: 'description',
      subtitle: 'Total eingereicht',
    },
    {
      title: 'Heute versendet',
      value: '3',
      gradient: ['#f093fb', '#f5576c'],
      icon: 'send',
      subtitle: 'Neue Bewerbungen',
    },
  ];

  const weeklyStats = {
    title: 'Diese Woche',
    value: '12',
    subtitle: 'Bewerbungen eingereicht',
    gradient: ['#4facfe', '#00f2fe'],
    icon: 'trending-up',
    change: '+4',
    changeType: 'increase',
  };

  const weeklyChartData = [
    { day: 'Mo', value: 4, height: 40 },
    { day: 'Di', value: 8, height: 80 },
    { day: 'Mi', value: 3, height: 30 },
    { day: 'Do', value: 6, height: 60 },
    { day: 'Fr', value: 7, height: 70 },
    { day: 'Sa', value: 2, height: 20 },
    { day: 'So', value: 1, height: 10 },
  ];

  const applications = [
    {
      id: 1,
      company: 'Immobilien Schmidt GmbH',
      address: 'Maximilianstraße 45',
      time: 'vor 2 Stunden',
      status: 'beworben',
      statusColor: '#10B981',
      statusIcon: 'checkmark-circle',
      details: {
        title: '2-ZIMMER-WOHNUNG IN MITTE',
        fullAddress: 'Maximilianstraße 45, 10117 Berlin',
        bezirk: 'MITTE',
        warmmiete: '850.0 €',
        zimmer: 2,
        wbsErforderlich: 'Nein',
        url: 'https://www.immobilien-schmidt.de/wohnungen/details/2-zimmer-mitte',
      },
    },
    {
      id: 2,
      company: 'Wohnungsgenossenschaft Berlin',
      address: 'Prenzlauer Allee 123',
      time: 'vor 1 Tag',
      status: 'beworben',
      statusColor: '#10B981',
      statusIcon: 'checkmark-circle',
      details: {
        title: '3-ZIMMER-WOHNUNG IN PRENZLAUER BERG',
        fullAddress: 'Prenzlauer Allee 123, 10405 Berlin',
        bezirk: 'PANKOW',
        warmmiete: '1200.5 €',
        zimmer: 3,
        wbsErforderlich: 'Ja',
        url: 'https://www.wohnungsgenossenschaft-berlin.de/angebote/3-zimmer-prenzlauer',
      },
    },
    {
      id: 3,
      company: 'Privat - Familie Müller',
      address: 'Hamburger Straße 67',
      time: 'vor 3 Tagen',
      status: 'skiped',
      statusColor: '#EF4444',
      statusIcon: 'close-circle',
      details: {
        title: '1-ZIMMER-WOHNUNG IN ST. GEORG',
        fullAddress: 'Hamburger Straße 67, 20099 Hamburg',
        bezirk: 'ST. GEORG',
        warmmiete: '650.0 €',
        zimmer: 1,
        wbsErforderlich: 'Nein',
        url: 'https://www.privat-vermieter.de/hamburg/1-zimmer-67',
      },
    },
    {
      id: 4,
      company: 'Berlin Housing AG',
      address: 'Friedrichstraße 88',
      time: 'vor 5 Stunden',
      status: 'beworben',
      statusColor: '#10B981',
      statusIcon: 'checkmark-circle',
      details: {
        title: '2-ZIMMER-WOHNUNG IN MITTE',
        fullAddress: 'Friedrichstraße 88, 10117 Berlin',
        bezirk: 'MITTE',
        warmmiete: '920.3 €',
        zimmer: 2,
        wbsErforderlich: 'Nein',
        url: 'https://www.berlin-housing.de/wohnungen/friedrichstrasse-88',
      },
    },
    {
      id: 5,
      company: 'Stadthaus Vermietung',
      address: 'Warschauer Straße 12',
      time: 'vor 2 Tagen',
      status: 'skiped',
      statusColor: '#EF4444',
      statusIcon: 'close-circle',
      details: {
        title: '4-ZIMMER-WOHNUNG IN FRIEDRICHSHAIN',
        fullAddress: 'Warschauer Straße 12, 10243 Berlin',
        bezirk: 'FRIEDRICHSHAIN-KREUZBERG',
        warmmiete: '1650.8 €',
        zimmer: 4,
        wbsErforderlich: 'Ja',
        url: 'https://www.stadthaus-vermietung.de/friedrichshain/4-zimmer',
      },
    },
  ];

  const openApplicationDetail = (application: any) => {
    console.log('Opening application detail for:', application.company);
    setSelectedApplication(application);
    setDetailModalVisible(true);
  };

  const closeApplicationDetail = () => {
    setDetailModalVisible(false);
    setSelectedApplication(null);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <WohnBlitzHeader />

      {/* Main Content */}
      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 100) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Guten Tag!</Text>
            <Text style={styles.welcomeSubtitle}>
              Hier ist Ihr Bewerbungsüberblick
            </Text>
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

          {/* Weekly Chart */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Wochenverlauf</Text>
              <Text style={styles.chartSubtitle}>
                Bewerbungen der letzten 7 Tage
              </Text>
            </View>
            <View style={styles.chartWrapper}>
              <View style={styles.chart}>
                {weeklyChartData.map((day, index) => (
                  <View key={index} style={styles.chartBar}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: day.height,
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={styles.barGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                      />
                    </View>
                    <Text style={styles.chartDayLabel}>{day.day}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsCard}>
            <View style={styles.quickActionsHeader}>
              <Text style={styles.quickActionsTitle}>Letzte Bewerbung</Text>
              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={16} color="#f59e0b" />
                <Text style={styles.timeText}>vor 2 Stunden</Text>
              </View>
            </View>
          </View>

          {/* Applications List */}
          <View style={styles.applicationsSection}>
            <View style={styles.applicationsSectionHeader}>
              <Text style={styles.applicationsTitle}>Neueste Bewerbungen</Text>
              <TouchableOpacity style={styles.seeAllButton}>
                <Text style={styles.seeAllText}>Alle anzeigen</Text>
                <Ionicons name="chevron-forward" size={16} color="#667eea" />
              </TouchableOpacity>
            </View>

            {applications.map((app, index) => (
              <TouchableOpacity
                key={index}
                style={styles.applicationCard}
                onPress={() => openApplicationDetail(app)}
                activeOpacity={0.7}
              >
                <View style={styles.applicationContent}>
                  <View style={styles.applicationLeft}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: app.statusColor },
                      ]}
                    >
                      <Ionicons
                        name={app.statusIcon}
                        size={14}
                        color="white"
                        style={styles.statusIcon}
                      />
                      <Text style={styles.statusText}>{app.status}</Text>
                    </View>
                    <View style={styles.applicationInfo}>
                      <Text style={styles.companyName}>{app.company}</Text>
                      <Text style={styles.companyAddress}>{app.address}</Text>
                      <Text style={styles.applicationTime}>{app.time}</Text>
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

      {/* Application Detail Modal */}
      <Portal>
        <Modal
          visible={detailModalVisible}
          onDismiss={closeApplicationDetail}
          contentContainerStyle={styles.detailModalContainer}
        >
          {selectedApplication && (
            <View style={styles.detailModalContent}>
              {/* Modal Header */}
              <View style={styles.detailModalHeader}>
                <View style={styles.detailHeaderLeft}>
                  <View
                    style={[
                      styles.detailStatusBadge,
                      { backgroundColor: selectedApplication.statusColor },
                    ]}
                  >
                    <Ionicons
                      name={selectedApplication.statusIcon}
                      size={16}
                      color="white"
                      style={styles.detailStatusIcon}
                    />
                    <Text style={styles.detailStatusText}>
                      {selectedApplication.status}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={closeApplicationDetail}
                  style={styles.detailCloseButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Apartment Details */}
              <ScrollView
                style={styles.detailScrollView}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.detailContent}>
                  {/* Title */}
                  <Text style={styles.detailTitle}>
                    {selectedApplication.details.title}
                  </Text>

                  {/* Details Grid */}
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <View style={styles.detailItemHeader}>
                        <Ionicons name="location" size={20} color="#667eea" />
                        <Text style={styles.detailItemLabel}>Adresse</Text>
                      </View>
                      <Text style={styles.detailItemValue}>
                        {selectedApplication.details.fullAddress}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <View style={styles.detailItemHeader}>
                        <Ionicons name="business" size={20} color="#667eea" />
                        <Text style={styles.detailItemLabel}>Bezirk</Text>
                      </View>
                      <Text style={styles.detailItemValue}>
                        {selectedApplication.details.bezirk}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <View style={styles.detailItemHeader}>
                        <Ionicons name="cash" size={20} color="#667eea" />
                        <Text style={styles.detailItemLabel}>Warmmiete</Text>
                      </View>
                      <Text style={styles.detailItemValue}>
                        {selectedApplication.details.warmmiete}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <View style={styles.detailItemHeader}>
                        <Ionicons name="home" size={20} color="#667eea" />
                        <Text style={styles.detailItemLabel}>Zimmer</Text>
                      </View>
                      <Text style={styles.detailItemValue}>
                        {selectedApplication.details.zimmer}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <View style={styles.detailItemHeader}>
                        <Ionicons
                          name="document-text"
                          size={20}
                          color="#667eea"
                        />
                        <Text style={styles.detailItemLabel}>
                          WBS erforderlich
                        </Text>
                      </View>
                      <Text style={styles.detailItemValue}>
                        {selectedApplication.details.wbsErforderlich}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <View style={styles.detailItemHeader}>
                        <Ionicons name="link" size={20} color="#667eea" />
                        <Text style={styles.detailItemLabel}>URL</Text>
                      </View>
                      <Text
                        style={[styles.detailItemValue, styles.detailUrlText]}
                        numberOfLines={2}
                      >
                        {selectedApplication.details.url}
                      </Text>
                    </View>
                  </View>

                  {/* Applied Time */}
                  <View style={styles.detailTimeContainer}>
                    <Ionicons name="time" size={16} color="#6B7280" />
                    <Text style={styles.detailTimeText}>
                      {selectedApplication.status === 'beworben'
                        ? 'Beworben'
                        : 'Übersprungen'}{' '}
                      {selectedApplication.time}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          )}
        </Modal>
      </Portal>
    </View>
  );
}

// Theme Provider Component with Theme Toggle
function DashboardWithTheme() {
  const colorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');

  const theme = isDarkMode ? MD3DarkTheme : MD3LightTheme;

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <PaperProvider theme={theme}>
        <DashboardContent toggleTheme={toggleTheme} isDarkMode={isDarkMode} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default DashboardWithTheme;

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
    marginBottom: 24,
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
  bar: {
    width: 28,
    borderRadius: 14,
    minHeight: 8,
    overflow: 'hidden',
  },
  barGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  chartDayLabel: {
    fontSize: 13,
    color: '#86868b',
    marginTop: 12,
    fontWeight: '500',
  },

  // Quick Actions Card
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
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 15,
    color: '#f59e0b',
    fontWeight: '500',
    marginLeft: 6,
  },

  // Applications Section
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 14,
    minWidth: 80,
    justifyContent: 'center',
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '700',
    textTransform: 'capitalize',
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

  // Detail Modal Styles
  detailModalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    height: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  detailModalContent: {
    flex: 1,
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailHeaderLeft: {
    flex: 1,
  },
  detailStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  detailStatusIcon: {
    marginRight: 8,
  },
  detailStatusText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  detailCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  detailScrollView: {
    flex: 1,
  },
  detailContent: {
    padding: 20,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  detailsGrid: {
    gap: 20,
  },
  detailItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  detailItemValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    lineHeight: 22,
  },
  detailUrlText: {
    color: '#667eea',
    textDecorationLine: 'underline',
  },
  detailTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  detailTimeText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
    fontStyle: 'italic',
  },
});
