/**
 * order-tracker.js
 * Асинхронное отслеживание статуса заказа и информации о курьере
 * Добавляется на страницу профиля клиента
 */

class OrderTracker {
    constructor(orderId) {
        this.orderId = orderId;
        this.container = document.getElementById(`order-container-${orderId}`);

        this.startTracking();
    }

    startTracking() {
        // Обновляем каждые 10 секунд
        this.updateStatus();
        setInterval(() => this.updateStatus(), 10000);
    }

    async updateStatus() {
        try {
            const response = await fetch(`/api/order/${this.orderId}/status`);
            if (!response.ok) return;

            const data = await response.json();
            this.renderTracker(data.status, data.courier, data.order_type);
        } catch (e) {
            console.error('Error updating order status:', e);
        }
    }

    renderTracker(status, courierInfo, orderType = 'delivery') {
        if (!this.container) return;

        // Удаляем старый трекер если есть
        const oldTracker = this.container.querySelector('.order-tracker');
        if (oldTracker) oldTracker.remove();

        // Создаем новый трекер
        const tracker = document.createElement('div');
        tracker.className = 'order-tracker';
        tracker.innerHTML = this.getTrackerHTML(status, courierInfo, orderType);

        // Вставляем после order-header
        const orderHeader = this.container.querySelector('.order-header');
        if (orderHeader) {
            orderHeader.after(tracker);
        }
    }

    getTrackerHTML(status, courierInfo, orderType = 'delivery') {
        // Определяем步骤 в зависимости от типа заказа
        let steps, stepIndex;
        
        if (orderType === 'pickup') {
            steps = ['Заказ принят', 'Готовится', 'Готов', 'Получен'];
            const pickupMap = {
                'READY': 0, 'PENDING_PAYMENT': 0,
                'COOKING': 1,
                'ASSIGNED': 2, 'ON_THE_WAY': 2,
                'DELIVERED': 3
            };
            stepIndex = pickupMap[status] !== undefined ? pickupMap[status] : 0;
        } else {
            // Доставка
            steps = ['Заказ принят', 'Готовят', 'Ожидает курьера', 'Курьер везет', 'Доставлено'];
            const deliveryMap = {
                'READY': 0, 'PENDING_PAYMENT': 0,
                'COOKING': 1,
                'ASSIGNED': 2,
                'ON_THE_WAY': 3,
                'DELIVERED': 4
            };
            stepIndex = deliveryMap[status] !== undefined ? deliveryMap[status] : 0;
        }

        let html = '<div class="tracker-steps">';

        for (let i = 0; i < steps.length; i++) {
            const isCompleted = i < stepIndex;
            const isActive = i === stepIndex;
            const className = isCompleted ? 'completed' : isActive ? 'active' : '';

            html += `<div class="tracker-step ${className}">
                <div class="tracker-dot" title="${steps[i]}"></div>
                <div class="tracker-label">${steps[i]}</div>
                ${i < steps.length - 1 ? '<div class="tracker-line"></div>' : ''}
            </div>`;
        }

        html += '</div>';

        // Информация о курьере (если заказ в пути)
        if (stepIndex >= 3 && orderType === 'delivery' && courierInfo) {
            html += `
                <div class="courier-info">
                    <div class="courier-badge">
                        Ваш заказ везет <strong>${courierInfo.name}</strong>
                    </div>
                    <a href="tel:${courierInfo.phone}" class="btn-call-courier">
                        Позвонить курьеру
                    </a>
                </div>
            `;
        }

        return html;
    }
}

// Инициализация трекеров для всех заказов на странице профиля
document.addEventListener('DOMContentLoaded', () => {
    const orderCards = document.querySelectorAll('.order-card[data-order-id]');
    orderCards.forEach(card => {
        const orderId = card.dataset.orderId;
        if (orderId) {
            new OrderTracker(orderId);
        }
    });
});
