import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, Alert, RefreshControl, Animated, PanGestureHandler, State } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Surface, Modal, Portal, Button } from 'react-native-paper';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import UniversalHeader from '@/shared/UniversalHeader';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'admin';
  timestamp: Date;
  senderName?: string;
}

interface Conversation {
  id: string;
  user_id: number;
  user_name: string;
  subject: string;
  status: string;
  priority: string;
  last_message_at: string;
  unread_count: number;
  last_message?: string;
}

export default function AdminMessagesScreen() {
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chatModalVisible, setChatModalVisible] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadConversations();
    // Set up polling for new messages
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conversation => 
        conversation.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conversation.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (conversation.last_message && conversation.last_message.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);

  const loadConversations = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        console.log('No token found for conversations');
        return;
      }

      console.log('Loading conversations...');
      const response = await fetch('http://localhost:8000/api/chat/admin/conversations', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Conversations response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Conversations data:', data);
        setConversations(data);
        setFilteredConversations(data);
      } else {
        console.error('Failed to load conversations:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        console.log('No token found');
        return;
      }

      console.log('Loading messages for conversation:', conversationId);
      const response = await fetch(`http://localhost:8000/api/chat/admin/conversations/${conversationId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Messages response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Messages data:', data);
        const formattedMessages: Message[] = data.map((msg: any) => ({
          id: msg.id.toString(),
          text: msg.message,
          sender: msg.sender_type === 'user' ? 'user' : 'admin',
          timestamp: new Date(msg.created_at),
          senderName: msg.sender_name
        }));
        // Sortiere chronologisch - älteste zuerst für normale Chat-Anzeige
        setMessages(formattedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
        console.log('Formatted messages:', formattedMessages.length);
      } else {
        console.error('Failed to load messages:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendReply = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch('http://localhost:8000/api/chat/admin/reply', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newMessage.trim(),
          conversation_id: selectedConversation.id
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        const newMsg: Message = {
          id: responseData.id.toString(),
          text: newMessage.trim(),
          sender: 'admin',
          timestamp: new Date(),
          senderName: responseData.sender_name
        };
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        
        // Reload conversations to update unread counts
        loadConversations();
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      Alert.alert('Fehler', 'Antwort konnte nicht gesendet werden');
    }
  };

  const openChat = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setChatModalVisible(true);
    loadMessages(conversation.id);
    
    // Markiere Gespräch als gelesen wenn es ungelesene Nachrichten hat
    if (conversation.unread_count > 0) {
      // Update UI immediately before making API call
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.id === conversation.id 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
      setFilteredConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.id === conversation.id 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
      markAsRead(conversation.id);
    }
  };

  const closeChat = () => {
    setChatModalVisible(false);
    setSelectedConversation(null);
    setMessages([]);
    setNewMessage('');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'normal': return '#10B981';
      case 'low': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'closed': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const markAsRead = async (conversationId: string) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`http://localhost:8000/api/chat/admin/conversations/${conversationId}/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Update conversations immediately to reflect the change
        setConversations(prevConversations => 
          prevConversations.map(conv => 
            conv.id === conversationId 
              ? { ...conv, unread_count: 0 }
              : conv
          )
        );
        setFilteredConversations(prevConversations => 
          prevConversations.map(conv => 
            conv.id === conversationId 
              ? { ...conv, unread_count: 0 }
              : conv
          )
        );
        // Also reload to get fresh data from server
        loadConversations();
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    Alert.alert(
      'Gespräch löschen',
      'Möchten Sie dieses Gespräch wirklich löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('access_token');
              if (!token) return;

              const response = await fetch(`http://localhost:8000/api/chat/admin/conversations/${conversationId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (response.ok) {
                loadConversations();
                Alert.alert('Erfolg', 'Gespräch wurde gelöscht');
              }
            } catch (error) {
              console.error('Error deleting conversation:', error);
              Alert.alert('Fehler', 'Gespräch konnte nicht gelöscht werden');
            }
          }
        }
      ]
    );
  };

  const renderLeftActions = (conversationId: string) => {
    return (
      <View style={styles.leftAction}>
        <TouchableOpacity
          style={styles.markReadButton}
          onPress={() => markAsRead(conversationId)}
        >
          <Ionicons name="checkmark-circle" size={20} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderRightActions = (conversationId: string) => {
    return (
      <View style={styles.rightAction}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteConversation(conversationId)}
        >
          <Ionicons name="trash-outline" size={20} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  const statsData = [
    { 
      title: 'Ungelesene', 
      value: conversations.filter(c => c.unread_count > 0).length.toString(), 
      gradient: ['#ff9500', '#ff6b35'],
      icon: 'chatbubbles',
      subtitle: 'Neue Nachrichten'
    },
    { 
      title: 'Gesamt', 
      value: conversations.length.toString(), 
      gradient: ['#007aff', '#5856d6'],
      icon: 'chatbubbles-outline',
      subtitle: 'Alle Gespräche'
    }
  ];

  return (
    <GestureHandlerRootView style={styles.container}>
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
            <Text style={styles.welcomeTitle}>Support Chat</Text>
            <Text style={styles.welcomeSubtitle}>Verwalten Sie alle Support-Anfragen</Text>
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

          {/* Action Buttons */}
          <View style={styles.actionButtonsCard}>
            <TouchableOpacity style={styles.composeButton} onPress={loadConversations}>
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.composeButtonText}>Aktualisieren</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchCard}>
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Nach Benutzer oder Betreff suchen..."
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

          {/* Conversations List */}
          <View style={styles.messagesSection}>
            <View style={styles.messagesSectionHeader}>
              <Text style={styles.messagesTitle}>
                {searchQuery ? 'Suchergebnisse' : 'Support-Gespräche'}
              </Text>
              <Text style={styles.messagesCount}>
                {filteredConversations.length} {searchQuery ? 'gefunden' : 'Gespräche'}
              </Text>
            </View>
            
            {filteredConversations.length === 0 && searchQuery ? (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search" size={48} color="#C7C7CC" />
                <Text style={styles.noResultsTitle}>Keine Gespräche gefunden</Text>
                <Text style={styles.noResultsSubtitle}>
                  Versuchen Sie einen anderen Suchbegriff
                </Text>
              </View>
            ) : filteredConversations.length === 0 ? (
              <View style={styles.noResultsContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color="#9CA3AF" />
                <Text style={styles.noResultsTitle}>Keine Support-Anfragen vorhanden</Text>
                <Text style={styles.noResultsSubtitle}>
                  Alle neuen Nachrichten werden hier erscheinen
                </Text>
              </View>
            ) : (
              filteredConversations.map((conversation) => (
                <Swipeable
                  key={conversation.id}
                  renderLeftActions={() => renderLeftActions(conversation.id)}
                  renderRightActions={() => renderRightActions(conversation.id)}
                  leftThreshold={40}
                  rightThreshold={40}
                  friction={2}
                  overshootLeft={false}
                  overshootRight={false}
                >
                  <TouchableOpacity 
                    style={styles.messageCard} 
                    onPress={() => openChat(conversation)}
                  >
                    <View style={styles.messageContent}>
                      <View style={styles.messageLeft}>
                        {/* Avatar */}
                        <View style={styles.messageAvatar}>
                          <Text style={styles.avatarText}>
                            {conversation.user_name.charAt(0)}
                          </Text>
                        </View>
                        
                        {/* Conversation Info */}
                        <View style={styles.messageInfo}>
                          <View style={styles.messageHeader}>
                            <Text style={[styles.messageSender, conversation.unread_count > 0 && styles.unreadText]}>
                              {conversation.user_name}
                            </Text>
                            <View style={styles.badges}>
                              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(conversation.priority) }]}>
                                <Text style={styles.badgeText}>{conversation.priority}</Text>
                              </View>
                              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(conversation.status) }]}>
                                <Text style={styles.badgeText}>{conversation.status}</Text>
                              </View>
                            </View>
                          </View>
                          <Text style={[styles.messageSubject, conversation.unread_count > 0 && styles.unreadText]} numberOfLines={1}>
                            {conversation.subject}
                          </Text>
                          {conversation.last_message && (
                            <Text style={styles.messagePreview} numberOfLines={2}>
                              {conversation.last_message}
                            </Text>
                          )}
                          <Text style={styles.messageTimestamp}>
                            {new Date(conversation.last_message_at).toLocaleString('de-DE')}
                          </Text>
                        </View>
                      </View>

                      {/* Conversation Actions */}
                      <View style={styles.messageRight}>
                        {conversation.unread_count > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{conversation.unread_count}</Text>
                          </View>
                        )}
                        <Ionicons name="chevron-forward" size={20} color="#c7c7cc" />
                      </View>
                    </View>
                  </TouchableOpacity>
                </Swipeable>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      {/* Chat Modal */}
      <Portal>
        <Modal
          visible={chatModalVisible}
          onDismiss={closeChat}
          contentContainerStyle={styles.chatModalContainer}
        >
          <View style={styles.chatModalContent}>
            {/* Header */}
            <View style={styles.chatModalHeader}>
              <View>
                <Text style={styles.chatModalTitle}>
                  {selectedConversation?.user_name}
                </Text>
                <Text style={styles.chatModalSubtitle}>
                  {selectedConversation?.subject}
                </Text>
              </View>
              <TouchableOpacity onPress={closeChat} style={styles.chatCloseButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <View style={styles.messagesContainer}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Lade Nachrichten...</Text>
                </View>
              ) : (
                <FlatList
                  data={messages}
                  keyExtractor={(item) => item.id}
                  style={styles.messagesList}
                  inverted={false}
                  renderItem={({ item }) => (
                    <View style={[
                      styles.messageItem,
                      item.sender === 'admin' ? styles.adminMessage : styles.userMessage
                    ]}>
                      <View style={[
                        styles.messageBubble,
                        item.sender === 'admin' ? styles.adminBubble : styles.userBubble
                      ]}>
                        <Text style={[
                          styles.messageText,
                          item.sender === 'admin' ? styles.adminMessageText : styles.userMessageText
                        ]}>
                          {item.text}
                        </Text>
                        <Text style={[
                          styles.messageTime,
                          item.sender === 'admin' ? styles.adminMessageTime : styles.userMessageTime
                        ]}>
                          {item.timestamp.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <Text style={styles.senderName}>
                        {item.senderName}
                      </Text>
                    </View>
                  )}
                />
              )}
            </View>

            {/* Reply Input */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.replyContainer}
            >
              <View style={styles.replyInputContainer}>
                <TextInput
                  style={styles.replyInput}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder="Ihre Antwort..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
                  onPress={sendReply}
                  disabled={!newMessage.trim()}
                >
                  <Ionicons 
                    name="send" 
                    size={20} 
                    color={newMessage.trim() ? "#FFFFFF" : "#9CA3AF"} 
                  />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </Portal>
    </GestureHandlerRootView>
  );
}

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

  // Action Buttons
  actionButtonsCard: {
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
  composeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007aff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  composeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Badges
  badges: {
    flexDirection: 'row',
    gap: 4,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
    textTransform: 'capitalize',
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

  // Messages Section
  messagesSection: {
    marginBottom: 24,
  },
  messagesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  messagesTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  messagesCount: {
    fontSize: 16,
    color: '#86868b',
    fontWeight: '500',
  },

  // Message Card
  messageCard: {
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
  messageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  messageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  messageAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  messageInfo: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageSender: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d1d1f',
    marginRight: 8,
  },
  unreadText: {
    fontWeight: '700',
    color: '#000000',
  },
  unreadBadge: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  messageSubject: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1d1d1f',
    marginBottom: 4,
  },
  messagePreview: {
    fontSize: 14,
    color: '#86868b',
    marginBottom: 8,
    lineHeight: 18,
  },
  messageTimestamp: {
    fontSize: 13,
    color: '#c7c7cc',
  },
  messageRight: {
    padding: 4,
  },

  // Chat Modal Styles
  chatModalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    height: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  chatModalContent: {
    flex: 1,
  },
  chatModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  chatModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  chatModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  chatCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  messagesList: {
    flex: 1,
  },
  messageItem: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-start',
  },
  adminMessage: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
  },
  userBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  adminBubble: {
    backgroundColor: '#667eea',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 4,
  },
  userMessageText: {
    color: '#1F2937',
  },
  adminMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 12,
  },
  userMessageTime: {
    color: '#6B7280',
  },
  adminMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  senderName: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginHorizontal: 12,
  },
  replyContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
  },
  replyInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  replyInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: '#667eea',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },

  // Swipe Actions - iOS Style
  leftAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    backgroundColor: '#10B981',
    paddingRight: 20,
  },
  rightAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: '#EF4444',
    paddingLeft: 20,
  },
  markReadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});