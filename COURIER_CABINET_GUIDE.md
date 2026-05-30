# 📦 Кабинет курьера - Документация

## Обзор

Кабинет курьера - это полнофункциональный мобильный интерфейс для управления доставками. Система позволяет:
- Курьерам быстро видеть доступные заказы
- Управлять статусом доставки (взять → в пути → доставлено)
- Отслеживать заработанные деньги
- Клиентам видеть информацию о курьере, когда заказ в пути

## Установка

### 1. Примените миграцию БД

```bash
npm run db:reset  # Пересоздаст БД (удалит все данные!)
# или отдельно
node src/db/run-sql.js src/db/migrations/003_courier_features.sql
```

### 2. Создайте тестового курьера

В админ-панели или через SQL:

```sql
INSERT INTO users (username, email, phone_hash, role_id) 
VALUES ('Иван', 'courier@test.com', ..., 3);  -- role_id 3 = COURIER

INSERT INTO couriers (user_id, vehicle_type, is_on_shift) 
VALUES (ПОСЛЕДНИЙ_ID, 'Велосипед', false);
```

## Использование

### Для курьера

1. **Вход**: Курьер входит как обычный пользователь с ролью COURIER
2. **Перейти в кабинет**: `/courier/dashboard`
3. **Включить смену**: Нажать toggle "На смене"
4. **Взять заказ**: Перейти на вкладку "Свободные" → нажать "Взять"
5. **Управление доставкой**: Вкладка "Мой заказ" показывает:
   - Адрес доставки
   - Номер клиента (кликабельный tel: link)
   - Кнопка "Построить маршрут" (открывает Яндекс Карты)
   - Управление статусом (взял → в пути → доставлено)
6. **История**: Вкладка "Профиль" → "История доставок"

### Для клиента

Когда заказ назначен курьеру и в пути:
- На странице профиля (`/profile`) появляется **визуальный трекер** (progress bar)
- Показывается имя курьера
- Есть кнопка "Позвонить курьеру" (tel: link)

## API Endpoints

### Для курьеров

| Метод | URL | Описание |
|-------|-----|---------|
| GET | `/courier/dashboard` | Главная панель |
| GET | `/courier/available-orders` | Список доступных заказов (JSON) |
| GET | `/courier/active-order` | Активный заказ курьера (JSON) |
| POST | `/courier/accept-order` | Взять заказ |
| POST | `/courier/start-delivery` | Начать доставку |
| POST | `/courier/mark-delivered` | Отметить как доставлено |
| POST | `/courier/toggle-shift` | Включить/выключить смену |
| POST | `/courier/location` | Отправить GPS координаты |
| GET | `/courier/profile` | Профиль курьера |
| GET | `/courier/history` | История доставок |

### Для клиентов

| Метод | URL | Описание |
|-------|-----|---------|
| GET | `/api/order/:id/status` | Получить статус заказа и информацию о курьере |
| GET | `/api/orders/:id/courier-info` | Информация о курьере, доставляющем заказ |

## Структура данных

### Таблица `couriers`
```sql
id              INT PRIMARY KEY
user_id         INT REFERENCES users(id)
vehicle_type    TEXT (велосипед, мотоцикл, машина и т.д.)
is_on_shift     BOOLEAN (включён ли курьер в смене)
```

### Таблица `courier_ratings`
```sql
id              INT PRIMARY KEY
courier_id      INT REFERENCES couriers(id)
order_id        INT REFERENCES orders(id)
rating          INT (1-5)
comment         TEXT
created_at      TIMESTAMP
```

### Таблица `courier_locations`
```sql
id              INT PRIMARY KEY
courier_id      INT REFERENCES couriers(id)
latitude        NUMERIC(10,8)
longitude       NUMERIC(11,8)
updated_at      TIMESTAMP
```

### Обновления в таблице `orders`
```sql
courier_id      INT REFERENCES couriers(id)  -- Какой курьер доставляет
picked_up_at    TIMESTAMP                     -- Когда курьер забрал заказ
delivered_at    TIMESTAMP                     -- Когда доставлено
```

## Технические детали

### Mobile-First дизайн
- Все компоненты оптимизированы для мобильных
- Большие кнопки для сенсорного ввода
- Минимальное количество текста

### Асинхронные обновления

#### На странице курьера
- Список доступных заказов обновляется каждые **10 секунд**
- GPS координаты отправляются каждые **30 секунд** (если разрешено)

#### На странице клиента
- Статус заказа проверяется каждые **10 секунд**
- При изменении статуса на "ON_THE_WAY" появляется информация о курьере
- Progress bar плавно обновляется

### Интеграция с Яндекс Картами
- Кнопка "Построить маршрут" открывает: `https://yandex.ru/maps/?text={address}`
- На мобильном откроется мобильное приложение Яндекс Карт

## Примеры использования

### Получить информацию о курьере для клиента

```javascript
// На странице профиля, когда заказ в пути
fetch(`/api/order/102/status`)
  .then(r => r.json())
  .then(data => {
    console.log(data.status);      // "ON_THE_WAY"
    console.log(data.courier);     // { name: "Иван", phone: "+7999..." }
  });
```

### Отправить GPS курьером

```javascript
navigator.geolocation.getCurrentPosition(position => {
  fetch('/courier/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    })
  });
});
```

## Статусы заказа (workflow)

```
NEW 
  ↓ (модератор принял в работу)
CONFIRMED → COOKING
  ↓ (готово к доставке)
READY
  ↓ (админ/система назначает курьера)
ASSIGNED
  ↓ (курьер нажимает "Я забрал")
ON_THE_WAY
  ↓ (курьер нажимает "Доставлено")
DELIVERED ✅
```

## Возможные проблемы и решения

### Курьер не видит заказы
- Проверьте, что курьер включил смену (toggle "На смене")
- Проверьте, что есть заказы со статусом "READY" и без назначенного курьера

### GPS не обновляется
- Убедитесь, что сайт открыт по HTTPS (требование для geolocation)
- Пользователь должен разрешить доступ к местоположению

### Трекер не обновляется на странице профиля
- Откройте DevTools консоль и проверьте ошибки
- Убедитесь, что `/css/order-tracker.css` и `/js/order-tracker.js` загружаются
- Проверьте, что API endpoint `/api/order/:id/status` возвращает корректные данные

## Дальнейшие улучшения

1. **Оценка курьеров** - добавить кнопку оценки на странице успешной доставки
2. **Real-time уведомления** - использовать WebSocket вместо polling
3. **Фото доказательства** - курьер может загружать фото доставки
4. **Аналитика** - статистика заработков по дням/неделям
5. **Управление курьерами** - админ панель для управления списком курьеров
