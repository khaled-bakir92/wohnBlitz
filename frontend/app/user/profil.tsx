import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  Surface,
  Avatar,
  Modal,
  Portal,
  Button,
} from 'react-native-paper';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ProfileService, BewerbungsprofilData } from '@/user/profileService';
import WohnBlitzHeader from '@/user/WohnBlitzHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'admin';
  timestamp: Date;
  senderName?: string;
}

export default function ProfilScreen() {
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('Max Mustermann');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [supportModalVisible, setSupportModalVisible] =
    useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadSupportMessages = async () => {
    setIsLoadingMessages(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      // First get conversations
      const conversationsResponse = await fetch(
        `${API_BASE_URL}/api/chat/conversations`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (conversationsResponse.ok) {
        const conversations = await conversationsResponse.json();

        if (conversations.length > 0) {
          // Get messages from the most recent conversation
          const latestConversation = conversations[0];
          const messagesResponse = await fetch(
            `${API_BASE_URL}/api/chat/conversations/${latestConversation.id}/messages`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (messagesResponse.ok) {
            const data = await messagesResponse.json();
            const formattedMessages: Message[] = data.map((msg: any) => ({
              id: msg.id.toString(),
              text: msg.message,
              sender: msg.sender_type === 'user' ? 'user' : 'admin',
              timestamp: new Date(msg.created_at),
              senderName: msg.sender_name,
            }));
            // Sort messages chronologically (oldest first) for normal chat display
            const sortedMessages = formattedMessages.sort(
              (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
            );
            setMessages(sortedMessages);
          }
        }
      }
    } catch (error) {
      console.error('Error loading support messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const sendSupportMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/chat/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newMessage.trim(),
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        const newMsg: Message = {
          id: responseData.id.toString(),
          text: newMessage.trim(),
          sender: 'user',
          timestamp: new Date(),
          senderName: userName,
        };
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending support message:', error);
      Alert.alert('Fehler', 'Nachricht konnte nicht gesendet werden');
    }
  };

  const openSupportChat = () => {
    setSupportModalVisible(true);
    loadSupportMessages();
  };

  const loadUserData = async () => {
    try {
      setIsLoading(true);

      // Get user email from storage
      const email = await ProfileService.getUserEmail();
      if (email) {
        setUserEmail(email);
      }

      // Try to get profile data to get the full name
      const profileData = await ProfileService.getBewerbungsprofil();
      if (profileData?.vorname && profileData?.name) {
        setUserName(`${profileData.vorname} ${profileData.name}`);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserEmail('Keine Email verfügbar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Abmelden', 'Möchten Sie sich wirklich abmelden?', [
      {
        text: 'Abbrechen',
        style: 'cancel',
      },
      {
        text: 'Abmelden',
        style: 'destructive',
        onPress: async () => {
          try {
            await ProfileService.logout();
            router.replace('/login');
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Fehler', 'Beim Abmelden ist ein Fehler aufgetreten.');
          }
        },
      },
    ]);
  };

  const menuItems = [
    {
      id: 1,
      title: 'Datenschutz',
      icon: 'shield',
      iconColor: '#6b7280',
      onPress: () => console.log('Datenschutz pressed'),
    },
    {
      id: 2,
      title: 'Kontakt Support',
      icon: 'chat',
      iconColor: '#6b7280',
      onPress: openSupportChat,
    },
    {
      id: 3,
      title: 'Logout',
      icon: 'logout',
      iconColor: '#ef4444',
      onPress: handleLogout,
    },
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
          {/* User Profile Header */}
          <Surface
            style={[styles.profileHeader, { backgroundColor: 'white' }]}
            elevation={1}
          >
            <View style={styles.profileInfo}>
              <View style={styles.avatarContainer}>
                <Avatar.Icon
                  size={64}
                  icon="account"
                  style={styles.avatar}
                  color="#3b82f6"
                />
              </View>

              <View style={styles.userInfo}>
                <Text variant="titleLarge" style={styles.userName}>
                  {userName}
                </Text>
                <Text variant="bodyMedium" style={styles.userEmail}>
                  {userEmail || 'Keine Email verfügbar'}
                </Text>
              </View>
            </View>
          </Surface>

          {/* Einstellungen Section */}
          <View style={styles.settingsSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Einstellungen
            </Text>

            <Surface
              style={[styles.menuContainer, { backgroundColor: 'white' }]}
              elevation={1}
            >
              {menuItems.map((item, index) => (
                <View key={item.id}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={item.onPress}
                  >
                    <View style={styles.menuItemLeft}>
                      <View style={styles.iconContainer}>
                        <MaterialIcons
                          name={item.icon}
                          size={20}
                          color={item.iconColor}
                        />
                      </View>

                      <Text
                        variant="bodyLarge"
                        style={[styles.menuItemText, { color: item.iconColor }]}
                      >
                        {item.title}
                      </Text>
                    </View>

                    <MaterialIcons
                      name="chevron-right"
                      size={24}
                      color="#d1d5db"
                    />
                  </TouchableOpacity>

                  {index < menuItems.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              ))}
            </Surface>
          </View>
        </ScrollView>
      </View>

      {/* Support Chat Modal */}
      <Portal>
        <Modal
          visible={supportModalVisible}
          onDismiss={() => setSupportModalVisible(false)}
          contentContainerStyle={styles.supportModalContainer}
        >
          <View style={styles.supportModalContent}>
            {/* Header */}
            <View style={styles.supportModalHeader}>
              <Text style={styles.supportModalTitle}>Support Chat</Text>
              <TouchableOpacity
                onPress={() => setSupportModalVisible(false)}
                style={styles.supportCloseButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Messages List */}
            <View style={styles.messagesContainer}>
              {isLoadingMessages ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Lade Nachrichten...</Text>
                </View>
              ) : messages.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons
                    name="chatbubbles-outline"
                    size={48}
                    color="#9CA3AF"
                  />
                  <Text style={styles.emptyText}>Noch keine Nachrichten</Text>
                  <Text style={styles.emptySubtext}>
                    Stellen Sie Ihre erste Frage an unser Support-Team
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={messages}
                  keyExtractor={item => item.id}
                  style={styles.messagesList}
                  inverted={false}
                  renderItem={({ item }) => (
                    <View
                      style={[
                        styles.messageItem,
                        item.sender === 'user'
                          ? styles.userMessage
                          : styles.adminMessage,
                      ]}
                    >
                      <View
                        style={[
                          styles.messageBubble,
                          item.sender === 'user'
                            ? styles.userBubble
                            : styles.adminBubble,
                        ]}
                      >
                        <Text
                          style={[
                            styles.messageText,
                            item.sender === 'user'
                              ? styles.userMessageText
                              : styles.adminMessageText,
                          ]}
                        >
                          {item.text}
                        </Text>
                        <Text
                          style={[
                            styles.messageTime,
                            item.sender === 'user'
                              ? styles.userMessageTime
                              : styles.adminMessageTime,
                          ]}
                        >
                          {item.timestamp.toLocaleTimeString('de-DE', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                      {item.sender === 'admin' && (
                        <Text style={styles.senderName}>
                          {item.senderName || 'Support Team'}
                        </Text>
                      )}
                    </View>
                  )}
                />
              )}
            </View>

            {/* Message Input */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.inputContainer}
            >
              <View style={styles.messageInputContainer}>
                <TextInput
                  style={styles.messageInput}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder="Ihre Nachricht..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    !newMessage.trim() && styles.sendButtonDisabled,
                  ]}
                  onPress={sendSupportMessage}
                  disabled={!newMessage.trim()}
                >
                  <Ionicons
                    name="send"
                    size={20}
                    color={newMessage.trim() ? '#FFFFFF' : '#9CA3AF'}
                  />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </Portal>
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
    paddingBottom: 100,
  },
  profileHeader: {
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    backgroundColor: '#dbeafe',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#1f2937',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    color: '#6b7280',
  },
  settingsSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: '#1f2937',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  menuContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 56, // Align with text
  },

  // Support Modal Styles
  supportModalContainer: {
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
  supportModalContent: {
    flex: 1,
  },
  supportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  supportModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  supportCloseButton: {
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  messagesList: {
    flex: 1,
  },
  messageItem: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  adminMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
  },
  userBubble: {
    backgroundColor: '#667eea',
    borderBottomRightRadius: 4,
  },
  adminBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 4,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  adminMessageText: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 12,
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  adminMessageTime: {
    color: '#6B7280',
  },
  senderName: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginLeft: 12,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  messageInput: {
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
});
