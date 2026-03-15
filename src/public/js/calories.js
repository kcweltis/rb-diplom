document.addEventListener('DOMContentLoaded', () => {
  // 1. Фильтрация категорий
  const catBtns = document.querySelectorAll('.calc-cat-btn');
  const prodCards = document.querySelectorAll('.calc-prod-card');

  catBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      catBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const catId = btn.getAttribute('data-id');
      prodCards.forEach(card => {
        if (catId === 'all' || card.getAttribute('data-cat') === catId) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // 2. Логика рабочей области калькулятора
  let selectedItems = [];
  const addBtns = document.querySelectorAll('.calc-add-btn');
  const selectedListEl = document.getElementById('selectedItemsList');
  const clearBtn = document.getElementById('clearCalcBtn');

  // Элементы итогов
  const totPEl = document.getElementById('totP');
  const totFEl = document.getElementById('totF');
  const totCEl = document.getElementById('totC');
  const totKEl = document.getElementById('totK');

  // Функция обновления экрана
  function renderSelected() {
    if (selectedItems.length === 0) {
      selectedListEl.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #999; padding: 40px; border: 2px dashed #ddd; border-radius: 16px;">Вы пока не добавили ни одного блюда.<br>Нажмите на <b>зеленый плюсик</b> в меню выше!</div>';
      totPEl.innerText = '0.0'; totFEl.innerText = '0.0'; totCEl.innerText = '0.0'; totKEl.innerText = '0';
      return;
    }

    let html = '';
    let totalP = 0, totalF = 0, totalC = 0, totalK = 0;

    selectedItems.forEach((item, index) => {
      totalP += item.p; totalF += item.f; totalC += item.c; totalK += item.k;

      html += `
        <div class="calc-sel-item">
          <button class="calc-remove-btn" onclick="removeItem(${index})">&times;</button>
          <img src="${item.img}" class="calc-sel-img">
          <div class="calc-sel-title">${item.name}</div>
          
          <div class="calc-nutri-row" style="padding: 4px 0;"><span>Белки, г.</span><span>${item.p.toFixed(1)}</span></div>
          <div class="calc-nutri-row" style="padding: 4px 0;"><span>Жиры, г.</span><span>${item.f.toFixed(1)}</span></div>
          <div class="calc-nutri-row" style="padding: 4px 0; border: none;"><span>Углеводы, г.</span><span>${item.c.toFixed(1)}</span></div>
          
          <div class="calc-sel-kcal">${item.k}</div>
          <div class="calc-sel-lbl">ККАЛ.</div>
        </div>
      `;
    });

    selectedListEl.innerHTML = html;
    totPEl.innerText = totalP.toFixed(1);
    totFEl.innerText = totalF.toFixed(1);
    totCEl.innerText = totalC.toFixed(1);
    totKEl.innerText = totalK;
  }

  // Добавление блюда (по кнопке +)
  addBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedItems.push({
        id: btn.getAttribute('data-id'),
        name: btn.getAttribute('data-name'),
        img: btn.getAttribute('data-img'),
        p: parseFloat(btn.getAttribute('data-p')) || 0,
        f: parseFloat(btn.getAttribute('data-f')) || 0,
        c: parseFloat(btn.getAttribute('data-c')) || 0,
        k: parseInt(btn.getAttribute('data-k')) || 0
      });
      renderSelected();
    });
  });

  // Глобальная функция удаления для кнопок-крестиков
  window.removeItem = function (index) {
    selectedItems.splice(index, 1);
    renderSelected();
  };

  // Кнопка очистки всего
  clearBtn.addEventListener('click', () => {
    selectedItems = [];
    renderSelected();
  });

  // 3. Логика модального окна Суточной нормы
  const normModal = document.getElementById('normModal');
  const openNormBtn = document.getElementById('openNormModalBtn');
  const closeNormBtn = document.getElementById('closeNormModalBtn');
  const calcNormBtn = document.getElementById('calculateNormBtn');
  const userNormVal = document.getElementById('userNormValue');

  openNormBtn.addEventListener('click', () => normModal.classList.add('is-open'));
  closeNormBtn.addEventListener('click', () => normModal.classList.remove('is-open'));

  // Формула Миффлина-Сан Жеора
  calcNormBtn.addEventListener('click', () => {
    const gender = document.querySelector('input[name="calcGender"]:checked').value;
    const age = parseInt(document.getElementById('calcAge').value);
    const weight = parseFloat(document.getElementById('calcWeight').value);
    const height = parseFloat(document.getElementById('calcHeight').value);
    const activity = parseFloat(document.getElementById('calcActivity').value);

    if (!age || !weight || !height) {
      return alert('Пожалуйста, заполните все поля!');
    }

    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    bmr += (gender === 'm') ? 5 : -161;

    const dailyNorm = Math.round(bmr * activity);

    userNormVal.innerText = dailyNorm;
    normModal.classList.remove('is-open');
  });
});