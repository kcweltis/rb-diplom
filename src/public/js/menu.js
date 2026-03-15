document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. НАВИГАЦИЯ ПО КАТЕГОРИЯМ (КРАСНЫЙ ЦВЕТ)
    // ==========================================
    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const catId = entry.target.id.replace('cat-', '');
                document.querySelectorAll('.catNav__link').forEach(link => {
                    link.classList.remove('is-active');
                });
                const activeLink = document.querySelector(`.catNav__link[data-cat="${catId}"]`);
                if (activeLink) {
                    activeLink.classList.add('is-active');
                }
            }
        });
    }, observerOptions);

    document.querySelectorAll('.catBlock').forEach(block => {
        observer.observe(block);
    });

    // ==========================================
    // 2. МОДАЛЬНОЕ ОКНО ТОВАРА
    // ==========================================
    const prodOverlay = document.getElementById('prodModalOverlay');
    const prodContent = document.getElementById('prodModalContent');
    const prodClose = document.getElementById('prodModalClose');

    // Закрытие окна
    if (prodClose) prodClose.addEventListener('click', () => prodOverlay.classList.remove('is-open'));
    if (prodOverlay) prodOverlay.addEventListener('click', (e) => {
        if (e.target === prodOverlay) prodOverlay.classList.remove('is-open');
    });

    // Открытие окна и загрузка данных
    document.querySelectorAll('.open-modal-btn').forEach(card => {
        card.addEventListener('click', async function (e) {
            // Если кликнули по кнопке "Выбрать", чтобы она не мешала открытию
            if (e.target.classList.contains('itemBtn')) e.preventDefault();

            const productId = this.getAttribute('data-id');
            prodOverlay.classList.add('is-open');
            prodContent.innerHTML = '<div style="text-align:center; padding: 50px;">Загружаем...</div>';

            try {
                const res = await fetch(`/api/products/${productId}`);
                const data = await res.json();

                if (data.success) {
                    renderProductModal(data.product, data.addons);
                } else {
                    prodContent.innerHTML = `<div style="text-align:center; padding: 50px; color: red;">Ошибка: ${data.message}</div>`;
                }
            } catch (err) {
                prodContent.innerHTML = '<div style="text-align:center; padding: 50px;">Ошибка сети</div>';
            }
        });
    });

    // Функция отрисовки внутренностей окна
    function renderProductModal(product, addons) {
        // 1. Формируем список добавок
        let addonsHtml = '';
        if (addons && addons.length > 0) {
            addonsHtml = `<div class="pm-addons"><h4 style="margin:0 0 10px;">Добавить к блюду:</h4>`;
            addons.forEach(a => {
                addonsHtml += `
                    <label class="pm-addon-row" style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px dashed #eee; cursor:pointer;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <input type="checkbox" class="modal-addon-cb" value="${a.id}" data-price="${a.price}" style="accent-color: #E30613; width:18px; height:18px; cursor:pointer;">
                            <span>${a.name}</span>
                        </div>
                        <b>+${Number(a.price).toFixed(0)} ₽</b>
                    </label>`;
            });
            addonsHtml += `</div>`;
        }

        // 2. Формируем красивый блок БЖУ и Калорий
        let nutriHtml = '';
        if (product.calories && product.calories > 0) {
            nutriHtml = `
            <div style="display: flex; gap: 10px; margin: 15px 0; background: #f9f9f9; padding: 12px; border-radius: 12px; font-size: 13px; text-align: center; border: 1px solid #eee;">
                <div style="flex: 1;"><div style="color: #888; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">Белки</div><b style="font-size: 15px;">${product.proteins || 0} г</b></div>
                <div style="flex: 1;"><div style="color: #888; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">Жиры</div><b style="font-size: 15px;">${product.fats || 0} г</b></div>
                <div style="flex: 1;"><div style="color: #888; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">Углеводы</div><b style="font-size: 15px;">${product.carbs || 0} г</b></div>
                <div style="flex: 1; border-left: 1px solid #ddd;"><div style="color: #E30613; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">Ккал</div><b style="color: #E30613; font-size: 16px;">${product.calories}</b></div>
            </div>`;
        }

        const weightText = product.weight_g ? `<div style="margin-top: 10px; color: #666; font-size: 14px;"><b>Вес:</b> ${product.weight_g} г</div>` : '';

        // 3. Собираем весь HTML модального окна
        prodContent.innerHTML = `
            <div class="pm-layout">
                <div class="pm-img-box">
                    <img src="${product.image_url || '/img/products/placeholder.png'}" class="pm-img" style="width: 100%; border-radius: 16px; object-fit: cover;">
                </div>
                <div class="pm-info" style="display: flex; flex-direction: column;">
                    <h2 class="pm-title" style="margin: 0 0 10px; font-family: 'Manrope', sans-serif; font-size: 24px;">${product.name}</h2>
                    <div class="pm-desc" style="color: #555; font-size: 14px; line-height: 1.5;">${product.description || ''}</div>
                    
                    ${weightText}
                    ${nutriHtml}
                    ${addonsHtml}
                    
                    <div class="pm-footer" style="margin-top: auto; padding-top: 20px; display: flex; justify-content: space-between; align-items: center;">
                        <div class="pm-price" style="font-size: 24px; font-weight: 800;"><span id="modalFinalPrice" data-base="${product.price}">${Number(product.price).toFixed(0)}</span> ₽</div>
                        <button class="btn btn--primary" id="modalAddToCartBtn" style="padding: 12px 30px; font-size: 16px;">Добавить</button>
                    </div>
                </div>
            </div>
        `;

        // 4. Логика пересчета цены внутри модалки
        const priceEl = document.getElementById('modalFinalPrice');
        const basePrice = parseFloat(priceEl.getAttribute('data-base'));
        const checkboxes = document.querySelectorAll('.modal-addon-cb');

        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                let total = basePrice;
                document.querySelectorAll('.modal-addon-cb:checked').forEach(checked => {
                    total += parseFloat(checked.getAttribute('data-price'));
                });
                priceEl.innerText = total.toFixed(0);
            });
        });

        // 5. Логика добавления в корзину из модалки
        document.getElementById('modalAddToCartBtn').addEventListener('click', async (e) => {
            const btn = e.target;
            const originalText = btn.innerText;
            const selectedAddons = Array.from(document.querySelectorAll('.modal-addon-cb:checked')).map(cb => Number(cb.value));

            btn.innerText = 'Добавляем...';
            btn.disabled = true;

            try {
                const response = await fetch('/api/cart/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product_id: product.id, addons: selectedAddons })
                });
                const result = await response.json();

                if (result.success) {
                    btn.innerText = 'В корзине ✓';
                    btn.style.background = '#8CC63F';
                    setTimeout(() => {
                        prodOverlay.classList.remove('is-open');
                        if (typeof window.triggerSideCart === 'function') window.triggerSideCart();
                    }, 800);
                } else {
                    alert('Ошибка: ' + result.message);
                    btn.innerText = originalText;
                    btn.disabled = false;
                }
            } catch (err) {
                alert('Ошибка добавления');
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }

});