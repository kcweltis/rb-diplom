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

    // Данные точек (позже перенесём в БД и будем отдавать через API)
    const pickupPoints = {
        "Оренбург": [
            "ул. Аксакова 8",
            "ул. Пролетарская 294",
            "ТРЦ ... (пример)"
        ],
        "Тула": ["ул. ... 1", "ул. ... 2"],
        "Москва": ["ул. ... 10"]
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
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal();
    });
})();
