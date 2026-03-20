import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Logger } from '../utils/logger';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { showErrorAlert, showSuccessAlert } from '../utils/alertUtils';

const RegisterScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      showErrorAlert(t('auth.fillRequiredFields'));
      return;
    }

    if (password !== confirmPassword) {
      showErrorAlert(t('auth.passwordsDoNotMatch'));
      return;
    }

    setLoading(true);

    try {
      const { user, session, error: authError } = await register(email, password);

      if (authError) throw authError;

      if (user) {
        // Проверка статуса подтверждения email
        if (user.identities && user.identities.length === 0) {
          // Уже существует пользователь с таким email
          showErrorAlert(t('auth.emailAlreadyExists'));
          return;
        }
        
        if (session === null) {
          // Email требует подтверждения
          showSuccessAlert(t('auth.confirmEmailSent'));
          navigation.navigate('Login');
          return;
        }

        await login(email, password);
        showSuccessAlert(t('auth.registerSuccess'));
        navigation.navigate('Home');
      }
    } catch (error: unknown) {
      Logger.error('Ошибка регистрации:', error);
      // Показываем более конкретную ошибку, если она доступна
      if (error instanceof Error && error.message) {
        showErrorAlert(`${t('auth.registerFailed')}: ${error.message}`);
      } else {
        showErrorAlert(t('auth.registerFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>{t('auth.register')}</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('auth.email')}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.enterEmail')}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('auth.password')}</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.enterPassword')}
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.register')}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.linkContainer}>
            <Text style={styles.linkText}>{t('auth.alreadyHaveAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>{t('auth.login')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  formContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#1E3A8A',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#4B5563',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#1E3A8A',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  linkText: {
    color: '#6B7280',
  },
  link: {
    color: '#1E3A8A',
    fontWeight: 'bold',
  },
});

export default RegisterScreen;
