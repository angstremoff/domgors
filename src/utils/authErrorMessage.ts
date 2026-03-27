type AuthErrorContext = 'login' | 'register' | 'reset-request' | 'password-update' | 'auth-link';

type TranslateFn = (key: string) => string;

export function getAuthErrorMessage(
  rawMessage: string | null | undefined,
  t: TranslateFn,
  context: AuthErrorContext
) {
  const normalizedMessage = rawMessage?.trim().toLowerCase() ?? '';

  if (!normalizedMessage) {
    return fallbackMessage(t, context);
  }

  if (normalizedMessage.includes('invalid login credentials')) {
    return t('auth.loginFailed');
  }

  if (
    normalizedMessage.includes('user already registered')
    || normalizedMessage.includes('already registered')
    || normalizedMessage.includes('email address not authorized')
  ) {
    return t('auth.emailAlreadyExists');
  }

  if (
    normalizedMessage.includes('link is invalid')
    || normalizedMessage.includes('has expired')
    || normalizedMessage.includes('token has expired')
    || normalizedMessage.includes('otp expired')
    || normalizedMessage.includes('otp has expired')
  ) {
    return t('auth.invalidAuthLink');
  }

  return fallbackMessage(t, context);
}

function fallbackMessage(t: TranslateFn, context: AuthErrorContext) {
  switch (context) {
    case 'login':
      return t('auth.loginFailed');
    case 'register':
      return t('auth.registerError');
    case 'reset-request':
      return t('auth.resetPasswordError');
    case 'password-update':
      return t('auth.passwordUpdateError');
    case 'auth-link':
      return t('auth.invalidAuthLink');
    default:
      return t('auth.error');
  }
}
