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
import type { ResetPasswordScreenProps } from '../types/navigation';

const ResetPasswordScreen = ({ navigation }: ResetPasswordScreenProps) => {
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const { updatePassword } = useAuth();
  const theme = darkMode ? Colors.dark : Colors.light;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordUpdate = async () => {
    if (!password || !confirmPassword) {
      showErrorAlert(t('auth.fillRequiredFields'));
      return;
    }

    if (password.length < 6) {
      showErrorAlert(t('auth.passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      showErrorAlert(t('auth.passwordsDoNotMatch'));
      return;
    }

    try {
      setLoading(true);
      const { error } = await updatePassword(password);

      if (error) {
        showErrorAlert(error.message || t('auth.passwordUpdateError'));
        return;
      }

      showSuccessAlert(t('auth.passwordUpdated'), () => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      });
    } catch (error) {
      Logger.error('Ошибка обновления пароля:', error);
      showErrorAlert(t('auth.passwordUpdateError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.headerText }]}>{t('auth.setNewPassword')}</Text>
      <Text style={[styles.description, { color: theme.secondary }]}>{t('auth.setNewPasswordHelp')}</Text>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.text }]}>{t('auth.newPassword')}</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          value={password}
          onChangeText={setPassword}
          placeholder={t('auth.enterPassword')}
          placeholderTextColor={theme.secondary}
          secureTextEntry
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.text }]}>{t('auth.confirmPassword')}</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={t('auth.confirmPasswordPlaceholder')}
          placeholderTextColor={theme.secondary}
          secureTextEntry
        />
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={handlePasswordUpdate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>{t('auth.saveNewPassword')}</Text>
        )}
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
});

export default ResetPasswordScreen;
