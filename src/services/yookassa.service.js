const YOOKASSA_API_URL = "https://api.yookassa.ru/v3";

function getYooKassaConfig() {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  if (!shopId || !secretKey) {
    throw new Error("YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY are required");
  }

  return { shopId, secretKey };
}

function getAuthHeader() {
  const { shopId, secretKey } = getYooKassaConfig();
  return `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`;
}

async function requestYooKassa(path, options = {}) {
  const response = await fetch(`${YOOKASSA_API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.description || data.error || "YooKassa request failed";
    throw new Error(message);
  }

  return data;
}

function formatAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  return amount.toFixed(2);
}

// Передаем items (массив товаров) из контроллера заказа
async function createPayment({ orderId, amount, returnUrl, customer, items = [] }) {
  const formattedAmount = formatAmount(amount);

  const body = {
    amount: {
      value: formattedAmount,
      currency: "RUB",
    },
    capture: true,
    confirmation: {
      type: "redirect",
      return_url: returnUrl,
    },
    description: `Оплата заказа №${orderId}`,
    metadata: {
      orderId: String(orderId),
      customerPhone: customer?.phone || "",
    },
    // 👇 ДОБАВИЛ БЛОК ЧЕКА ДЛЯ ФЗ-54
    receipt: {
      customer: {
        // ЮKassa требует либо email, либо phone для отправки чека
        email: customer?.email || "test-customer@example.com",
        phone: customer?.phone ? customer.phone.replace(/\D/g, '') : undefined // только цифры
      },
      // Формируем позиции чека на основе переданных товаров
      items: items.length > 0 ? items.map(item => ({
        description: item.name || "Товар",
        quantity: formatAmount(item.quantity || 1),
        amount: {
          value: formatAmount(item.price),
          currency: "RUB"
        },
        vat_code: "1", // 1 — без НДС (подходит для большинства учебных/тестовых проектов)
        payment_mode: "full_prepayment",
        payment_subject: "commodity"
      })) : [
        // Резервный заглушка-товар, если массив items пустой (чтобы API не ругался)
        {
          description: `Оплата заказа №${orderId}`,
          quantity: "1.00",
          amount: {
            value: formattedAmount,
            currency: "RUB"
          },
          vat_code: "1",
          payment_mode: "full_prepayment",
          payment_subject: "commodity"
        }
      ]
    }
  };

  return requestYooKassa("/payments", {
    method: "POST",
    headers: {
      "Idempotence-Key": `order-${orderId}-${Date.now()}`, // добавил Date.now для избежания конфликтов при повторных попытках теста
    },
    body: JSON.stringify(body),
  });
}

async function getPayment(paymentId) {
  return requestYooKassa(`/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
  });
}

module.exports = {
  createPayment,
  getPayment,
};