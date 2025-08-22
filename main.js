const csvUrl =
  "https://raw.githubusercontent.com/AkhHas2005/APX/main/Product%20Links%20-%20ProductData.csv";

let formSubmitted = false;

document.addEventListener("DOMContentLoaded", buildForm);

function normalizeProductName(name) {
  if (name.startsWith("Junior "))
    return name.replace("Junior ", "") + " (Junior)";
  if (name.startsWith("Adult ")) return name.replace("Adult ", "") + " (Adult)";
  return name;
}

async function parseCsv(url) {
  try {
    const res = await fetch(url);
    const text = await res.text();
    const rows = text
      .trim()
      .split("\n")
      .map((row) => {
        const result = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < row.length; i++) {
          const char = row[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      });

    const map = {};
    for (let i = 1; i < rows.length; i++) {
      const [name, imageUrl, productCode] = rows[i];
      if (name && name.trim()) {
        const rawName = name.trim().replace(/"/g, "");
        const trueName = normalizeProductName(rawName);
        const cleanImageUrl = imageUrl ? imageUrl.trim().replace(/"/g, "") : "";
        const cleanCode = productCode ? productCode.trim().replace(/"/g, "") : "";

        map[trueName] = {
          image: cleanImageUrl,
          code: cleanCode
        };
      }
    }
    return map;
  } catch (error) {
    console.error("Error parsing CSV:", error);
    return {};
  }
}

function determineSizes(trueName, ageGroup) {
  const lowerName = trueName.toLowerCase();

  const isJunior = ageGroup === "Junior";
  const isAdult = ageGroup === "Adult";
  const isSocks = lowerName.includes("socks");
  const isGloves = lowerName.includes("glove");
  const isOneSize = [
    "towel", "backpack", "sliders", "bucket hat", "snood",
    "bobble hat", "cap", "bag", "training socks"
  ].some(item => lowerName.includes(item)) || isGloves;

  if (isOneSize) return ["One Size"];

  if (isSocks) {
    return isJunior
      ? ["12-3 (S)", "4-6 (M)"]
      : ["4-6 (M)", "7-11 (L)", "12-14 (XL)"];
  }

  return isJunior
    ? ["YXXS", "YXS", "YS", "YM", "YL", "XS"]
    : ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"];
}

function updatePersonalisation(productId, trueName, size, count) {
  const tbody = document.getElementById(productId + "_personalisationBody");
  if (!tbody) return;

  const currentRows = Array.from(tbody.querySelectorAll(`tr[data-size="${size}"]`));
  count = parseInt(count);
  if (!count || count <= 0) {
    currentRows.forEach(row => row.remove());
    return;
  }

  const isTrainingWear = [
    "Sub Training T-Shirt",
    "Sub Training Vest",
    "1/4 Zip Tracksuit Top",
    "Zipped Hoodie"
  ].includes(trueName.replace(/ \(Junior\)| \(Adult\)/, ""));

  const isNameAndNumber = [
    "Home Match T-Shirt",
    "Home Match Shirt (Long Sleeve)",
    "Away Match T-Shirt",
    "Away Match Shirt (Long Sleeve)",
    "Sub Training T-Shirt",
    "Sub Training Vest"
  ].includes(trueName.replace(/ \(Junior\)| \(Adult\)/, ""));

  const isNumberOnly = [
    "Home Match Shorts",
    "Away Match Shorts",
    "1/4 Zip Tracksuit Top",
    "Zipped Hoodie",
    "Track Pants"
  ].includes(trueName.replace(/ \(Junior\)| \(Adult\)/, ""));

  for (let i = currentRows.length; i < count; i++) {
    const tr = document.createElement("tr");
    tr.dataset.size = size;

    if (isTrainingWear) {
      tr.innerHTML += `<td><input type="text" name="${productId}_initials_${size}_${i}" maxlength="3" style="text-transform:uppercase;" placeholder="Initials or Number"></td>`;
    } else if (isNameAndNumber) {
      tr.innerHTML += `<td><input type="text" name="${productId}_name_${size}_${i}" style="text-transform:uppercase;" placeholder="Name"></td>`;
      tr.innerHTML += `<td><input type="text" name="${productId}_number_${size}_${i}" maxlength="2" inputmode="numeric" pattern="[0-9]*" style="text-transform:uppercase;" placeholder="Number"></td>`;
    } else if (isNumberOnly) {
      tr.innerHTML += `<td><input type="text" name="${productId}_number_${size}_${i}" maxlength="2" inputmode="numeric" pattern="[0-9]*" style="text-transform:uppercase;" placeholder="Number"></td>`;
    }

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

  const selectedProducts = productsParam
    .split(",")
    .map((p) => {
      const [name, ageGroup] = decodeURIComponent(p.trim()).split("::");
      return { name, ageGroup };
    })
    .filter((p) => p.name && p.ageGroup);

  document.getElementById("formHeading").innerText = `Select Sizes & Quantities for ${name}`;
  const productData = await parseCsv(csvUrl);
  const form = document.getElementById("sizeForm");

  form.innerHTML += `<input type="hidden" name="name" value="${name}">
                     <input type="hidden" name="email" value="${email}">
                     <input type="hidden" name="phone" value="${phone}">
                     <input type="hidden" name="salesManager" value="${salesManager}">
                     <input type="hidden" name="productCount" value="${selectedProducts.length}">`;

  const personalisedItems = {
    nameAndNumber: [
      "Home Match T-Shirt",
      "Home Match Shirt (Long Sleeve)",
      "Away Match T-Shirt",
      "Away Match Shirt (Long Sleeve)",
      "Sub Training T-Shirt",
      "Sub Training Vest"
    ],
    numberOnly: [
      "Home Match Shorts",
      "Away Match Shorts",
      "1/4 Zip Tracksuit Top",
      "Zipped Hoodie",
      "Track Pants"
    ],
    trainingWear: [
      "Sub Training T-Shirt",
      "Sub Training Vest",
      "1/4 Zip Tracksuit Top",
      "Zipped Hoodie"
    ]
  };

  selectedProducts.forEach((original, i) => {
    const trueName = normalizeProductName(original.name);
    const ageGroup = original.ageGroup;
    const baseName = trueName.replace(/ \(Junior\)| \(Adult\)/, "");

    const clubSpecificKey = `${name} ${baseName}`;
    const defaultKey = baseName;

    const clubData = productData[clubSpecificKey];
    const defaultData = productData[defaultKey];

    const sizes = determineSizes(trueName, ageGroup);
    const imageUrl = clubData?.image || defaultData?.image || "";

    const productId = `product_${i}`;

    form.innerHTML += `<h3 style="margin-top:30px;">${trueName}</h3>
      <input type="hidden" name="${productId}_name" value="${trueName}">
      <table><thead><tr>
        <th style="width: 200px;">${imageUrl ? `<img src="${imageUrl}">` : ""}</th>
        ${sizes.map(size => `<th style="width: 80px; min-width: 60px;">${size}</th>`).join("")}
      </tr></thead><tbody><tr><td>Qty</td>
        ${sizes.map(size => `<td><input type="number" name="${productId}_${size}" min="0" value="0" style="width: 60px;"
          oninput="updatePersonalisation('${productId}', '${trueName}', '${size}', this.value)"></td>`).join("")}
      </tr></tbody></table>`;

    // Personalisation table
    if (personalisedItems.trainingWear.includes(baseName)) {
      form.innerHTML += `
        <h4>Personalisation for ${trueName}</h4>
        <table><thead><tr><th>Initials or Number</th><th>Size</th></tr></thead>
        <tbody id="${productId}_personalisationBody"></tbody>
        </table>`;
    } else if (personalisedItems.nameAndNumber.includes(baseName)) {
      form.innerHTML += `
        <h4>Personalisation for ${trueName}</h4>
        <table><thead><tr><th>Name</th><th>Number</th><th>Size</th></tr></thead>
        <tbody id="${productId}_personalisationBody"></tbody>
        </table>`;
    } else if (personalisedItems.numberOnly.includes(baseName)) {
      form.innerHTML += `
        <h4>Personalisation for ${trueName}</h4>
        <table><thead><tr><th>Number</th><th>Size</th></tr></thead>
        <tbody id="${productId}_personalisationBody"></tbody>
        </table>`;
    }
  });

  form.innerHTML += `<h3>Delivery Address</h3>
    <textarea name="deliveryAddress" rows="4" cols="50" required placeholder="Enter full delivery address"></textarea>
    <br><br>
    <button type="submit">Submit Final Order</button>`;
}

// Confirmation logic for after sizes form submitted
function showConfirmation() {
  if (!formSubmitted) {
    console.log("The form wasn't submitted!");
    return;
  }

  const msgDiv = document.getElementById("responseMsg");
  if (!msgDiv) { 
    console.log("The message div can't be found!");
    return;
  }

  const email = new URLSearchParams(window.location.search).get("email") || "your email";
  console.log("Customer's email is: ",email);
  msgDiv.innerHTML = `
    <h2 style="color: green; text-align: center; margin-top: 50px;">
      ✅ Your order is confirmed!<br>
      A confirmation email has been sent to <strong>${email}</strong>.<br>
      If you notice any issues, feel free to reach out to us directly.
    </h2>
  `;
}
