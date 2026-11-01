import api from '../../../src/services/api';
import { createChatSession, chatRequestHistory } from '../../../src/utils/chatSession';
import { auth } from '../../../firebase';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Keyboard,
  LayoutAnimation,
  UIManager
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Send, User, Sparkles, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Markdown from 'react-native-markdown-display';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeColors, spacing, borderRadius, typography, shadows } from '../../../src/theme/theme';
import useAppStore from '../../../src/store/useAppStore';
import { Alert } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AskAIScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const user = useAppStore((state) => state.user);
  
  const initialMessages = useMemo(() => [
    { id: 'welcome', role: 'assistant', text: 'Hello! I am HyGrow AI. Ask me about hydroponics and crop care. I do not have access to live sensors or weather.' }
  ], []);
  const [{ messages, ready }, setChat] = useState({ messages: initialMessages, ready: false });
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef(null);
  const session = useMemo(() => createChatSession(AsyncStorage, setChat, initialMessages), [initialMessages]);

  useEffect(() => {
    setInputText('');
    setIsLoading(false);
    session.switchUser(user?.id || null);
    return () => { session.switchUser(null); };
  }, [session, user?.id]);

  const handleClearChats = () => {
    const clear = () => { session.clear(); setIsLoading(false); };
    if (Platform.OS === 'web') {
      if (window.confirm('Delete all your chat history?')) clear();
      return;
    }
    Alert.alert('Clear Chats', 'Delete all your chat history?', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: clear }
    ]);
  };

  const handleSend = async () => {
    if (!inputText.trim() || inputText.trim().length > 4000 || isLoading || !ready || !user || auth.currentUser?.uid !== user.id) return;
    const uid = user.id;
    const request = session.token();
    const userMessage = { id: `${Date.now()}-user`, role: 'user', text: inputText.trim() };
    if (!session.append(request, userMessage)) return;
    setInputText('');
    Keyboard.dismiss();
    setIsLoading(true);
    try {
      const history = chatRequestHistory(messages);
      const result = await api.post('/api/chat', { message: userMessage.text, history });
      if (auth.currentUser?.uid === uid) session.append(request, {
        id: `${Date.now()}-assistant`, role: 'assistant', text: result.reply
      });
    } catch (error) {
      if (auth.currentUser?.uid === uid) session.append(request, {
        id: `${Date.now()}-error`, role: 'assistant', text: 'The assistant is unavailable. Please try again later.'
      });
    } finally {
      if (request === session.token()) setIsLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    
    if (isUser) {
      return (
        <View style={[styles.messageBubble, styles.userBubble]}>
          <LinearGradient
            colors={['#8B5CF6', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.messageContent, styles.userMessageContent]}
          >
            <Text style={styles.userMessageText}>{item.text}</Text>
          </LinearGradient>
          <View style={[styles.avatar, styles.userAvatar]}>
            <User color="#fff" size={14} />
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.messageBubble, styles.aiBubble]}>
        <View style={[styles.avatar, styles.aiAvatar]}>
          <Sparkles color="#fff" size={14} />
        </View>
        <View style={[styles.messageContent, styles.aiMessageContent]}>
          <Markdown 
            style={markdownStyles(themeColors)}
            mergeStyle={true}
          >
            {item.text}
          </Markdown>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={themeColors.text} size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>HyGrow AI</Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{ready ? 'Ready' : 'Sign in required'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleClearChats} style={styles.backButton}>
          <Trash2 color="#EF4444" size={22} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={() => 
          isLoading ? (
            <View style={styles.typingIndicatorContainer}>
              <View style={[styles.avatar, styles.aiAvatar, { marginRight: 8 }]}>
                 <Sparkles color="#fff" size={14} />
              </View>
              <View style={[styles.messageContent, styles.aiMessageContent, styles.typingBubble]}>
                <ActivityIndicator size="small" color={themeColors.primary} />
              </View>
            </View>
          ) : null
        }
      />

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask anything about your farm..."
            placeholderTextColor={themeColors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
            onKeyPress={(e) => {
              if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <Send color={(!inputText.trim() || isLoading) ? themeColors.textMuted : "#fff"} size={18} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// Markdown Styles specifically generated for react-native-markdown-display
const markdownStyles = (theme) => ({
  body: {
    ...typography.body,
    color: theme.text,
    lineHeight: 24,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: spacing.sm,
  },
  heading1: {
    ...typography.h3,
    color: theme.text,
    marginBottom: spacing.xs,
  },
  heading2: {
    ...typography.h4,
    color: theme.text,
    marginBottom: spacing.xs,
  },
  heading3: {
    ...typography.h4,
    color: theme.text,
    marginBottom: spacing.xs,
  },
  strong: {
    fontWeight: '700',
    color: theme.text,
  },
  em: {
    fontStyle: 'italic',
  },
  blockquote: {
    backgroundColor: theme.background,
    borderLeftWidth: 4,
    borderLeftColor: theme.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
    borderRadius: 4,
  },
  code_inline: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: theme.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    color: theme.primary,
  },
  code_block: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: theme.background,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
    color: theme.text,
  },
  fence: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#1E1E1E',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
    color: '#D4D4D4',
  },
  list_item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bullet_list_icon: {
    marginRight: 8,
    marginTop: 4,
    fontSize: 16,
    color: theme.primary,
  },
  ordered_list_icon: {
    marginRight: 8,
    marginTop: 0,
    fontSize: 16,
    fontWeight: '600',
    color: theme.primary,
  }
});

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: spacing.md,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    ...shadows.sm,
    zIndex: 10,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: theme.text,
    marginBottom: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98115',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
    textTransform: 'uppercase',
  },
  chatContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    maxWidth: '100%',
    alignItems: 'flex-end',
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  aiBubble: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    ...shadows.sm,
  },
  userAvatar: {
    backgroundColor: theme.textSecondary,
    marginLeft: 8,
  },
  aiAvatar: {
    backgroundColor: '#3B82F6',
    marginRight: 8,
  },
  messageContent: {
    maxWidth: '80%',
    padding: spacing.md,
    borderRadius: 20,
    ...shadows.sm,
  },
  userMessageContent: {
    borderBottomRightRadius: 4,
  },
  aiMessageContent: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderBottomLeftRadius: 4,
  },
  userMessageText: {
    ...typography.body,
    color: '#fff',
    lineHeight: 22,
  },
  typingIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.lg,
  },
  typingBubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
    backgroundColor: theme.background,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.card,
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.border,
    ...shadows.sm,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    color: theme.text,
    ...typography.body,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  sendButtonDisabled: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    elevation: 0,
    shadowOpacity: 0,
  }
});
