(() => {
    const btn = document.getElementById("addrBtn");
    const modal = document.getElementById("addrModal");
    const addrText = document.getElementById("addrText");

    const citySelect = document.getElementById("citySelect");
    const pickupBlock = document.getElementById("pickupBlock");
    const deliveryBlock = document.getElementById("deliveryBlock");
    const pickupList = document.getElementById("pickupList");
    const deliveryInput = document.getElementById("deliveryInput");

    const saveBtn = document.getElementById("saveAddr");

    const toggleBtns = Array.from(modal.querySelectorAll(".toggle__btn"));

    // Обновленные данные точек с адресами Оренбурга
    const pickupPoints = {
        "Оренбург": [
            "ул. Салмышская, 49", "ул. Чкалова 26/1", "ул. Володарского, 14", "ул. Аксакова, 8",
            "ул. Пролетарская, 294", "пр-т Победы, 20", "Загородное шоссе, 36/2 стр. 1",
            "ул. 8 марта, д. 42 ТРЦ ВОСХОД", "ул. Берёзовая Ростошь, 2а", "ул. Новая, 4 ТРК Гулливер",
            "Нежинское шоссе, 2а ТРЦ Армада 2", "пр-т Дзержинского 23 ТРЦ Север",
            "ул. Салмышская, 41 ТРЦ Новый Мир", "ул. Беляевская, 19/1",
            "Шарлыкское шоссе, 1/2 Мегамолл Мармелад", "ул. Советская, 13", "ул. Советская, 44"
        ],
        "Тула": ["Тула, ул. Ленина, 1"],
        "Москва": ["Москва, ул. Тверская, 10"]
    };

    function openModal() {
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        renderPickup();
    }

    function closeModal() {
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
    }

    function setMode(mode) {
        toggleBtns.forEach(b => b.classList.toggle("is-active", b.dataset.mode === mode));
        if (mode === "pickup") {
            pickupBlock.style.display = "";
            deliveryBlock.style.display = "none";
            renderPickup();
        } else {
            pickupBlock.style.display = "none";
            deliveryBlock.style.display = "";
        }
        modal.dataset.mode = mode;
    }

    function renderPickup() {
        const city = citySelect.value;
        const list = pickupPoints[city] || [];
        pickupList.innerHTML = "";

        list.forEach(addr => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "addrItem";
            item.textContent = addr;
            item.onclick = () => {
                document.querySelectorAll(".addrItem").forEach(x => x.classList.remove("is-selected"));
                item.classList.add("is-selected");
                pickupList.dataset.selected = addr;
            };
            pickupList.appendChild(item);
        });

        pickupList.dataset.selected = "";
    }

    // Load saved
    const saved = localStorage.getItem("rb_addr");
    if (saved) {
        try {
            const data = JSON.parse(saved);
            addrText.textContent = data.text || "Выберите адрес";
            citySelect.value = data.city || citySelect.value;
            setMode(data.mode || "pickup");
            if (data.mode === "delivery") deliveryInput.value = data.address || "";
        } catch { }
    } else {
        setMode("pickup");
    }

    btn?.addEventListener("click", openModal);

    modal.addEventListener("click", (e) => {
        if (e.target?.dataset?.close) closeModal();
    });

    toggleBtns.forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));

    citySelect.addEventListener("change", () => {
        if ((modal.dataset.mode || "pickup") === "pickup") renderPickup();
    });

    saveBtn.addEventListener("click", () => {
        const mode = modal.dataset.mode || "pickup";
        const city = citySelect.value;

        let text = "";
        let payload = { mode, city };

        if (mode === "pickup") {
            const selected = pickupList.dataset.selected;
            if (!selected) {
                alert("Выберите точку самовывоза");
                return;
            }
            text = `${city}, ${selected}`;
            payload.text = text;
            payload.pickup_point = selected;
        } else {
            const addr = deliveryInput.value.trim();
            if (!addr) {
                alert("Введите адрес доставки");
                return;
            }
            text = `${city}, ${addr}`;
            payload.text = text;
            payload.address = addr;
        }

        localStorage.setItem("rb_addr", JSON.stringify(payload));
        addrText.textContent = text;
        closeModal();

        // НОВОЕ: Если мы на странице оформления заказа, перезагружаем ее, чтобы применить новый адрес
        if (window.location.pathname === '/cart') {
            window.location.reload();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal();
    });
})();