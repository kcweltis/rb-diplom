document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. НАВИГАЦИЯ ПО КАТЕГОРИЯМ
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

    if (prodClose) prodClose.addEventListener('click', () => prodOverlay.classList.remove('is-open'));
    if (prodOverlay) prodOverlay.addEventListener('click', (e) => {
        if (e.target === prodOverlay) prodOverlay.classList.remove('is-open');
    });

    document.querySelectorAll('.open-modal-btn').forEach(card => {
        card.addEventListener('click', async function (e) {
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

    // --- ФУНКЦИЯ ОТРИСОВКИ ОКНА ---
    function renderProductModal(product, addons) {

        let sizesHtml = '';
        const hasSizes = product.sizes && product.sizes.length > 0;

        if (hasSizes) {
            sizesHtml = `
            <div class="pm-sizes">
                <div class="pm-sizes__title" style="font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #2B2B2B;">Объем:</div>
                <div class="pm-sizes__list" style="display: flex; gap: 10px; margin-bottom: 15px;">`;

            product.sizes.forEach((s, idx) => {
                sizesHtml += `
                    <div class="size-option" style="flex: 1; position: relative;">
                        <input type="radio" name="product-size" id="size-${idx}" 
                               value="${s.name}" 
                               data-price="${s.price}"
                               data-prot="${s.prot || 0}"
                               data-fat="${s.fat || 0}"
                               data-carb="${s.carb || 0}"
                               data-cal="${s.cal || 0}"
                               ${idx === 0 ? 'checked' : ''} 
                               style="position: absolute; opacity: 0; cursor: pointer;">
                        <label for="size-${idx}" style="display: block; padding: 10px; text-align: center; border: 1px solid #ddd; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; background: #fff;">
                            ${s.name}
                        </label>
                    </div>`;
            });
            sizesHtml += `</div></div>`;
        }

        let optionsHtml = '';
        const hasOptions = product.options && product.options.length > 0;

        if (hasOptions) {
            optionsHtml = `
            <div class="pm-options" style="margin: 20px 0;">
                <div style="font-size: 16px; font-weight: 800; margin-bottom: 10px;">Выберите блин:</div>
                <div style="display: flex; flex-direction: column; gap: 8px;">`;

            product.options.forEach((opt, idx) => {
                optionsHtml += `
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 12px; border: 1px solid ${idx === 0 ? '#E30613' : '#ddd'}; border-radius: 12px; ${idx === 0 ? 'box-shadow: 0 0 0 1px #E30613;' : ''}">
                        <input type="radio" name="product-option" value="${opt.name}" ${idx === 0 ? 'checked' : ''} style="accent-color: #E30613; width: 18px; height: 18px;">
                        <span style="font-size: 14px; font-weight: 500;">${opt.name}</span>
                    </label>`;
            });
            optionsHtml += `</div></div>`;
        }

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

        // ==========================================
        // ИСПРАВЛЕННЫЙ БЛОК БЖУ
        // ==========================================
        let nutriHtml = '';

        // Проверяем: есть ли основные калории ИЛИ есть ли калории хотя бы у первого объема напитка
        const hasBaseMacros = product.calories && product.calories > 0;
        const hasSizeMacros = hasSizes && product.sizes[0] && product.sizes[0].cal && product.sizes[0].cal > 0;

        if (hasBaseMacros || hasSizeMacros) {
            // Если это напиток - берем стартовые данные из первого объема. Если обычное блюдо - из базы.
            const initProt = hasSizeMacros ? (product.sizes[0].prot || 0) : (product.proteins || 0);
            const initFats = hasSizeMacros ? (product.sizes[0].fat || 0) : (product.fats || 0);
            const initCarbs = hasSizeMacros ? (product.sizes[0].carb || 0) : (product.carbs || 0);
            const initCal = hasSizeMacros ? (product.sizes[0].cal || 0) : (product.calories || 0);

            nutriHtml = `
            <div style="display: flex; gap: 10px; margin: 15px 0; background: #f9f9f9; padding: 12px; border-radius: 12px; font-size: 13px; text-align: center; border: 1px solid #eee;">
                <div style="flex: 1;"><div style="color: #888; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">Белки</div><b style="font-size: 15px;" id="modal-prot">${initProt} г</b></div>
                <div style="flex: 1;"><div style="color: #888; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">Жиры</div><b style="font-size: 15px;" id="modal-fats">${initFats} г</b></div>
                <div style="flex: 1;"><div style="color: #888; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">Углеводы</div><b style="font-size: 15px;" id="modal-carbs">${initCarbs} г</b></div>
                <div style="flex: 1; border-left: 1px solid #ddd;"><div style="color: #E30613; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">Ккал</div><b style="color: #E30613; font-size: 16px;" id="modal-cal">${initCal}</b></div>
            </div>`;
        }

        // Умное форматирование веса/объема
        let displayWeight = product.weight_g ? String(product.weight_g).trim() : '';
        if (displayWeight && !/[а-яА-Яa-zA-Z]/.test(displayWeight)) {
            displayWeight += displayWeight.includes('/') ? ' мл' : ' г';
        }
        const weightText = displayWeight ? `<div style="margin-top: 10px; color: #666; font-size: 14px;"><b>Вес/Объем:</b> ${displayWeight}</div>` : '';

        const initialBasePrice = hasSizes ? product.sizes[0].price : product.price;

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
                    ${sizesHtml}
                    ${optionsHtml}
                    ${addonsHtml}
                    
                    <div class="pm-footer" style="margin-top: auto; padding-top: 20px; display: flex; justify-content: space-between; align-items: center;">
                        <div class="pm-price" style="font-size: 24px; font-weight: 800;">
                            <span id="modalFinalPrice" data-base="${initialBasePrice}">${Number(initialBasePrice).toFixed(0)}</span> ₽
                        </div>
                        <button class="btn btn--primary" id="modalAddToCartBtn" style="padding: 12px 30px; font-size: 16px;">Добавить</button>
                    </div>
                </div>
            </div>
        `;

        // --- ЛОГИКА ДИНАМИЧЕСКОГО ПЕРЕСЧЕТА ЦЕНЫ И БЖУ ---
        const priceEl = document.getElementById('modalFinalPrice');

        const updateDynamicData = () => {
            let basePrice = parseFloat(priceEl.getAttribute('data-base'));

            const selectedSize = document.querySelector('input[name="product-size"]:checked');
            if (selectedSize) {
                basePrice = parseFloat(selectedSize.getAttribute('data-price'));

                const pProt = document.getElementById('modal-prot');
                const pFats = document.getElementById('modal-fats');
                const pCarbs = document.getElementById('modal-carbs');
                const pCal = document.getElementById('modal-cal');

                if (pProt) pProt.innerText = selectedSize.getAttribute('data-prot') + ' г';
                if (pFats) pFats.innerText = selectedSize.getAttribute('data-fat') + ' г';
                if (pCarbs) pCarbs.innerText = selectedSize.getAttribute('data-carb') + ' г';
                if (pCal) pCal.innerText = selectedSize.getAttribute('data-cal');
            }

            let addonsSum = 0;
            document.querySelectorAll('.modal-addon-cb:checked').forEach(checked => {
                addonsSum += parseFloat(checked.getAttribute('data-price'));
            });

            priceEl.innerText = (basePrice + addonsSum).toFixed(0);
        };

        // Запускаем при старте
        if (hasSizes) updateDynamicData();

        // Слушатели на все переключатели и чекбоксы
        document.querySelectorAll('input[name="product-size"], .modal-addon-cb').forEach(el => {
            el.addEventListener('change', updateDynamicData);
        });

        // Окрашиваем обводку радиокнопок при выборе
        document.querySelectorAll('input[name="product-option"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.querySelectorAll('input[name="product-option"]').forEach(r => {
                    r.parentElement.style.borderColor = '#ddd';
                    r.parentElement.style.boxShadow = 'none';
                });
                e.target.parentElement.style.borderColor = '#E30613';
                e.target.parentElement.style.boxShadow = '0 0 0 1px #E30613';
            });
        });

        // --- ДОБАВЛЕНИЕ В КОРЗИНУ ---
        document.getElementById('modalAddToCartBtn').addEventListener('click', async (e) => {
            const btn = e.target;
            const originalText = btn.innerText;

            const selectedAddons = Array.from(document.querySelectorAll('.modal-addon-cb:checked')).map(cb => Number(cb.value));
            const selectedSize = document.querySelector('input[name="product-size"]:checked')?.value || null;
            const selectedOption = document.querySelector('input[name="product-option"]:checked')?.value || null;

            btn.innerText = 'Добавляем...';
            btn.disabled = true;

            try {
                const response = await fetch('/api/cart/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        product_id: product.id,
                        addons: selectedAddons,
                        size: selectedSize,
                        option: selectedOption
                    })
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

    // Автооткрытие товара из URL
    const urlParams = new URLSearchParams(window.location.search);
    const openProductId = urlParams.get('openProductId');

    if (openProductId) {
        const targetCard = document.querySelector(`.open-modal-btn[data-id="${openProductId}"]`);
        if (targetCard) {
            targetCard.click();
            const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({ path: newUrl }, '', newUrl);
        }
    }
});