let categories = [];
let productMap = {};
let filteredCodes = [];

document.getElementById("loadData").addEventListener("click", async () => {
  const res = await fetch("https://raw.githubusercontent.com/AkhHas2005/APX/main/data/2024%20Master%20Price%20List.csv");
  const text = await res.text();
  parseCSV(text);
  renderProductInputs();
});

document.getElementById("searchInput").addEventListener("input", () => {
  const query = document.getElementById("searchInput").value.toLowerCase();
  filteredCodes = Object.keys(productMap).filter(code => {
    const item = productMap[code];
    return code.toLowerCase().includes(query) || item.name.toLowerCase().includes(query);
  });
  updateDropdowns();
});

function parseCSV(data) {
  categories = [];
  productMap = {};
  let currentCat = null;

  data.split("\n").forEach(line => {
    const cols = line.split(",").map(col => col.trim());
    if (cols.length < 2 || !cols[1]) return;

    if (cols.some(c => c.toUpperCase() === "WSP")) {
      currentCat = { name: cols[0], items: [] };
      categories.push(currentCat);
      return;
    }

    const code = cols[1];
    if (currentCat && code.startsWith("APX/")) {
      const cleanNumber = val => parseFloat(val?.replace(/[£�]/g, "")) || 0;
      const item = {
        name: cols[0],
        code,
        wsp: cleanNumber(cols[3]),
        prices: {
          C: cleanNumber(cols[4]),
          B: cleanNumber(cols[6]),
          A: cleanNumber(cols[8]),
          "A+": cleanNumber(cols[10])
        }
      };
      currentCat.items.push(item);
      productMap[code] = item;
    }
  });
}

function renderProductInputs() {
  const container = document.getElementById("productList");
  container.innerHTML = "";
  addProductRow(container, false);

  const addBtn = document.createElement("button");
  addBtn.textContent = "Add Item";
  addBtn.className = "add-item-btn";
  addBtn.style.marginRight = "8px";
  addBtn.addEventListener("click", () => addProductRow(container, true));
  container.appendChild(addBtn);

  const calcBtn = document.createElement("button");
  calcBtn.textContent = "Calculate Profit";
  calcBtn.addEventListener("click", calculateProfit);
  container.appendChild(calcBtn);
}

function addProductRow(container, isRemovable) {
  const row = document.createElement("div");
  row.className = "product-row";

  const select = document.createElement("select");
  select.className = "product-select";

  populateDropdown(select);
  row.appendChild(select);

  const qty = document.createElement("input");
  qty.type = "number";
  qty.min = 0;
  qty.value = 0;
  qty.className = "qty-input";
  row.appendChild(qty);

  if (isRemovable) {
    const rm = document.createElement("button");
    rm.textContent = "Remove";
    rm.addEventListener("click", () => row.remove());
    row.appendChild(rm);
  }

  const addBtn = container.querySelector(".add-item-btn");
  if (addBtn) {
    container.insertBefore(row, addBtn);
  } else {
    container.appendChild(row);
  }
}

function populateDropdown(select) {
  select.innerHTML = "";
  categories.forEach(cat => {
    const optg = document.createElement("optgroup");
    optg.label = cat.name;
    cat.items.forEach(it => {
      if (filteredCodes.length === 0 || filteredCodes.includes(it.code)) {
        const opt = document.createElement("option");
        opt.value = it.code;
        opt.textContent = `${it.name} (${it.code})`;
        optg.appendChild(opt);
      }
    });
    if (optg.children.length > 0) select.appendChild(optg);
  });
}

function updateDropdowns() {
  document.querySelectorAll(".product-select").forEach(select => {
    populateDropdown(select);
  });
}

function calculateProfit() {
  const tier = document.getElementById("tier").value.trim();
  const discount = parseFloat(document.getElementById("discount").value) || 0;
  let totalCost = 0, totalRevenue = 0;

  document.querySelectorAll(".product-row").forEach(row => {
    const code = row.querySelector(".product-select").value;
    const qty = parseInt(row.querySelector(".qty-input").value) || 0;
    if (!code || qty <= 0) return;

    const item = productMap[code];
    if (!item) return;

    const costPer = item.wsp;
    const priceTierValue = item.prices[tier] ?? 0;
    const sellPer = priceTierValue * (1 - discount / 100);

    totalCost += costPer * qty;
    totalRevenue += sellPer * qty;
  });

  const profit = totalRevenue - totalCost;
  const profitPercentage = totalRevenue !== 0 ? (profit / totalRevenue) * 100 : 0;

  document.getElementById("results").innerHTML = `
    <p>Total Cost: £${totalCost.toFixed(2)}</p>
    <p>Total Revenue: £${totalRevenue.toFixed(2)}</p>
    <p><strong>Profit: £${profit.toFixed(2)}</strong></p>
    <p><strong>Profit Margin: ${profitPercentage.toFixed(2)}%</strong></p>
  `;
}
