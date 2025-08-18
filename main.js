// main.js

async function submitOrder(p, spreadsheetId, spreadsheetUrl) {
  const name = p.name || "Customer";
  const club = p.clubName || "Club";
  const email = p.email || "akhtarhasan2005@gmail.com";
  const phone = p.phone || "Not Provided";
  const address = p.deliveryAddress || "Not Provided";
  const salesManager = p.salesManager || "";
  const productCount = parseInt(p.productCount, 10);

  // Determine sales manager email
  const jamesEmail = "pythonprogramsha@gmail.com";
  const craigEmail = "fifautuber2016@gmail.com";
  const managerEmail = salesManager === "James" ? jamesEmail :
                       salesManager === "Craig" ? craigEmail :
                       "akhtarhasan2005@gmail.com";

  let orderSummary = `🛍️ Order Summary for ${name}\n\n`;

  for (let i = 0; i < productCount; i++) {
    const base = `product_${i}`;
    const productName = p[`${base}_name`];
    if (!productName) continue;

    orderSummary += `🔹 ${productName}\n`;
    const sizeQtyMap = {};

    Object.keys(p).forEach(key => {
      const match = key.match(new RegExp(`^${base}_(\\w+)$`));
      if (match && !key.includes('_name_') && !key.includes('_number_') && !key.includes('_size_')) {
        const size = match[1];
        const qty = parseInt(p[key], 10);
        if (qty > 0) {
          sizeQtyMap[size] = qty;
          orderSummary += `  • Size: ${size}, Qty: ${qty}\n`;
        }
      }
    });

    for (const size in sizeQtyMap) {
      for (let r = 0; r < sizeQtyMap[size]; r++) {
        const nameField = p[`${base}_name_${size}_${r}`];
        const numberField = p[`${base}_number_${size}_${r}`];

        const hasName = nameField && nameField.trim();
        const hasNumber = numberField && numberField.trim();
        if (hasName || hasNumber) {
          orderSummary += `    ↳ Personalised ${size} [#${r + 1}]: `;
          if (hasName) orderSummary += `Name: ${hasName} `;
          if (hasNumber) orderSummary += `Number: ${hasNumber}`;
          orderSummary += `\n`;
        }
      }
    }

    orderSummary += `\n`;
  }

  const clientSummary = orderSummary;
  const companySummary = `Dear Sales Rep,

A new kit order has been submitted via the APX Teamwear web app. Below are the client details and order contents:

👤 Customer Name: ${name}
🏘️ Club Name: ${club}
📧 Email: ${email}
📞 Phone: ${phone}
📦 Delivery Address:
${address}

—

${orderSummary}

🔗 Google Sheets Link:
${spreadsheetUrl}
`;

  try {
    // Send to appropriate sales manager
    await sendEmail(managerEmail, `New Kit Order from ${name}`, companySummary);
    if (email.includes("@")) {
      await sendEmail(email, `Your Kit Order Confirmation`, `Hi ${name},\n\nWe received your order:\n\n${clientSummary}\nThanks,\nAPX Performance`);
    }
    console.log(`✅ Emails sent successfully to ${salesManager} (${managerEmail})`);
  } catch (emailErr) {
    console.error("❌ Email sending failed:", emailErr);
  }
}

async function sendEmail(to, subject, body) {
  const base64EncodedEmail = btoa(
    `To: ${to}\r\n` +
    `Subject: ${subject}\r\n\r\n` +
    `${body}`
  ).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  await gapi.client.gmail.users.messages.send({
    userId: 'me',
    resource: {
      raw: base64EncodedEmail
    }
  });

  console.log("📨 Email sent to", to);
}

async function cloneTemplate(templateId, name) {
  const accessToken = gapi.auth.getToken().access_token;

  // Copy the spreadsheet
  const copyResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${templateId}/copy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: `Order – ${name} – ${new Date().toLocaleDateString('en-GB')}`,
      parents: ['1QKzgRa9MbTUEX0CFhkl8vKfSz-vAwE-E']
    })
  });
  
  const copyData = await copyResponse.json();
  return copyData.id; // This is the new spreadsheet ID
}

async function fillSpreadsheet(spreadsheetId, p, name) {
  const sizeColumns = {
    "YXXS": 10, "YXS": 11, "YS": 12, "YM": 13, "YL": 14,
    "XS": 15, "S": 16, "M": 17, "L": 18, "XL": 19,
    "2XL": 20, "3XL": 21, "4XL": 22, "5XL": 23, "6XL": 24,
    "12": 10, "1": 11, "2": 12, "3": 13, "4": 14, "5": 15, "6": 16,
    "7": 17, "8": 18, "9": 19, "10": 20, "11": 21,
    "One Size": 26
  };

  const sheetName = "Sheet1";
  const requests = [];

  // Basic header values
  const today = new Date();
  const orderDate = today.toLocaleDateString("en-GB");
  const shipDate = new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB");

  requests.push({
    updateCells: {
      fields: "userEnteredValue",
      rows: [
        { values: [{ userEnteredValue: { stringValue: orderDate } }] }, // G2
        { values: [{ userEnteredValue: { stringValue: shipDate } }] }, // G3
        { values: [{ userEnteredValue: { stringValue: name } }] },     // E5
        { values: [{ userEnteredValue: { stringValue: "NEW" } }] }     // L5
      ],
      start: { sheetId: 0, rowIndex: 1, columnIndex: 6 }
    }
  });

  const productCount = parseInt(p.productCount, 10);
  let rowCursor = 9;
  const personalisationRows = [];
  const productsToWrite = [];

  // Identify products with quantities
  for (let i = 0; i < productCount; i++) {
    const base = `product_${i}`;
    const productName = p[`${base}_name`];
    if (!productName) continue;

    const sizeQtyMap = {};
    Object.keys(p).forEach(key => {
      const match = key.match(new RegExp(`^${base}_(\\w+)$`));
      if (match && !key.includes("_name_") && !key.includes("_number_") && !key.includes("_size_")) {
        const size = match[1];
        const qty = parseInt(p[key], 10);
        if (qty > 0) sizeQtyMap[size] = qty;
      }
    });

    if (Object.values(sizeQtyMap).some(q => q > 0)) {
      productsToWrite.push({ index: i, name: productName, sizeQtyMap });
    }
  }

  // Write product rows
  productsToWrite.forEach(({ index, name: productName, sizeQtyMap }) => {
    const base = `product_${index}`;
    const rowUpdates = [];
    rowUpdates.push({ userEnteredValue: { stringValue: productName } }); // First column

    for (let c = 1; c <= 26; c++) {
      let entered = "";
      for (const [size, col] of Object.entries(sizeColumns)) {
        if (col === c && sizeQtyMap[size]) {
          entered = `${sizeQtyMap[size]}`;
        }
      }
      rowUpdates.push({
        userEnteredValue: { stringValue: entered }
      });
    }

    requests.push({
      updateCells: {
        fields: "userEnteredValue",
        rows: [{ values: rowUpdates }],
        start: { sheetId: 0, rowIndex: rowCursor, columnIndex: 0 }
      }
    });

    // Collect personalisation data
    for (const size in sizeQtyMap) {
      const qty = sizeQtyMap[size];
      for (let r = 0; r < qty; r++) {
        const nameVal = p[`${base}_name_${size}_${r}`]?.trim();
        const numberVal = p[`${base}_number_${size}_${r}`]?.trim();
        const hasName = !!nameVal;
        const hasNumber = !!numberVal;

        if (hasName || hasNumber) {
          personalisationRows.push({
            garment: productName,
            label: `${hasName ? nameVal : ""}${hasName && hasNumber ? " / " : ""}${hasNumber ? numberVal : ""}`,
            position: "CENTER",
            size: size
          });
        }
      }
    }

    rowCursor++;
  });

  // Personalisation block: starting row after main items + 2
  let pStartRow = Math.max(rowCursor + 2, 19);
  personalisationRows.forEach(({ garment, label, position, size }, i) => {
    requests.push({
      updateCells: {
        fields: "userEnteredValue",
        rows: [{
          values: [
            { userEnteredValue: { stringValue: garment } },
            {}, {}, // Skip columns B and C
            { userEnteredValue: { stringValue: label } },
            { userEnteredValue: { stringValue: position } },
            {}, {}, // Skip columns F and G
            { userEnteredValue: { stringValue: size } }
          ]
        }],
        start: { sheetId: 0, rowIndex: pStartRow + i, columnIndex: 0 }
      }
    });
  });

  await gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: { requests }
  });

  console.log(`✅ Filled spreadsheet for ${name} with ${productsToWrite.length} products and ${personalisationRows.length} personalisations`);
}

function exportSheetAsExcel(fileId, fileName) {
  const accessToken = gapi.auth.getToken().access_token;
  const exportUrl = `https://docs.google.com/feeds/download/spreadsheets/Export?key=${fileId}&exportFormat=xlsx`;

  fetch(exportUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })
  .then(response => response.blob())
  .then(blob => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
}
