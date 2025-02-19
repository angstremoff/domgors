// Тестовый аккаунт
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123',
  id: '1'
}

// Получение текущей сессии из localStorage
const getCurrentSession = () => {
  const savedUser = localStorage.getItem('user')
  return savedUser ? { user: JSON.parse(savedUser) } : null
}

// Имитация API endpoints
export const authApi = {
  // Вход в систему
  async login(email: string, password: string) {
    await new Promise(resolve => setTimeout(resolve, 500)) // Имитация задержки сети

    if (email === TEST_USER.email && password === TEST_USER.password) {
      const userData = { 
        id: TEST_USER.id,
        email: TEST_USER.email
      }
      return userData
    }
    throw new Error('Invalid credentials')
  },

  // Выход из системы
  async logout() {
    await new Promise(resolve => setTimeout(resolve, 500))
  },

  // Проверка текущей сессии
  async checkAuth() {
    await new Promise(resolve => setTimeout(resolve, 500))
    const session = getCurrentSession()
    if (session) {
      return { 
        id: session.user.id,
        email: session.user.email
      }
    }
    return null
  }
}
