const csvUrl = 'https://raw.githubusercontent.com/AkhHas2005/APX/main/Product%20Links%20-%20ProductData.csv';
const scriptUrl = 'https://script.google.com/macros/s/AKfycbxL5ehds4Emw4xAESZkWKszNCdFHDdnKLV-Id4POGgxMqdnlpMwufljbJXCSHprK5RNNw/exec';

document.addEventListener("DOMContentLoaded", buildForm);

function normalizeProductName(name) {
  if (name.startsWith("Junior ")) return name.replace("Junior ", "") + " (Junior)";
  if (name.startsWith("Adult ")) return name.replace("Adult ", "") + " (Adult)";
  return name;
}

async function parseCsv(url) {
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log("CSV text received:", text.substring(0, 500) + "...");
    
    const rows = text.trim().split('\n').map(row => {
      // Handle CSV with proper comma parsing (account for quotes)
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
    
    console.log("Parsed rows sample:", rows.slice(0, 5));
    
    const map = {};
    for (let i = 1; i < rows.length; i++) {
      const [name, imageUrl] = rows[i];
      if (name && name.trim()) {
        const cleanName = name.trim().replace(/"/g, '');
        const cleanImageUrl = imageUrl ? imageUrl.trim().replace(/"/g, '') : '';
        
        // Automatically determine sizes based on product name
        const sizes = determineSizes(cleanName);
        
        map[cleanName] = {
          image: cleanImageUrl,
          sizes: sizes
        };
        
        console.log(`Mapped "${cleanName}":`, map[cleanName]);
      }
    }
    
    console.log("Final productData map:", map);
    return map;
  } catch (error) {
    console.error("Error parsing CSV:", error);
    return {};
  }
}

// Add this new function to determine sizes automatically
function determineSizes(productName) {
  const lowerName = productName.toLowerCase();
  
  // Check if it's a junior item
  const isJunior = lowerName.includes('junior') || lowerName.includes('(junior)');
  
  // Check if it's socks
  const isSocks = lowerName.includes('socks');
  
  // Check if it's training gloves (which should be one size)
  const isGloves = lowerName.includes('gloves') || lowerName.includes('glove');
  
  // Check if it's accessories (one size items)
  const oneTimeItems = [
    'towel', 'backpack', 'sliders', 'bucket hat', 'snood', 'bobble hat'
  ];
  const isOneSize = oneTimeItems.some(item => lowerName.includes(item)) || isGloves;
  
  if (isOneSize) {
    return ["One Size"];
  } else if (isSocks) {
    if (isJunior) {
      return ["7-12", "12-3"];
    } else {
      return ["4-7", "8-12"];
    }
  } else if (isJunior) {
    return ["YXXS", "YXS", "YS", "YM", "YL", "XS"];
  } else {
    // Adult clothing items
    return ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"];
  }
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

  const personalisedItems = {
    nameAndNumber: [
      "Home Match T-Shirt", "Home Match Shirt (Long Sleeve)", "Away Match T-Shirt", "Away Match Shirt (Long Sleeve)",
      "Sub Training T-Shirt", "Sub Training Vest"
    ],
    numberOnly: [
      "Home Match Shorts", "Away Match Shorts", "1/4 Zip Tracksuit Top", "Zipped Hoodie", "Track Pants"
    ]
  };

  selectedProducts.forEach((original, i) => {
    const trueName = normalizeProductName(original);
    
    console.log(`\n=== Processing Product ${i}: ${original} -> ${trueName} ===`);
    
    // Try to find club-specific version first
    let data = null;
    let displayImage = "";
    let sizes = [];
    
    // Check if we have club-specific data
    const clubData = productData[`${name} ${trueName}`];
    const defaultData = productData[trueName];
    
    console.log(`Club data for "${name} ${trueName}":`, clubData);
    console.log(`Default data for "${trueName}":`, defaultData);
    
    if (clubData) {
      // Use club-specific data
      data = clubData;
      displayImage = clubData.image || "";
      sizes = clubData.sizes || determineSizes(trueName);
      console.log(`Using club-specific data with sizes:`, sizes);
    } else if (defaultData) {
      // Use default data
      data = defaultData;
      displayImage = defaultData.image || "";
      sizes = defaultData.sizes || determineSizes(trueName);
      console.log(`Using default data with sizes:`, sizes);
    } else {
      // Fallback - create data with automatic size determination
      sizes = determineSizes(trueName);
      displayImage = "";
      console.log(`No data found, using automatic sizes:`, sizes);
    }
    
    // Ensure we have valid sizes
    if (!sizes || sizes.length === 0) {
      sizes = determineSizes(trueName);
      console.log(`Fallback to automatic size determination:`, sizes);
    }
    
    const productId = `product_${i}`;
    const baseName = trueName.replace(/ \(Junior\)| \(Adult\)/, "");

    console.log(`Final result for ${trueName}:`, { sizes, displayImage });

    form.innerHTML += `<h3 style="margin-top:30px;">${trueName}</h3>
      <input type="hidden" name="${productId}_name" value="${trueName}">
      <table><thead><tr>
        <th style="width: 200px;">${displayImage ? `<img src="${displayImage}">` : ""}</th>
        ${sizes.map(size => `<th style="width: 80px; min-width: 60px;">${size}</th>`).join('')}
      </tr></thead><tbody><tr><td>Qty</td>
        ${sizes.map(size => `<td><input type="number" name="${productId}_${size}" min="0" value="0" style="width: 60px;"
          oninput="updatePersonalisation('${productId}', '${trueName}', '${size}', this.value)"></td>`).join('')}
      </tr></tbody></table>`;

    if (personalisedItems.nameAndNumber.includes(baseName)) {
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
