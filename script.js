let products = [];

document.getElementById("loadData").addEventListener("click", async () => {
  const response = await fetch("data/master-price-list.csv");
  const csvText = await response.text();
  products = parseCSV(csvText);
  renderProductInputs(products);
});

function parseCSV(data) {
  const rows = data.split("\n").filter(r => r.includes("APX/"));
  return rows.map(row => {
    const cols = row.split(",");
    return {
      name: cols[0].trim(),
      code: cols[1].trim(),
      wsp: parseFloat(cols[3].replace("�", "")) || 0,
      prices: {
        C: parseFloat(cols[4]?.replace("�", "")) || 0,
        B: parseFloat(cols[6]?.replace("�", "")) || 0,
        A: parseFloat(cols[8]?.replace("�", "")) || 0,
        Aplus: parseFloat(cols[10]?.replace("�", "")) || 0
      }
    };
  });
}

function renderProductInputs(products) {
  const container = document.getElementById("productList");
  container.innerHTML = "";
  products.forEach((p, i) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <label>${p.name} (${p.code})</label>
      <input type="number" id="qty-${i}" placeholder="Qty" min="0" />
    `;
    container.appendChild(div);
  });

  const calcBtn = document.createElement("button");
  calcBtn.textContent = "Calculate Profit";
  calcBtn.addEventListener("click", calculateProfit);
  container.appendChild(calcBtn);
}

function calculateProfit() {
  const tier = document.getElementById("tier").value;
  const discount = parseFloat(document.getElementById("discount").value) || 0;
  let totalCost = 0, totalRevenue = 0;

  products.forEach((p, i) => {
    const qty = parseInt(document.getElementById(`qty-${i}`).value) || 0;
    const priceTier = tier === "A+" ? p.prices.Aplus : p.prices[tier];
    const discountedPrice = priceTier * (1 - discount / 100);
    totalCost += p.wsp * qty;
    totalRevenue += discountedPrice * qty;
  });

  const profit = totalRevenue - totalCost;
  document.getElementById("results").innerHTML = `
    <p>Total Cost: £${totalCost.toFixed(2)}</p>
    <p>Total Revenue: £${totalRevenue.toFixed(2)}</p>
    <p><strong>Profit: £${profit.toFixed(2)}</strong></p>
  `;
}
