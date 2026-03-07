(function () {
  const list = document.getElementById("calList");
  const addBtn = document.getElementById("addLine");
  const sumKcalEl = document.getElementById("sumKcal");
  const sumWeightEl = document.getElementById("sumWeight");

  function optionHTML(p) {
    const kcalPortion = Math.round((Number(p.weight_g) * Number(p.kcal_100g)) / 100);
    return `<option value="${p.id}"
      data-w="${p.weight_g}" data-k100="${p.kcal_100g}" data-kp="${kcalPortion}">
      ${p.name}
    </option>`;
  }

  function recalc() {
    let sumK = 0;
    let sumW = 0;

    list.querySelectorAll(".calLine").forEach(line => {
      const sel = line.querySelector("select");
      const qty = Number(line.querySelector("input").value || 1);

      const opt = sel.selectedOptions[0];
      const w = Number(opt.dataset.w);
      const kp = Number(opt.dataset.kp);

      const totalK = kp * qty;
      const totalW = w * qty;

      line.querySelector("[data-out='portion']").textContent = `${w} г`;
      line.querySelector("[data-out='kcal']").textContent = `${kp} ккал`;
      line.querySelector("[data-out='total']").textContent = `${totalK} ккал`;

      sumK += totalK;
      sumW += totalW;
    });

    sumKcalEl.textContent = `${sumK} ккал`;
    sumWeightEl.textContent = `${sumW} г`;
  }

  function addLine() {
    const html = `
      <div class="calRow calLine">
        <select class="calSelect">
          ${PRODUCTS.map(optionHTML).join("")}
        </select>

        <div data-out="portion" class="muted">—</div>
        <div data-out="kcal" class="muted">—</div>

        <input class="calInput" type="number" min="1" value="1">

        <div data-out="total" class="muted">—</div>

        <button class="calRemove" type="button" title="Удалить">×</button>
      </div>
    `;
    list.insertAdjacentHTML("beforeend", html);

    const line = list.lastElementChild;
    line.querySelector("select").addEventListener("change", recalc);
    line.querySelector("input").addEventListener("input", recalc);
    line.querySelector(".calRemove").addEventListener("click", () => { line.remove(); recalc(); });

    recalc();
  }

  addBtn.addEventListener("click", addLine);

  if (PRODUCTS.length) addLine();
})();