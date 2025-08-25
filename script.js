let categories = [];
let productMap = {};
let filteredCodes = [];
let hasLoadedOnce = false;

document.getElementById("loadData").addEventListener("click", async () => {
  const res = await fetch("https://raw.githubusercontent.com/AkhHas2005/APX/main/data/2024%20Master%20Price%20List.csv");
  const text = await res.text();
  parseCSV(text);
  if (!hasLoadedOnce) {
    renderProductInputs();
    hasLoadedOnce = true;
  }
});

document.getElementById("searchInput").addEventListener("input", () => {
  const query = document.getElementById("searchInput").value.toLowerCase();
  filteredCodes = Object.keys(productMap).filter(code => {
    const item = productMap[code];
    return code.toLowerCase().includes(query) || item.name.toLowerCase().includes(query);
  });
  updateDropdowns();
});

function updateDropdowns() {
  document.querySelectorAll(".product-row").forEach(row => {
    const checkbox = row.querySelector(".filter-toggle");
    const select = row.querySelector(".product-select");
    const currentValue = select.value;

    if (checkbox.checked && filteredCodes.length > 0) {
      populateDropdown(select, filteredCodes);
    } else {
      populateDropdown(select); // show all
    }

    // Restore previous selection if still valid
    if (currentValue) {
      select.value = currentValue;
    }
  });
}

function populateDropdown(select, filterList = []) {
  select.innerHTML = "";
  categories.forEach(cat => {
    const optg = document.createElement("optgroup");
    optg.label = cat.name;
    cat.items.forEach(it => {
      if (filterList.length === 0 || filterList.includes(it.code)) {
        const opt = document.createElement("option");
        opt.value = it.code;
        opt.textContent = `${it.name} (${it.code})`;
        optg.appendChild(opt);
      }
    });
    if (optg.children.length > 0) select.appendChild(optg);
  });
}

function parseCSV(data) {
  categories = [];
  productMap = {};
  let currentCat = null;

  const lines = data
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !/^,*$/.test(line)); // remove blank and comma-only lines

  lines.forEach(line => {
    const cols = line.split(",").map(c => c.trim());
    const first = cols[0];
    const code = cols[1];

    // Start new category if first column is ALL CAPS
    const isAllCaps = /^[A-Z0-9 ()\-]+$/.test(first) && first === first.toUpperCase();
    if (isAllCaps) {
      currentCat = { name: first, items: [] };
      categories.push(currentCat);
      return;
    }

    // Skip rows without valid product code
    if (!code || !code.startsWith("APX/")) return;

    if (currentCat) {
      const clean = val => parseFloat(val?.replace(/[£� ]/g, "")) || 0;

      // Detect if column 3 is numeric (WSP), else shift columns
      const wspIndex = isNaN(clean(cols[3])) ? 4 : 3;
      const priceOffset = wspIndex;

      const item = {
        name: first,
        code,
        wsp: clean(cols[wspIndex]),
        prices: {
          C: clean(cols[priceOffset + 1]),
          B: clean(cols[priceOffset + 3]),
          A: clean(cols[priceOffset + 5]),
          "A+": clean(cols[priceOffset + 7])
        }
      };

      currentCat.items.push(item);
      productMap[item.code] = item;
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
  addBtn.title = "Adds a new product row to the calculator.";
  addBtn.addEventListener("click", () => addProductRow(container, true));
  container.appendChild(addBtn);

  const calcBtn = document.createElement("button");
  calcBtn.textContent = "Calculate Profit";
  calcBtn.title = "Calculates total cost, revenue, and profit margin based on selected products and quantities.";
  calcBtn.addEventListener("click", calculateProfit);
  container.appendChild(calcBtn);
}

function addProductRow(container, isRemovable) {
  const row = document.createElement("div");
  row.className = "product-row";

  const label = document.createElement("label");
  label.textContent = "Filter this row by search:";
  label.title = "If checked, this row's dropdown will be filtered by the search box above.";
  label.style.marginRight = "6px";

  const filterToggle = document.createElement("input");
  filterToggle.type = "checkbox";
  filterToggle.className = "filter-toggle";
  filterToggle.checked = true;
  filterToggle.title = "Toggle filtering for this row based on the search box.";

  row.appendChild(label);
  row.appendChild(filterToggle);

  const select = document.createElement("select");
  select.className = "product-select";
  select.title = "Select a product from the dropdown list.";
  row.appendChild(select);

  const qty = document.createElement("input");
  qty.type = "number";
  qty.min = 0;
  qty.value = 0;
  qty.className = "qty-input";
  qty.title = "Enter the quantity for this product.";
  row.appendChild(qty);

  if (isRemovable) {
    const rm = document.createElement("button");
    rm.textContent = "Remove";
    rm.title = "Remove this product row from Profit Calculations.";
    rm.addEventListener("click", () => row.remove());
    row.appendChild(rm);
  }

  const addBtn = container.querySelector(".add-item-btn");
  if (addBtn) {
    container.insertBefore(row, addBtn);
  } else {
    container.appendChild(row);
  }

  populateDropdown(select);
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
  const rounded = profitPercentage.toFixed(1);

  let color = "black";
  if (profitPercentage <= 20) color = "red";
  else if (profitPercentage <= 39.9) color = "orange";
  else color = "green";

  document.getElementById("results").innerHTML = `
    <p>Total Cost: £${totalCost.toFixed(2)}</p>
    <p>Total Revenue: £${totalRevenue.toFixed(2)}</p>
    <p><strong>Profit: £${profit.toFixed(2)}</strong></p>
    <p><strong style="color:${color}">Profit Margin: ${rounded}%</strong></p>
  `;
}
