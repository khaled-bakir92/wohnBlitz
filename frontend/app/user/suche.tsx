import React, { useState, useEffect, Fragment } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  Surface,
  Button,
  Card,
  Portal,
  Provider,
  Divider,
} from 'react-native-paper';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import WohnBlitzHeader from '@/user/WohnBlitzHeader';
import { useNotifications } from '@/shared/contexts/NotificationContext';

const { width, height } = Dimensions.get('window');

interface SearchActivity {
  id: string;
  type: 'start' | 'stop';
  timestamp: Date;
  duration?: number;
  foundApartments?: number;
}

export default function SearchScreen() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchStartTime, setSearchStartTime] = useState<Date | null>(null);
  const [searchDuration, setSearchDuration] = useState(0);
  const { addNotification } = useNotifications();
  const [searchStats, setSearchStats] = useState({
    foundApartments: 0,
    checkedPortals: 0,
    lastUpdate: new Date(),
    processedApartments: 0,
  });
  const [searchHistory, setSearchHistory] = useState<SearchActivity[]>([
    {
      id: '1',
      type: 'stop',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      duration: 45,
      foundApartments: 12,
    },
    {
      id: '2',
      type: 'stop',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      duration: 30,
      foundApartments: 8,
    },
    {
      id: '3',
      type: 'stop',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      duration: 20,
      foundApartments: 5,
    },
  ]);

  // Animation values
  const pulseAnim = new Animated.Value(1);
  const progressAnim = new Animated.Value(0);

  // Simulate search progress
  useEffect(() => {
    if (isSearching) {
      // Start pulse animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      // Start progress animation (slower progress)
      const progressAnimation = Animated.timing(progressAnim, {
        toValue: 1,
        duration: 60000, // 60 seconds for full progress instead of 3
        useNativeDriver: false,
      });

      pulseAnimation.start();
      progressAnimation.start();

      // Update search duration every second
      const durationInterval = setInterval(() => {
        if (searchStartTime) {
          const now = new Date();
          const duration = Math.floor(
            (now.getTime() - searchStartTime.getTime()) / 1000
          );
          setSearchDuration(duration);
        }
      }, 1000);

      // Simulate finding apartments
      const searchInterval = setInterval(() => {
        setSearchStats(prev => {
          // Only increment if we haven't reached the maximum
          const newCheckedPortals =
            prev.checkedPortals < 8
              ? prev.checkedPortals + 1
              : prev.checkedPortals;

          return {
            ...prev,
            foundApartments:
              prev.foundApartments + Math.floor(Math.random() * 2),
            checkedPortals: newCheckedPortals,
            processedApartments:
              prev.processedApartments + Math.floor(Math.random() * 5) + 1,
            lastUpdate: new Date(),
          };
        });
      }, 3000); // Slower update interval

      return () => {
        clearInterval(durationInterval);
        clearInterval(searchInterval);
        pulseAnimation.stop();
        progressAnimation.stop();
      };
    } else {
      // Reset animations
      progressAnim.setValue(0);
      pulseAnim.setValue(1);
      setSearchDuration(0);
    }
  }, [isSearching, searchStartTime]);

  const toggleSearch = () => {
    const now = new Date();

    if (isSearching) {
      // Stop search
      const duration = searchStartTime
        ? Math.round((now.getTime() - searchStartTime.getTime()) / 1000 / 60)
        : 0;
      const newActivity: SearchActivity = {
        id: Date.now().toString(),
        type: 'stop',
        timestamp: now,
        duration,
        foundApartments: searchStats.foundApartments,
      };

      setSearchHistory(prev => [newActivity, ...prev.slice(0, 4)]); // Keep only last 5

      // Add notification for search completion
      addNotification({
        title: 'Suche beendet',
        message: `Suche wurde nach ${duration} Minuten beendet. ${searchStats.foundApartments} Wohnungen wurden gefunden.`,
        type: 'success',
        isRead: false,
      });

      setIsSearching(false);
      setSearchStartTime(null);
      setSearchStats({
        foundApartments: 0,
        checkedPortals: 0,
        processedApartments: 0,
        lastUpdate: new Date(),
      });
    } else {
      // Start search
      const newActivity: SearchActivity = {
        id: Date.now().toString(),
        type: 'start',
        timestamp: now,
      };

      setSearchHistory(prev => [newActivity, ...prev.slice(0, 4)]);
      setIsSearching(true);
      setSearchStartTime(now);
    }
  };

  const SearchButton = () => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={toggleSearch}
      style={styles.searchButtonContainer}
    >
      <Animated.View
        style={[
          styles.searchButton,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={isSearching ? ['#ef4444', '#dc2626'] : ['#3b82f6', '#2563eb']}
          style={styles.gradientButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.buttonIconContainer}>
            <Ionicons
              name={isSearching ? 'stop' : 'play'}
              size={40}
              color="white"
              style={styles.buttonIcon}
            />
          </View>
        </LinearGradient>

        {/* Ring animation for active state */}
        {isSearching && (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.1],
                  outputRange: [0.3, 0],
                }),
              },
            ]}
          />
        )}
      </Animated.View>

      <Text
        style={[
          styles.buttonLabel,
          { color: isSearching ? '#ef4444' : '#3b82f6' },
        ]}
      >
        {isSearching ? 'Suche stoppen' : 'Suche starten'}
      </Text>
    </TouchableOpacity>
  );

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const StatusCard = () => (
    <View style={styles.statusCard}>
      <Surface style={styles.statusSurface} elevation={4}>
        <View style={styles.statusHeader}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
          <Text style={styles.statusTitle}>Suche läuft...</Text>
        </View>

        {/* Search Start Time and Duration */}
        {searchStartTime && (
          <View style={styles.searchTimeContainer}>
            <View style={styles.timeItem}>
              <Ionicons name="calendar" size={16} color="#3b82f6" />
              <Text style={styles.timeLabel}>Gestartet:</Text>
              <Text style={styles.timeValue}>
                {searchStartTime.toLocaleDateString('de-DE')}
              </Text>
            </View>
            <View style={styles.timeItem}>
              <Ionicons name="time" size={16} color="#10b981" />
              <Text style={styles.timeLabel}>Dauer:</Text>
              <Text style={styles.timeValue}>
                {formatDuration(searchDuration)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {String(searchStats.foundApartments || 0)}
            </Text>
            <Text style={styles.statLabel}>Beworbene Wohnungen</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {String(searchStats.processedApartments || 0)}
            </Text>
            <Text style={styles.statLabel}>Anzeigen geprüft</Text>
          </View>
        </View>

        {/* Additional Stats Row */}
        <View style={styles.additionalStatsContainer}>
          <View style={styles.additionalStatItem}>
            <Ionicons name="search" size={16} color="#6b7280" />
            <Text style={styles.additionalStatLabel}>
              {searchStats.checkedPortals} von 8 Portalen durchsucht
            </Text>
          </View>
        </View>

        <Text style={styles.lastUpdate}>
          Letzte Aktualisierung:{' '}
          {searchStats.lastUpdate.toLocaleTimeString('de-DE')}
        </Text>
      </Surface>
    </View>
  );

  const ActivityHistoryCard = () => {
    const renderHistoryItem = (activity: SearchActivity, index: number) => {
      const actionText = activity.type === 'start' ? 'gestartet' : 'gestoppt';
      const dateText = activity.timestamp.toLocaleDateString('de-DE');
      const timeText = activity.timestamp.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const statsText =
        activity.type === 'stop' && activity.duration
          ? `${activity.duration} Min. • ${activity.foundApartments || 0} Wohnungen gefunden`
          : '';

      return (
        <React.Fragment key={activity.id}>
          <View style={styles.historyItem}>
            <View
              style={[
                styles.historyIcon,
                {
                  backgroundColor:
                    activity.type === 'start' ? '#dbeafe' : '#fee2e2',
                },
              ]}
            >
              <Ionicons
                name={activity.type === 'start' ? 'play' : 'stop'}
                size={16}
                color={activity.type === 'start' ? '#3b82f6' : '#ef4444'}
              />
            </View>

            <View style={styles.historyDetails}>
              <Text style={styles.historyAction}>Suche {actionText}</Text>
              <Text style={styles.historyTime}>
                {dateText} um {timeText}
              </Text>
              {statsText !== '' && (
                <Text style={styles.historyStats}>{statsText}</Text>
              )}
            </View>
          </View>
          {index < searchHistory.length - 1 && (
            <Divider style={styles.historyDivider} />
          )}
        </React.Fragment>
      );
    };

    return (
      <Card style={styles.historyCard}>
        <Card.Content style={styles.historyContent}>
          <View style={styles.historyHeader}>
            <Ionicons name="time-outline" size={20} color="#6b7280" />
            <Text style={styles.historyTitle}>Letzte Aktivitäten</Text>
          </View>

          <ScrollView
            style={styles.historyList}
            showsVerticalScrollIndicator={false}
          >
            {searchHistory.map((activity, index) =>
              renderHistoryItem(activity, index)
            )}
          </ScrollView>
        </Card.Content>
      </Card>
    );
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return 'Gerade eben';
    if (diffInHours < 24) return `vor ${diffInHours} Std.`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `vor ${diffInDays} Tag${diffInDays > 1 ? 'en' : ''}`;
  };

  return (
    <Provider>
      <View style={styles.container}>
        <WohnBlitzHeader />

        <ScrollView
          style={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <View style={styles.titleContainer}>
                <Text style={styles.mainTitle}>Wohnungssuche</Text>
                <Text style={styles.subtitle}>
                  {isSearching
                    ? 'Durchsuche gerade alle verfügbaren Immobilienportale...'
                    : 'Automatische Suche nach Ihrer Traumwohnung'}
                </Text>
              </View>

              {/* Search Button */}
              <View style={styles.buttonSection}>
                <SearchButton />
              </View>

              {/* Status Card - Only visible when searching */}
              {isSearching && <StatusCard />}
            </View>

            {/* Activity History */}
            {!isSearching && searchHistory.length > 0 && (
              <View style={styles.activitySection}>
                <ActivityHistoryCard />
              </View>
            )}

            {/* Quick Stats */}
            {!isSearching && (
              <View style={styles.statsSection}>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>
                      {String(
                        searchHistory
                          ?.filter(h => h?.type === 'stop')
                          ?.reduce(
                            (acc, h) => acc + (h?.foundApartments || 0),
                            0
                          ) || 0
                      )}
                    </Text>
                    <Text style={styles.statLabel}>Wohnungen gefunden</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>
                      {String(
                        searchHistory?.filter(h => h?.type === 'stop')
                          ?.length || 0
                      )}
                    </Text>
                    <Text style={styles.statLabel}>Suchdurchläufe</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>
                      {String(
                        Math.round(
                          (searchHistory
                            ?.filter(h => h?.type === 'stop')
                            ?.reduce((acc, h) => acc + (h?.duration || 0), 0) ||
                            0) /
                            Math.max(
                              1,
                              searchHistory?.filter(h => h?.type === 'stop')
                                ?.length || 1
                            )
                        )
                      )}
                    </Text>
                    <Text style={styles.statLabel}>Ø Min pro Suche</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Bottom tab bar padding
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  buttonSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  searchButtonContainer: {
    alignItems: 'center',
  },
  searchButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
    marginBottom: 20,
    position: 'relative',
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIcon: {
    marginLeft: 2, // Adjust for play icon visual centering
  },
  pulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#3b82f6',
    top: -10,
    left: -10,
    zIndex: -1,
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  statusCard: {
    width: '100%',
    marginTop: 20,
  },
  statusSurface: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 20,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  lastUpdate: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  searchTimeContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  additionalStatsContainer: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    marginBottom: 16,
  },
  additionalStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  additionalStatLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 4,
    fontWeight: '500',
  },
  activitySection: {
    marginTop: 20,
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  historyContent: {
    padding: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
  },
  historyList: {
    maxHeight: 200,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyDetails: {
    flex: 1,
  },
  historyAction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  historyStats: {
    fontSize: 12,
    color: '#9ca3af',
  },
  historyDivider: {
    marginVertical: 8,
    marginLeft: 44,
  },
  statsSection: {
    marginTop: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginHorizontal: 6,
  },
});
