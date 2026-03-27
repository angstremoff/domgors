# Архитектура email-only авторизации DomGo

## 1. Цель
- Единый auth-канал: только `email + password`.
- Регистрация считается завершённой только после подтверждения email.
- Восстановление пароля должно быть полным циклом: запрос письма -> открытие recovery-ссылки -> ввод нового пароля.
- Flow должен одинаково корректно работать в:
  - web desktop,
  - web mobile,
  - mobile app.

## 2. Канонические URL и точки входа
- Запрос восстановления пароля на web: `/zaboravljena-lozinka/`
- Callback подтверждения email: `/auth/callback/`
- Страница установки нового пароля: `/auth/reset-password/`
- Handoff в приложение: `domgomobile://auth/callback?...`

## 3. Принцип работы
### Регистрация
1. Пользователь вводит `email + password`.
2. Frontend вызывает `supabase.auth.signUp`.
3. Supabase отправляет письмо подтверждения.
4. Пользователь открывает письмо.
5. Ссылка приводит на `/auth/callback/`.
6. Web-страница завершает auth session через токены из URL.
7. Пользователь может:
   - продолжить в web,
   - открыть mobile app через `domgomobile://auth/callback?...`.

### Восстановление пароля
1. Пользователь открывает экран/страницу "Забыли пароль?".
2. Frontend вызывает `supabase.auth.resetPasswordForEmail`.
3. Supabase отправляет письмо recovery.
4. Ссылка из письма ведёт на `/auth/reset-password/`.
5. Web-страница поднимает recovery session из URL.
6. Пользователь задаёт новый пароль.
7. При желании пользователь может открыть mobile app по handoff-ссылке и закончить flow внутри приложения.

## 4. Почему email-ссылки ведут в web, а не сразу в app
- HTTPS-ссылка надёжнее открывается из почтовых клиентов на desktop и mobile.
- Один и тот же redirect работает даже если письмо открыли не на том устройстве, где был инициирован запрос.
- App остаётся частью flow через явный handoff, а не через хрупкую зависимость от custom scheme внутри email-клиента.

## 5. Что сделано в коде
- Mobile:
  - `AuthContext` теперь умеет запрашивать recovery-email и обновлять пароль.
  - добавлены экраны `ForgotPassword` и `ResetPassword`.
  - deep link parser понимает auth callback и токены как из query, так и из hash.
  - Expo config получил явную схему `domgomobile` и `auth/callback` intent filter.
- Web:
  - `AuthProvider` теперь умеет запрашивать recovery-email.
  - добавлены страницы `/zaboravljena-lozinka/`, `/auth/callback/`, `/auth/reset-password/`.
  - login page теперь содержит переход к forgot password.
  - callback/recovery страницы умеют передавать session в mobile app.

## 6. Обязательные настройки в Supabase
### Authentication -> URL Configuration
- `Site URL`: `https://domgo.rs`
- `Redirect URLs`:
  - `https://domgo.rs/auth/callback`
  - `https://domgo.rs/auth/callback/`
  - `https://domgo.rs/auth/reset-password`
  - `https://domgo.rs/auth/reset-password/`
- Для локальной web-разработки желательно также добавить:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/callback/`
  - `http://localhost:3000/auth/reset-password`
  - `http://localhost:3000/auth/reset-password/`

### Authentication -> Providers -> Email
- `Confirm email` должно быть включено.
- Регистрация без подтверждения email не считается корректным production-flow.

### Authentication -> Email / SMTP
- SMTP уже должен быть включён и рабочим.
- Обязательно проверить:
  - валидность логина/пароля SMTP,
  - что почтовый сервер реально принимает исходящую почту от `admin@domgo.rs`,
  - SPF,
  - DKIM,
  - DMARC,
  - отсутствие блокировки на стороне почтового провайдера.

## 7. Что нужно проверить в проде
- Регистрация нового пользователя с подтверждением email.
- Повторная регистрация существующего email.
- Восстановление пароля с desktop web.
- Восстановление пароля с mobile browser.
- Переход из `/auth/callback/` в mobile app.
- Переход из `/auth/reset-password/` в mobile app.
- Попытка открыть просроченную или повторно использованную ссылку.

## 8. Известные ограничения
- Live-схема Supabase в репозитории всё ещё неполная, поэтому этот рефакторинг не трогает БД/RLS.
- Если письма всё ещё "не доходят", проблема уже не во frontend-flow, а в доставке SMTP или настройках Supabase Email/Auth.
