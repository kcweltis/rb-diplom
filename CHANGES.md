# Изменения и добавленные файлы

## Новые файлы

### `src/db/migrations/002_auth_features.sql`
Миграция базы данных для новых функций:
- Добавляет столбцы `yandex_id`, `otp_code`, `otp_expires_at`, `two_factor_enabled` в таблицу `users`.
- Добавляет пропущенные столбцы `visit_date` и `visit_time` в таблицу `feedbacks` (они уже использовались в контроллере, но отсутствовали в схеме).
- Создаёт таблицу `newsletter_subscribers` для хранения email-адресов подписчиков на рассылку акций.

---

### `src/services/otp.service.js`
Сервис для работы с одноразовыми кодами (OTP):
- `generateOtp(userId)` — генерирует 6-значный код, сохраняет его в БД (срок действия 10 минут) и отправляет на email пользователя через Яндекс SMTP.
- `verifyOtp(userId, code)` — проверяет код и его срок действия, при успехе сбрасывает код в БД.

---

### `src/views/pages/verify-otp.ejs`
Страница ввода кода при двухфакторном входе в аккаунт. Показывается после успешного ввода логина/пароля, если у пользователя включена 2FA.

### `src/views/pages/forgot-password.ejs`
Страница восстановления пароля. Пользователь вводит email или телефон, система отправляет OTP-код на привязанный email.

### `src/views/pages/reset-password.ejs`
Страница задания нового пароля. Пользователь вводит код из письма и новый пароль.

### `src/views/pages/profile/change-password.ejs`
Страница смены пароля из профиля. Пользователь вводит код подтверждения (присланный на email) и новый пароль.

---

## Изменённые файлы

### `.env`
Добавлены переменные окружения:
- `SMTP_USER`, `SMTP_PASS` — учётные данные SMTP (перенесены из исходного кода).
- `ADMIN_EMAIL` — email администратора для получения уведомлений об отзывах и вакансиях.
- `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`, `YANDEX_CALLBACK_URL` — параметры приложения Яндекс OAuth.

---

### `src/services/user.service.js`
- Функция `verifyUser` теперь принимает `identifier` (email **или** номер телефона) вместо только email — реализован вход по номеру телефона.
- Добавлена функция `findOrCreateYandexUser` — ищет пользователя по `yandex_id`, при необходимости привязывает Яндекс-аккаунт к существующему пользователю по email или создаёт нового.

---

### `src/controllers/auth.controller.js`
Существенно расширен:
- Логин теперь принимает поле `identifier` (email или телефон).
- При включённой 2FA после успешного входа пользователь перенаправляется на страницу ввода OTP.
- Добавлены обработчики `getVerifyOtp` / `postVerifyOtp` — 2FA при входе.
- Добавлены обработчики `getForgotPassword` / `postForgotPassword` — запрос на восстановление пароля.
- Добавлены обработчики `getResetPassword` / `postResetPassword` — задание нового пароля по OTP.
- Добавлены обработчики `getYandexAuth` / `getYandexCallback` — авторизация через Яндекс ID (ручная реализация OAuth2 через встроенный модуль `https`, без сторонних пакетов).

---

### `src/controllers/profile.controller.js`
- Добавлен метод `requestChangePasswordOtp` — отправляет OTP на email и перенаправляет пользователя на форму ввода кода.
- Добавлен метод `getChangePassword` — рендерит форму ввода кода.
- Метод `changePassword` переработан: теперь принимает OTP-код вместо старого пароля.
- Добавлен метод `toggleTwoFactor` — переключает флаг `two_factor_enabled` в профиле пользователя.
- В запрос данных пользователя добавлены поля `two_factor_enabled` и `yandex_id`.

---

### `src/controllers/admin.controller.js`
- Учётные данные SMTP (`user`, `pass`) и email получателя (`to`) переведены на переменные окружения `process.env.SMTP_USER`, `process.env.SMTP_PASS`, `process.env.ADMIN_EMAIL`.

---

### `src/controllers/promo.controller.js`
- Добавлена функция `subscribeNewsletter` — сохраняет email в таблицу `newsletter_subscribers` и отправляет подписчику письмо-подтверждение через SMTP.
- Транспортёр nodemailer использует переменные окружения.

---

### `src/routes/web.routes.js`
Добавлены новые маршруты:
- `GET /auth/yandex` — редирект на страницу авторизации Яндекс.
- `GET /auth/yandex/callback` — обработка ответа от Яндекс OAuth.
- `GET/POST /verify-otp` — ввод OTP при 2FA-входе.
- `GET/POST /forgot-password` — запрос восстановления пароля.
- `GET/POST /reset-password` — задание нового пароля по OTP.
- `POST /profile/request-change-password` — запрос OTP для смены пароля в профиле.
- `GET /profile/change-password` — форма ввода OTP и нового пароля.
- `POST /profile/toggle-2fa` — включение/отключение двухфакторной аутентификации.
- `POST /api/newsletter/subscribe` — подписка на рассылку акций.

---

### `src/views/pages/login.ejs`
- Поле ввода заменено с `email` на `identifier` (принимает email или телефон), подпись изменена на «Email или телефон».
- Добавлена кнопка «Войти через Яндекс ID».
- Добавлена ссылка «Забыли пароль?».

### `src/views/pages/register.ejs`
- Добавлена кнопка «Зарегистрироваться через Яндекс ID».

### `src/views/pages/profile/index.ejs`
- Блок «Смена пароля» заменён: вместо формы со старым паролем — кнопка запроса OTP-кода на email.
- Добавлен блок «Двухфакторная аутентификация» с кнопкой включения/отключения 2FA.
- Добавлены уведомления для новых состояний: ошибка отправки OTP (`err=otpsend`) и успешное обновление настроек 2FA (`ok=2fa`).

### `src/views/pages/promotions.ejs`
- Форма подписки подключена к реальному endpoint `/api/newsletter/subscribe` через AJAX (fetch).
- Добавлены сообщения об успехе и ошибке подписки.

---

## Примечания по настройке

1. **Запустить миграцию** перед стартом приложения:
   ```
   npm run db:migrate
   node src/db/run-sql.js src/db/migrations/002_auth_features.sql
   ```

2. **Яндекс OAuth** требует регистрации приложения на [oauth.yandex.ru](https://oauth.yandex.ru). После получения `Client ID` и `Client Secret` — заполнить `YANDEX_CLIENT_ID` и `YANDEX_CLIENT_SECRET` в `.env`.

3. **SMTP** — уже настроен на Яндекс. Убедитесь, что `SMTP_USER` и `SMTP_PASS` в `.env` актуальны.
