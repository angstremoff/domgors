import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { showErrorAlert, showAlert } from '../utils/alertUtils';
import { useTheme } from '../contexts/ThemeContext';
import Colors from '../constants/colors';
import { Logger } from '../utils/logger';

const LoginScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { darkMode } = useTheme();
  const theme = darkMode ? Colors.dark : Colors.light;

  const handleLogin = async () => {
    if (!email || !password) {
      showErrorAlert(t('auth.fillRequiredFields'));
      return;
    }

    try {
      setLoading(true);
      const { error } = await login(email, password);
      
      if (error) {
        Logger.debug('Ошибка входа:', error.message);
        showErrorAlert(error.message || t('auth.loginFailed'));
        return;
      }
      
      // Успешный вход, переходим на главную
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (error: any) {
      Logger.error('Непредвиденная ошибка:', error);
      showErrorAlert(t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.headerText }]}>{t('auth.login')}</Text>
      
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.text }]}>{t('auth.email')}</Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
            color: theme.text
          }]}
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          placeholderTextColor={theme.secondary}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.text }]}>{t('auth.password')}</Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
            color: theme.text
          }]}
          value={password}
          onChangeText={setPassword}
          placeholder="********"
          placeholderTextColor={theme.secondary}
          secureTextEntry
        />
      </View>

      <TouchableOpacity
        style={styles.forgotPassword}
        onPress={() => showAlert(t('auth.info'), t('auth.resetPasswordInstructions'))}
      >
        <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>{t('auth.forgotPassword')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>{t('auth.login')}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.signupContainer}>
        <Text style={[styles.signupText, { color: theme.secondary }]}>{t('auth.noAccount')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={[styles.signupLink, { color: theme.primary }]}>{t('auth.createAccount')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  signupText: {
    fontSize: 14,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;
