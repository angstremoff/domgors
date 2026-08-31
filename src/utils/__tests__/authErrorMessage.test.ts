import { describe, expect, it } from 'vitest';
import { getAuthErrorMessage } from '../authErrorMessage';

// Мок t(): возвращает сам ключ — так тест проверяет выбор ключа перевода
const t = (key: string) => key;

describe('getAuthErrorMessage', () => {
  it('пустое сообщение → fallback по контексту', () => {
    expect(getAuthErrorMessage(null, t, 'register')).toBe('auth.registerError');
    expect(getAuthErrorMessage('', t, 'login')).toBe('auth.loginFailed');
    expect(getAuthMessageUndefined()).toBe('auth.loginFailed');
  });

  it('неверные учётные данные', () => {
    expect(getAuthErrorMessage('Invalid login credentials', t, 'login')).toBe('auth.loginFailed');
  });

  it('уже зарегистрирован', () => {
    expect(getAuthErrorMessage('User already registered', t, 'register')).toBe('auth.emailAlreadyExists');
    expect(getAuthErrorMessage('Email address not authorized', t, 'register')).toBe('auth.emailAlreadyExists');
  });

  it('протухшие ссылки/токены', () => {
    expect(getAuthErrorMessage('otp has expired', t, 'auth-link')).toBe('auth.invalidAuthLink');
    expect(getAuthErrorMessage('Token has expired', t, 'auth-link')).toBe('auth.invalidAuthLink');
  });

  describe('сетевые таймауты и 504 (главный кейс поломки регистрации)', () => {
    it('upstream request timeout → понятное сообщение', () => {
      expect(getAuthErrorMessage('upstream request timeout', t, 'register'))
        .toBe('auth.serviceTemporarilyUnavailable');
    });

    it('разные варианты таймаутов распознаются (регистр не важен)', () => {
      expect(getAuthErrorMessage('Request Timeout', t, 'register')).toBe('auth.serviceTemporarilyUnavailable');
      expect(getAuthErrorMessage('Operation timed out', t, 'login')).toBe('auth.serviceTemporarilyUnavailable');
      expect(getAuthErrorMessage('Network request failed', t, 'reset-request')).toBe('auth.serviceTemporarilyUnavailable');
      expect(getAuthErrorMessage('Fetch failed', t, 'register')).toBe('auth.serviceTemporarilyUnavailable');
      expect(getAuthErrorMessage('failed to fetch', t, 'register')).toBe('auth.serviceTemporarilyUnavailable');
      expect(getAuthErrorMessage('Load failed', t, 'register')).toBe('auth.serviceTemporarilyUnavailable');
      expect(getAuthErrorMessage('NetworkError when attempting to fetch resource', t, 'register'))
        .toBe('auth.serviceTemporarilyUnavailable');
    });

    it('таймаут имеет приоритет над generic-fallback, но не над точными кодами', () => {
      // точные коды важнее
      expect(getAuthErrorMessage('Invalid login credentials', t, 'login')).toBe('auth.loginFailed');
      // таймаут важнее generic
      expect(getAuthErrorMessage('upstream request timeout', t, 'login'))
        .toBe('auth.serviceTemporarilyUnavailable');
    });
  });

  it('неизвестная ошибка → fallback контекста', () => {
    expect(getAuthErrorMessage('Something very odd happened', t, 'register')).toBe('auth.registerError');
    expect(getAuthErrorMessage('Database error saving new user', t, 'register')).toBe('auth.registerError');
  });
});

// helper для undefined
function getAuthMessageUndefined(): string {
  return getAuthErrorMessage(undefined, (key) => key, 'login');
}
