document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('sideCartOverlay');
    const cart = document.getElementById('sideCart');
    const closeBtn = document.getElementById('closeSideCartBtn');
    const floatBtn = document.getElementById('floatingCartBtn');
    const headerCartBtn = document.getElementById('openSideCartBtn');
    const body = document.getElementById('sideCartBody');

    function openCart(e) {
        if (e) e.preventDefault();
        if (overlay) overlay.classList.add('is-visible');
        if (cart) cart.classList.add('is-open');
        loadSideCart();
    }

    function closeCart() {
        if (overlay) overlay.classList.remove('is-visible');
        if (cart) cart.classList.remove('is-open');
    }

    if (floatBtn) floatBtn.addEventListener('click', openCart);
    if (headerCartBtn) headerCartBtn.addEventListener('click', openCart);
    if (closeBtn) closeBtn.addEventListener('click', closeCart);
    if (overlay) overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeCart();
    });

    window.triggerSideCart = openCart;

    // ГЛОБАЛЬНЫЙ СЛУШАТЕЛЬ ДЛЯ КНОПОК [+] [-] [x]
    if (body) {
        body.addEventListener('click', async (e) => {
            const removeBtn = e.target.closest('.sc-remove-btn');
            const qtyBtn = e.target.closest('.sc-qty-btn');

            // Если нажали на крестик (Удалить)
            if (removeBtn) {
                const id = removeBtn.getAttribute('data-id');
                removeBtn.innerHTML = '...'; // анимация загрузки
                await fetch(`/api/cart/remove/${id}`, { method: 'DELETE' });
                loadSideCart(); // Перерисовываем корзину
            }

            // Если нажали на плюс или минус
            if (qtyBtn) {
                const id = qtyBtn.getAttribute('data-id');
                const action = qtyBtn.getAttribute('data-action');

                // Чтобы не кликали 100 раз подряд, временно отключаем кнопку
                qtyBtn.style.opacity = '0.5';

                await fetch('/api/cart/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ item_id: id, action })
                });
                loadSideCart(); // Перерисовываем корзину
            }
        });
    }

    async function loadSideCart() {
        const totalEl = document.getElementById('sideCartTotal');
        if (!body) return;

        try {
            const res = await fetch('/api/cart');
            const data = await res.json();

            if (data.success) {
                if (data.items.length === 0) {
                    body.innerHTML = '<div style="text-align:center; margin-top: 40px; color: #666;">Ваша корзина пуста 😔</div>';
                    totalEl.innerText = '0 ₽';
                    return;
                }

                let html = '';
                data.items.forEach(item => {
                    let addonsHtml = '';
                    if (item.addons && item.addons.length > 0) {
                        addonsHtml = `<div style="font-size: 12px; color: #888; margin-top: 4px; line-height: 1.4;">`;
                        item.addons.forEach(a => { addonsHtml += `<div>+ ${a.name}</div>`; });
                        addonsHtml += `</div>`;
                    }

                    // Отрисовка товара с новыми кнопками
                    html += `
                    <div class="sc-item" style="border-bottom: 1px dashed #eee; padding-bottom: 15px; margin-bottom: 15px; position: relative;">
                        
                        <button class="sc-remove-btn" data-id="${item.cart_item_id}" style="position: absolute; top: 0; right: 0; background: none; border: none; font-size: 16px; color: #999; cursor: pointer;">✕</button>

                        <img src="${item.image_url || '/img/products/placeholder.png'}" class="sc-item__img" alt="${item.name}">
                        <div class="sc-item__info" style="padding-right: 20px;">
                            <div class="sc-item__name" style="font-size: 16px;">${item.name}</div>
                            ${addonsHtml}
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                                
                                <div style="display: flex; align-items: center; gap: 10px; border: 1px solid #eee; border-radius: 8px; padding: 4px;">
                                    <button class="sc-qty-btn" data-action="decrease" data-id="${item.cart_item_id}" style="background: none; border: none; font-size: 16px; cursor: pointer; padding: 0 8px;">-</button>
                                    <span style="font-weight: 600; font-size: 14px; width: 16px; text-align: center;">${item.quantity}</span>
                                    <button class="sc-qty-btn" data-action="increase" data-id="${item.cart_item_id}" style="background: none; border: none; font-size: 16px; cursor: pointer; padding: 0 8px;">+</button>
                                </div>

                                <div style="font-weight: 800; font-size: 16px;">${item.quantity * item.final_price} ₽</div>
                            </div>
                        </div>
                    </div>
                    `;
                });

                body.innerHTML = html;
                totalEl.innerText = data.total + ' ₽';
            }
        } catch (err) {
            console.error(err);
            body.innerHTML = '<div style="text-align:center; color: red;">Не удалось загрузить корзину</div>';
        }
    }
});