// main.js

// === Google API Initialization ===
function waitForGapi() {
  return new Promise((resolve) => {
    const check = () => {
      if (window.gapi) resolve();
      else setTimeout(check, 100);
    };
    check();
  });
}

async function initializeAPIs() {
  await waitForGapi();
  gapi.load("client:auth2", async () => {
    try {
      await gapi.client.init({
        clientId: "268508341021-3caat1nd0auvg2l8tr5rbdhs2mpsp67p.apps.googleusercontent.com",
        scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/gmail.send"
      });

      await gapi.client.load("gmail", "v1");
      await gapi.client.load("sheets", "v4");
      await gapi.client.load("drive", "v3");

      const authInstance = gapi.auth2.getAuthInstance();
      if (!authInstance.isSignedIn.get()) {
        await authInstance.signIn();
      }

      console.log("✅ All APIs authenticated successfully");
    } catch (err) {
      console.error("❌ API initialization failed:", err.message || err);
    }
  });
}

// === Helpers ===
const normalizeProductName = name => {
  if (name.startsWith("Junior ")) return name.replace("Junior ", "") + " (Junior)";
  if (name.startsWith("Adult ")) return name.replace("Adult ", "") + " (Adult)";
  return name;
};

const parseCsv = async (url) => {
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.trim().split('\n');
  const map = {};
  const clubProductMap = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = [];
    let current = '', inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        columns.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    columns.push(current.trim());

    const [name, imageUrl, sizesRaw] = columns;
    if (name && name.trim()) {
      const cleanName = name.trim();
      let sizes = [];
      if (sizesRaw && sizesRaw.trim()) {
        const cleanSizes = sizesRaw.replace(/^["']|["']$/g, '').trim();
        if (cleanSizes) {
          sizes = cleanSizes.split(',').map(s => s.trim()).filter(s => s);
        }
      }
      if (sizes.length === 0) sizes = ["One Size"];

      const productData = {
        image: imageUrl ? imageUrl.trim() : "",
        sizes
      };

      map[cleanName] = productData;

      const clubMatch = cleanName.match(/^(.+?)\s+(Match|Training|Polo|Leisure|Crew|1\/4|Full|Zipped|Goalkeeper|WARRIOR|CENTURION|TITAN|ELITE|Draw|Sublimated)/);
      if (clubMatch) {
        const clubName = clubMatch[1];
        const productPart = cleanName.replace(clubName + ' ', '');
        if (!clubProductMap[clubName]) clubProductMap[clubName] = {};
        clubProductMap[clubName][productPart] = productData;
      }
    }
  }

  return { map, clubProductMap };
};

// === Personalisation Handler ===
function updatePersonalisation(productId, trueName, size, count) {
  const baseName = trueName.replace(/ \(Junior\)| \(Adult\)/, "");
  const tbody = document.getElementById(productId + "_personalisationBody");
  if (!tbody) return;

  const currentRows = Array.from(tbody.querySelectorAll(`tr[data-size="${size}"]`));
  count = parseInt(count);
  if (!count || count <= 0) {
    currentRows.forEach(row => row.remove());
    return;
  }

  const diff = count - currentRows.length;
  if (diff > 0) {
    for (let i = currentRows.length; i < count; i++) {
      const tr = document.createElement("tr");
      tr.dataset.size = size;

      if (["Match T-Shirt", "Match Shirt (Long Sleeve)", "Goalkeeper Shirt (Long Sleeve)", "Training T-Shirt", "1/4 Zip Sweatshirt", "Zipped Hoodie"].includes(baseName)) {
        tr.innerHTML += `<td><input type="text" name="${productId}_name_${size}_${i}" placeholder="Optional"></td>`;
        tr.innerHTML += `<td><input type="text" name="${productId}_number_${size}_${i}" placeholder="Optional"></td>`;
      } else if (["Track Pants", "Match Shorts"].includes(baseName)) {
        tr.innerHTML += `<td><input type="text" name="${productId}_number_${size}_${i}" placeholder="Optional"></td>`;
      }

      tr.innerHTML += `<td><input type="hidden" name="${productId}_size_${size}_${i}" value="${size}">${size}</td>`;
      tbody.appendChild(tr);
    }
  } else {
    for (let i = currentRows.length - 1; i >= count; i--) {
      currentRows[i].remove();
    }
  }
}

// === Form Builder ===
async function buildForm() {
  const csvUrl = "https://raw.githubusercontent.com/AkhHas2005/APX/main/Product%20Links%20-%20ProductData.csv";
  const urlParams = new URLSearchParams(window.location.search);
  const name = urlParams.get("name") || "";
  const email = urlParams.get("email") || "";
  const phone = urlParams.get("phone") || "";
  const salesManager = urlParams.get("salesManager") || "";
  const productsParam = urlParams.get("products") || "";
  const selectedProducts = productsParam.split(",").map(p => decodeURIComponent(p.trim())).filter(p => p);

  document.getElementById("formHeading").innerText = `Select Sizes & Quantities for ${name}`;
  const { map: productData, clubProductMap } = await parseCsv(csvUrl);
  const form = document.getElementById("sizeForm");

  form.innerHTML += `<input type="hidden" name="name" value="${name}">
                     <input type="hidden" name="email" value="${email}">
                     <input type="hidden" name="phone" value="${phone}">
                     <input type="hidden" name="salesManager" value="${salesManager}">
                     <input type="hidden" name="productCount" value="${selectedProducts.length}">`;

  selectedProducts.forEach((original, i) => {
    const trueName = normalizeProductName(original);
    const baseName = trueName.replace(/ \(Junior\)| \(Adult\)/, "");
    const defaultData = productData[trueName];
    let data = null;
    let displayImage = "";
    let sizes = [];

    if (clubProductMap[name] && clubProductMap[name][trueName]) {
      data = clubProductMap[name][trueName];
      sizes = data.sizes.length ? data.sizes : defaultData?.sizes || ["One Size"];
      displayImage = data.image || defaultData?.image || "";
    } else {
      data = defaultData;
      sizes = data?.sizes || ["One Size"];
      displayImage = data?.image || "";
    }

    const productId = `product_${i}`;
    form.innerHTML += `<h3 style="margin-top:30px;">${trueName}</h3>
      <input type="hidden" name="${productId}_name" value="${trueName}">
      <table><thead><tr>
        <th style="width: 200px;">${displayImage ? `<img src="${displayImage}">` : ""}</th>
        ${sizes.map(size => `<th style="width: 80px;">${size}</th>`).join("")}
      </tr></thead><tbody><tr><td>Qty</td>
        ${sizes.map(size => `<td><input type="number" name="${productId}_${size}" min="0" value="0" style="width: 60px;"
          oninput="updatePersonalisation('${productId}', '${trueName}', '${size}', this.value)"></td>`).join("")}
      </tr></tbody></table>`;

    if (["Match T-Shirt", "Match Shirt (Long Sleeve)", "Goalkeeper Shirt (Long Sleeve)", "Training T-Shirt", "1/4 Zip Sweatshirt", "Zipped Hoodie"].includes(baseName)) {
      form.innerHTML += `
        <h4>Personalisation for ${trueName}</h4>
        <table><thead><tr><th>Name</th><th>Number</th><th>Size</th></tr></thead>
        <tbody id="${productId}_personalisationBody"></tbody>
        </table>`;
    } else if (["Track Pants", "Match Shorts"].includes(baseName)) {
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

  form.onsubmit = async function (e) {
    e.preventDefault();
    const formData = new FormData(form);
    const formObject = Object.fromEntries(formData.entries());
    const name = formObject.name;
    const fileName = `Order – ${name}`;

    try {
      await initializeAPIs();
      const templateId = "1XSD8U61u4loh6j-ulQGMsaJ6EiT95zDR0X4_liHXbhQ";
      const spreadsheetId = await cloneTemplate(templateId, name);
      await fillSpreadsheet(spreadsheetId, formObject, name);
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
      await submitOrder(formObject, spreadsheetId, spreadsheetUrl);
      exportSheetAsExcel(spreadsheetId, fileName);
      document.getElementById("responseMsg").innerText = `✅ Order submitted and emailed successfully.`;
    } catch (err) {
      console.error("❌ Submission failed:", err.message || err);
      document.getElementById("responseMsg").innerText = `❌ Something went wrong. Please try again.`;
    }
  };
}

// === Run on page load ===
document.addEventListener("DOMContentLoaded", buildForm);
