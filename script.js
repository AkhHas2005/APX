// script.js

let categories = [];
let productMap = {};

document.getElementById("loadData").addEventListener("click", async () => {
  const res  = await fetch("https://raw.githubusercontent.com/AkhHas2005/APX/main/data/2024%20Master%20Price%20List.csv");
  const text = await res.text();
  parseCSV(text);
  renderProductInputs();
});

function parseCSV(data) {
  categories = [];
  productMap = {};
  let currentCat = null;

  data.split("\n").forEach(line => {
    const trimmedLine = line.trim();

    // Skip empty or comma-only lines
    if (/^,*$/.test(trimmedLine)) {
      currentCat = null;
      return;
    }

    const cols = line.split(",").map(col => col.trim());

    // Detect category header by "WSP" in any cell
    if (cols.some(c => c.toUpperCase() === "WSP")) {
      currentCat = { name: cols[0], items: [] };
      categories.push(currentCat);
      return;
    }

    // Product row check: second column starts with APX/
    const code = cols[1];
    if (currentCat && code && code.startsWith("APX/")) {
      const cleanNumber = val => parseFloat(val?.replace(/[£�]/g, "")) || 0;

      const item = {
        name: cols[0],
        code,
        wsp: cleanNumber(cols[3]),
        prices: {
          C:    cleanNumber(cols[4]),
          B:    cleanNumber(cols[6]),
          A:    cleanNumber(cols[8]),
          "A+": cleanNumber(cols[10])
        }
      };

      currentCat.items.push(item);
      productMap[code] = item;
    }
  });

  console.log("Parsed productMap:", productMap);
}

function renderProductInputs() {
  const container = document.getElementById("productList");
  container.innerHTML = "";

  // Initial product row
  addProductRow(container, false);

  // Add Item button
  const addBtn = document.createElement("button");
  addBtn.textContent = "Add Item";
  addBtn.className = "add-item-btn";
  addBtn.style.marginRight = "8px";
  addBtn.addEventListener("click", () => addProductRow(container, true));
  container.appendChild(addBtn);

  // Calculate button
  const calcBtn = document.createElement("button");
  calcBtn.textContent = "Calculate Profit";
  calcBtn.addEventListener("click", calculateProfit);
  container.appendChild(calcBtn);
}

function addProductRow(container, isRemovable) {
  const row = document.createElement("div");
  row.className = "product-row";
  row.style.margin = "4px 0";

  // Product selector with category grouping
  const select = document.createElement("select");
  select.className = "product-select";
  select.style.marginRight = "8px";

  categories.forEach(cat => {
    const optg = document.createElement("optgroup");
    optg.label = cat.name;
    cat.items.forEach(it => {
      const opt = document.createElement("option");
      opt.value = it.code;
      opt.textContent = `${it.name} (${it.code})`;
      optg.appendChild(opt);
    });
    select.appendChild(optg);
  });

  // Quantity input
  const qty = document.createElement("input");
  qty.type = "number";
  qty.min = 0;
  qty.value = 0;
  qty.className = "qty-input";
  qty.style.width = "60px";
  qty.style.marginRight = "8px";

  row.appendChild(select);
  row.appendChild(qty);

  // Remove button if allowed
  if (isRemovable) {
    const rm = document.createElement("button");
    rm.textContent = "Remove";
    rm.addEventListener("click", () => row.remove());
    row.appendChild(rm);
  }

  // Insert before the Add-Item button if it exists
  const addBtn = container.querySelector(".add-item-btn");
  if (addBtn) {
    container.insertBefore(row, addBtn);
  } else {
    container.appendChild(row);
  }
}

function calculateProfit() {
  const tier     = document.getElementById("tier").value.trim();
  const discount = parseFloat(document.getElementById("discount").value) || 0;
  let totalCost    = 0, totalRevenue = 0;

  document.querySelectorAll(".product-row").forEach(row => {
    const code = row.querySelector(".product-select").value;
    const qty  = parseInt(row.querySelector(".qty-input").value) || 0;
    if (!code || qty <= 0) return;

    const item = productMap[code];
    if (!item) {
      console.warn(`No product found for code: ${code}`);
      return;
    }

    const costPer = item.wsp;

    // Ensure correct tier key and fallback
    let priceTierValue = item.prices[tier];
    if (priceTierValue === undefined) {
      console.warn(`Price tier "${tier}" not found for code: ${code}`, item.prices);
      priceTierValue = 0; // or default to another tier if needed
    }

    const sellPer = priceTierValue * (1 - discount / 100);

    totalCost    += costPer * qty;
    totalRevenue += sellPer * qty;
  });

  const profit = totalRevenue - totalCost;
  const profitPercentage = totalCost !== 0 ? (profit / totalCost) * 100 : 0;

  document.getElementById("results").innerHTML = `
    <p>Total Cost: £${totalCost.toFixed(2)}</p>
    <p>Total Revenue: £${totalRevenue.toFixed(2)}</p>
    <p><strong>Profit: £${profit.toFixed(2)}</strong></p>
    <p><strong>Profit Margin: ${profitPercentage.toFixed(2)}%</strong></p>
  `;
}
