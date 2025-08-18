const csvUrl = 'https://raw.githubusercontent.com/AkhHas2005/APX/main/Product%20Links%20-%20ProductData.csv';
const scriptUrl = 'https://script.google.com/macros/s/AKfycbxL5ehds4Emw4xAESZkWKszNCdFHDdnKLV-Id4POGgxMqdnlpMwufljbJXCSHprK5RNNw/exec';

document.addEventListener("DOMContentLoaded", buildForm);

function normalizeProductName(name) {
  if (name.startsWith("Junior ")) return name.replace("Junior ", "") + " (Junior)";
  if (name.startsWith("Adult ")) return name.replace("Adult ", "") + " (Adult)";
  return name;
}

async function parseCsv(url) {
  const res = await fetch(url);
  const text = await res.text();
  const rows = text.trim().split('\n').map(row => row.split(','));
  const map = {};
  for (let i = 1; i < rows.length; i++) {
    const [name, imageUrl, sizesRaw] = rows[i];
    if (name) {
      map[name.trim()] = {
        image: imageUrl,
        sizes: (sizesRaw || '').split(',').map(s => s.trim()).filter(s => s)
      };
    }
  }
  return map;
}

function updatePersonalisation(productId, trueName, size, count) {
  const tbody = document.getElementById(productId + '_personalisationBody');
  const currentRows = Array.from(tbody.querySelectorAll(`tr[data-size="${size}"]`));
  count = parseInt(count);
  if (!count || count <= 0) {
    currentRows.forEach(row => row.remove());
    return;
  }

  const diff = count - currentRows.length;
  for (let i = currentRows.length; i < count; i++) {
    const tr = document.createElement('tr');
    tr.dataset.size = size;
    if (trueName.includes("Shirt")) {
      tr.innerHTML += `<td><input type="text" name="${productId}_name_${size}_${i}" placeholder="Optional"></td>`;
    }
    tr.innerHTML += `<td><input type="text" name="${productId}_number_${size}_${i}" placeholder="Optional"></td>`;
    tr.innerHTML += `<td><input type="hidden" name="${productId}_size_${size}_${i}" value="${size}">${size}</td>`;
    tbody.appendChild(tr);
  }

  for (let i = currentRows.length - 1; i >= count; i--) {
    currentRows[i].remove();
  }
}

async function buildForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const name = urlParams.get("name") || "";
  const email = urlParams.get("email") || "";
  const phone = urlParams.get("phone") || "";
  const salesManager = urlParams.get("salesManager") || "";
  const productsParam = urlParams.get("products") || "";
  const selectedProducts = productsParam.split(',').map(p => decodeURIComponent(p.trim())).filter(p => p);

  document.getElementById("formHeading").innerText = `Select Sizes & Quantities for ${name}`;
  const productData = await parseCsv(csvUrl);
  const form = document.getElementById('sizeForm');

  form.innerHTML += `<input type="hidden" name="name" value="${name}">
                     <input type="hidden" name="email" value="${email}">
                     <input type="hidden" name="phone" value="${phone}">
                     <input type="hidden" name="salesManager" value="${salesManager}">
                     <input type="hidden" name="productCount" value="${selectedProducts.length}">`;

  selectedProducts.forEach((original, i) => {
    const trueName = normalizeProductName(original);
    const data = productData[trueName] || { sizes: ["One Size"], image: "" };
    const sizes = data.sizes.length ? data.sizes : ["One Size"];
    const productId = `product_${i}`;

    form.innerHTML += `<h3 style="margin-top:30px;">${trueName}</h3>
      <input type="hidden" name="${productId}_name" value="${trueName}">
      <table><thead><tr>
        <th>${data.image ? `<img src="${data.image}">` : ""}</th>
        ${sizes.map(size => `<th>${size}</th>`).join('')}
      </tr></thead><tbody><tr><td>Qty</td>
        ${sizes.map(size => `<td><input type="number" name="${productId}_${size}" min="0" value="0"
          oninput="updatePersonalisation('${productId}', '${trueName}', '${size}', this.value)"></td>`).join('')}
      </tr></tbody></table>`;

    if (/Match T-Shirt|Match Shirt|Match Shorts/.test(trueName)) {
      form.innerHTML += `
        <h4>Personalisation for ${trueName}</h4>
        <table><thead><tr>${trueName.includes("Shirt") ? "<th>Name</th>" : ""}<th>Number</th><th>Size</th></tr></thead>
        <tbody id="${productId}_personalisationBody"></tbody>
        </table>`;
    }
  });

  form.innerHTML += `<h3>Delivery Address</h3>
    <textarea name="deliveryAddress" rows="4" cols="50" required placeholder="Enter full delivery address"></textarea>
    <br><br>
    <button type="submit">Submit Final Order</button>`;

  form.onsubmit = async function(e) {
    e.preventDefault();
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(scriptUrl, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" }
      });
      const result = await res.json();
      document.getElementById("responseMsg").innerHTML = result.message || "✅ Order submitted successfully.";
    } catch (err) {
      console.error("❌ Submission failed:", err);
      document.getElementById("responseMsg").innerText = "❌ Submission failed. Please try again.";
    }
  };
}
