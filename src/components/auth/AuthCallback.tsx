import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Функция для обработки URL с токеном доступа
    const handleAuthCallback = async () => {
      try {
        // Supabase автоматически обрабатывает URL с токеном
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }

        if (data.session) {
          // Проверяем, существует ли запись в таблице users
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('id', data.session.user.id)
            .single()

          // Если записи нет, создаем ее
          if (userError && userError.code === 'PGRST116') {
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: data.session.user.id,
                email: data.session.user.email
              })

            if (insertError) {
              console.error('Error creating user record:', insertError)
            }
          }

          // Перенаправляем на страницу профиля
          navigate('/profile')
        } else {
          // Если сессия не найдена, перенаправляем на главную страницу
          navigate('/')
        }
      } catch (err: any) {
        console.error('Auth callback error:', err)
        setError(err.message || 'Произошла ошибка при обработке аутентификации')
        navigate('/')
      }
    }

    handleAuthCallback()
  }, [])

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 text-center">
      <p className="text-gray-600">Проверка аутентификации...</p>
    </div>
  )
}