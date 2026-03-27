import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Colors from '../constants/colors';
import { showErrorAlert, showSuccessAlert } from '../utils/alertUtils';
import { Logger } from '../utils/logger';
import { getAuthErrorMessage } from '../utils/authErrorMessage';
import type { ForgotPasswordScreenProps } from '../types/navigation';

const ForgotPasswordScreen = ({ navigation }: ForgotPasswordScreenProps) => {
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const { requestPasswordReset } = useAuth();
  const theme = darkMode ? Colors.dark : Colors.light;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetRequest = async () => {
    if (!email.trim()) {
      showErrorAlert(t('auth.fillRequiredFields'));
      return;
    }

    try {
      setLoading(true);
      const { error } = await requestPasswordReset(email.trim());

      if (error) {
        showErrorAlert(getAuthErrorMessage(error.message, t, 'reset-request'));
        return;
      }

      showSuccessAlert(t('auth.resetPasswordSent'), () => navigation.navigate('Login'));
    } catch (error) {
      Logger.error('Ошибка запроса восстановления пароля:', error);
      showErrorAlert(getAuthErrorMessage(null, t, 'reset-request'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.headerText }]}>{t('auth.resetPassword')}</Text>
      <Text style={[styles.description, { color: theme.secondary }]}>{t('auth.resetPasswordHelp')}</Text>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.text }]}>{t('auth.email')}</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          value={email}
          onChangeText={setEmail}
          placeholder={t('auth.enterEmail')}
          placeholderTextColor={theme.secondary}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={handleResetRequest}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>{t('auth.sendResetLink')}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={[styles.backLink, { color: theme.primary }]}>{t('auth.backToLogin')}</Text>
      </TouchableOpacity>
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
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
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
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backLink: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;
