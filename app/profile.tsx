import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthService, User } from './src/services/AuthService';

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  const authService = AuthService.getInstance();
  
  useEffect(() => {
    loadUser();
  }, []);
  
  const loadUser = async () => {
    setLoading(true);
    try {
      const userData = await authService.getUser();
      setUser(userData);
      if (userData) {
        setName(userData.name || '');
        setEmail(userData.email || '');
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    
    setLoading(true);
    try {
      const userData = await authService.loginWithEmail(email, password);
      setUser(userData);
      setPassword(''); // Clear password for security
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setEmail('');
      setPassword('');
      setName('');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdate = async () => {
    if (user) {
      setLoading(true);
      try {
        const updatedUser = {...user, name};
        await authService.saveUser(updatedUser);
        setUser(updatedUser);
        setIsEditing(false);
      } catch (error) {
        console.error('Update error:', error);
      } finally {
        setLoading(false);
      }
    }
  };
  
  const handleConnectAI = async (provider: string) => {
    setLoading(true);
    try {
      const success = await authService.connectToAIService(provider);
      if (success) {
        await loadUser();
        Alert.alert('Success', `Connected to ${provider}`);
      } else {
        Alert.alert('Error', 'Failed to connect to AI service');
      }
    } catch (error) {
      console.error('AI connection error:', error);
      Alert.alert('Error', 'Failed to connect to AI service');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDisconnectAI = async () => {
    setLoading(true);
    try {
      const success = await authService.disconnectAIService();
      if (success) {
        await loadUser();
        Alert.alert('Success', 'Disconnected from AI service');
      } else {
        Alert.alert('Error', 'Failed to disconnect from AI service');
      }
    } catch (error) {
      console.error('AI disconnect error:', error);
      Alert.alert('Error', 'Failed to disconnect from AI service');
    } finally {
      setLoading(false);
    }
  };
  
  // Login form
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.formContainer}
        >
          <Text style={styles.titleText}>Account Login</Text>
          <Text style={styles.subtitleText}>Sign in to enhance your legislative experience</Text>
          
          <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Sign In / Sign Up</Text>
            )}
          </TouchableOpacity>
          
          <Text style={styles.infoText}>
            This is a demo application. Any email/password combination will work.
          </Text>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }
  
  // Profile view
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.profileInfo}>
            {isEditing ? (
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="Your Name"
              />
            ) : (
              <Text style={styles.nameText}>{name || user.email.split('@')[0]}</Text>
            )}
            <Text style={styles.emailText}>{user.email}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => isEditing ? handleUpdate() : setIsEditing(true)}
          >
            <MaterialIcons 
              name={isEditing ? "check" : "edit"} 
              size={20} 
              color="#333" 
            />
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Bills</Text>
          <TouchableOpacity style={styles.sectionButton}>
            <Text style={styles.sectionButtonText}>View My Bills</Text>
            <MaterialIcons name="chevron-right" size={20} color="#b22234" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Service Integration</Text>
          <Text style={styles.sectionDescription}>
            Connect your AI services to enhance your experience with bill analysis, summarization and more.
          </Text>
          
          <View style={styles.aiServiceItem}>
            <View style={styles.aiServiceInfo}>
              <MaterialIcons name="smart-toy" size={24} color="#333" />
              <View style={styles.aiServiceTexts}>
                <Text style={styles.aiServiceName}>ChatGPT</Text>
                <Text style={styles.aiServiceStatus}>
                  {user.aiServiceConnected && user.aiServiceInfo?.provider === 'chatgpt' 
                    ? 'Connected' 
                    : 'Not connected'}
                </Text>
              </View>
            </View>
            
            {user.aiServiceConnected && user.aiServiceInfo?.provider === 'chatgpt' ? (
              <TouchableOpacity 
                style={[styles.aiButton, styles.aiButtonDisconnect]}
                onPress={handleDisconnectAI}
              >
                <Text style={styles.aiButtonText}>Disconnect</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.aiButton}
                onPress={() => handleConnectAI('chatgpt')}
              >
                <Text style={styles.aiButtonText}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.aiServiceItem}>
            <View style={styles.aiServiceInfo}>
              <MaterialIcons name="auto-awesome" size={24} color="#333" />
              <View style={styles.aiServiceTexts}>
                <Text style={styles.aiServiceName}>Claude AI</Text>
                <Text style={styles.aiServiceStatus}>
                  {user.aiServiceConnected && user.aiServiceInfo?.provider === 'claude' 
                    ? 'Connected' 
                    : 'Not connected'}
                </Text>
              </View>
            </View>
            
            {user.aiServiceConnected && user.aiServiceInfo?.provider === 'claude' ? (
              <TouchableOpacity 
                style={[styles.aiButton, styles.aiButtonDisconnect]}
                onPress={handleDisconnectAI}
              >
                <Text style={styles.aiButtonText}>Disconnect</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.aiButton}
                onPress={() => handleConnectAI('claude')}
              >
                <Text style={styles.aiButtonText}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <MaterialIcons name="logout" size={20} color="#fff" />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  scrollContent: {
    padding: 20,
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#b22234',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    fontSize: 14,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#b22234',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 16,
    color: '#666',
  },
  nameInput: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#b22234',
    paddingBottom: 4,
    marginBottom: 4,
  },
  editButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    backgroundColor: '#f9f9f9',
  },
  section: {
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#faf8f6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  sectionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  sectionButtonText: {
    fontSize: 16,
    color: '#333',
  },
  aiServiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  aiServiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiServiceTexts: {
    marginLeft: 12,
  },
  aiServiceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  aiServiceStatus: {
    fontSize: 14,
    color: '#666',
  },
  aiButton: {
    backgroundColor: '#b22234',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  aiButtonDisconnect: {
    backgroundColor: '#666',
  },
  aiButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#b22234',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
}); 