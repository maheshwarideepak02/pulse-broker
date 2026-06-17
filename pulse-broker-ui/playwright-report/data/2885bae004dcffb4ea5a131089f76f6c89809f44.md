# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: golden-path.spec.js >> Golden Path E2E >> Full User Journey
- Location: tests/golden-path.spec.js:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Print / Download PDF')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('text=Print / Download PDF')

```

```yaml
- navigation:
  - text: ॐ Pulse Broker
  - link "Dashboard":
    - /url: /app/dashboard
  - link "Parties & Firms":
    - /url: /app/parties
  - link "Ledger & Bills":
    - /url: /app/ledger
  - link "🚚 Pending Deals":
    - /url: /app/pending
  - link "Settings":
    - /url: /app/settings
  - link "✍️ New Deal":
    - /url: /app/new-deal
  - button "🌐 Hindi (अ)"
  - button "Logout"
- main:
  - text: 📒
  - heading "Ledger & Billing" [level=1]
  - button "Generate Bills"
  - button "Invoice History"
  - heading "🔍 Filter & Generate Bill for Firm" [level=2]
  - text: Select Firm
  - combobox:
    - option "-- Select Firm --"
    - option "RAM KUMAR AARTI"
    - option "RAM AVATAR KIRSHNA AVATAR"
    - option "INDRAPRASTHA FOODS"
    - option "SEETA SHREE"
    - option "P.P TRADERS"
    - option "ALOK TRADERS"
    - option "Test Purchaser"
    - option "Test Seller"
    - option "Purchaser 9165"
    - option "Seller 9165"
    - option "Purchaser 1325"
    - option "Seller 1325"
    - option "Purchaser 5998"
    - option "Seller 5998"
    - option "Purchaser 8299"
    - option "Seller 8299"
    - option "Purchaser 8596"
    - option "Seller 8596"
    - option "Purchaser 3264"
    - option "Seller 3264"
    - option "Purchaser 2513"
    - option "Seller 2513"
    - option "Purchaser 5993"
    - option "Seller 5993"
    - option "Purchaser 7484"
    - option "Seller 7484"
    - option "Purchaser 8443"
    - option "Seller 8443"
    - option "Purchaser 2781"
    - option "Seller 2781"
    - option "Purchaser 5999"
    - option "Seller 5999"
    - option "Purchaser 0972"
    - option "Seller 0972"
    - option "Purchaser 4069"
    - option "Seller 4069"
    - option "Purchaser 9098"
    - option "Seller 9098"
    - option "Purchaser 2779"
    - option "Seller 2779"
    - option "Purchaser 3613"
    - option "Seller 3613"
    - option "Purchaser 4560"
    - option "Seller 4560"
    - option "Purchaser 0373220"
    - option "Seller 0373220"
    - option "Purchaser 411228"
    - option "Seller 411228"
    - option "Purchaser 6226460"
    - option "Seller 6226460"
    - option "Purchaser 010444"
    - option "Seller 010444"
    - option "Purchaser 2471459"
    - option "Seller 2471459"
    - option "Purchaser 1390410"
    - option "Seller 1390410"
    - option "Purchaser 9652883"
    - option "Seller 9652883"
    - option "Purchaser 0287677"
    - option "Seller 0287677"
    - option "Purchaser 3889628"
    - option "Seller 3889628"
    - option "Purchaser 6428639"
    - option "Seller 6428639"
    - option "Purchaser 6970313"
    - option "Seller 6970313"
    - option "Purchaser 1508687"
    - option "Seller 1508687"
    - option "Purchaser 9532444" [selected]
    - option "Seller 9532444"
  - text: From Date
  - textbox "Select date"
  - text: To Date
  - textbox "Select date"
  - table:
    - rowgroup:
      - row "Date Opposite Party Item (Marka) Weight Bags Brokerage":
        - columnheader "Date"
        - columnheader "Opposite Party"
        - columnheader "Item (Marka)"
        - columnheader "Weight"
        - columnheader "Bags"
        - columnheader "Brokerage"
        - columnheader
    - rowgroup:
      - row "17-06-2026 Seller 9532444 Item 9532444 (Marka 9532444) 100 400 ₹ 7500.00 ↩️":
        - cell "17-06-2026"
        - cell "Seller 9532444"
        - cell "Item 9532444 (Marka 9532444)"
        - cell "100"
        - cell "400"
        - cell "₹ 7500.00"
        - cell "↩️":
          - button "↩️"
    - rowgroup:
      - 'row "👀 Preview PDF 🔒 Finalize & Lock Bill Total to Bill: ₹ 7500.00"':
        - cell "👀 Preview PDF 🔒 Finalize & Lock Bill":
          - button "👀 Preview PDF"
          - button "🔒 Finalize & Lock Bill"
        - cell "Total to Bill:"
        - cell "₹ 7500.00"
```

# Test source

```ts
  44  |       }
  45  |     }
  46  | 
  47  |     // Should now be on Dashboard
  48  |     await expect(page).toHaveURL(/.*\/app\/dashboard/);
  49  | 
  50  |     // Open Hamburger Menu if on mobile
  51  |     const isMobile = page.viewportSize().width < 1024;
  52  |     if (isMobile) await page.getByLabel('Menu').click();
  53  | 
  54  |     // 2. Add Contact & Firms
  55  |     await page.locator('a:has-text("Parties & Firms") >> visible=true').click();
  56  |     await page.locator('button:has-text("Add New Party") >> visible=true').click();
  57  |     
  58  |     // Fill Contact
  59  |     await page.fill('input[placeholder*="Name"]', testContact);
  60  |     await page.fill('input[placeholder*="City"]', 'Mumbai');
  61  |     await page.fill('input[placeholder*="Phone"]', '9876543210');
  62  |     await page.click('button:has-text("Save Contact")');
  63  |     
  64  |     // Add Purchaser Firm
  65  |     await page.click(`text=${testContact}`); // Select the contact
  66  |     await page.click('button:has-text("Add Firm")');
  67  |     await page.fill('input[placeholder*="Firm Name"]', pFirm);
  68  |     await page.selectOption('select', { label: '% Percent' });
  69  |     await page.fill('input[placeholder*="Default Rate"]', '1.5');
  70  |     await page.click('button:has-text("Save Firm")');
  71  | 
  72  |     // Add Seller Firm
  73  |     await page.click('button:has-text("Add Firm")');
  74  |     await page.fill('input[placeholder*="Firm Name"]', sFirm);
  75  |     await page.selectOption('select', { label: '₹ Fixed/Qtl' });
  76  |     await page.fill('input[placeholder*="Default Rate"]', '10');
  77  |     await page.click('button:has-text("Save Firm")');
  78  | 
  79  |     // 3. Add Item & Marka
  80  |     if (isMobile) await page.getByLabel('Menu').click();
  81  |     await page.locator('a:has-text("Settings") >> visible=true').click();
  82  |     
  83  |     await page.fill('input[placeholder*="Item Name"]', testItem);
  84  |     await page.click('button:has-text("Add Item")');
  85  |     
  86  |     await page.fill('input[placeholder*="Marka Name"]', testMarka);
  87  |     await page.click('button:has-text("Add Marka")');
  88  | 
  89  |     // 4. Create New Deal
  90  |     if (isMobile) await page.getByLabel('Menu').click();
  91  |     await page.locator('a:has-text("New Deal") >> visible=true').click();
  92  |     
  93  |     await page.selectOption('select[name="purchaserId"]', { label: pFirm });
  94  |     await page.selectOption('select[name="sellerId"]', { label: sFirm });
  95  |     await page.selectOption('select[name="itemId"]', { label: testItem });
  96  |     await page.selectOption('select[name="markaId"]', { label: testMarka });
  97  |     
  98  |     await page.fill('input[name="weight"]', '100');
  99  |     await page.fill('input[name="rate"]', '5000');
  100 |     
  101 |     // Change packet weight and verify bags calculation
  102 |     await page.fill('input[name="packetWeight"]', '25'); // 100 quintal * 100 kg / 25 kg = 400 bags
  103 |     await expect(page.locator('input[name="numberOfPackets"]')).toHaveValue('400');
  104 |     
  105 |     await page.click('button:has-text("Save New Deal")');
  106 |     
  107 |     // Should redirect to Dashboard
  108 |     await expect(page).toHaveURL(/.*\/app\/dashboard/);
  109 | 
  110 |     // 5. Load Deal
  111 |     if (isMobile) await page.getByLabel('Menu').click();
  112 |     await page.locator('a:has-text("Pending Deals") >> visible=true').click();
  113 |     
  114 |     // Find the row with our item and click Load
  115 |     // Search for our firm to ensure we don't load an old deal from a dirty database
  116 |     await page.fill('input[placeholder*="Search Firm"]', pFirm);
  117 |     await page.waitForTimeout(1000); 
  118 |     
  119 |     // Click Load for our specific deal
  120 |     const loadBtn = page.locator('button:has-text("Load") >> visible=true').first();
  121 |     await loadBtn.click();
  122 |     
  123 |     // Fill required Loading Date in Modal
  124 |     await page.getByPlaceholder('Select date').fill('18/06/2026');
  125 |     await page.getByPlaceholder('Select date').press('Enter');
  126 |     
  127 |     // Confirm Loading
  128 |     await page.click('button:has-text("Confirm Loading")');
  129 | 
  130 |     // 6. Generate Bill
  131 |     // Wait for the modal to disappear and the success toast
  132 |     await expect(page.locator('text=Deal Loaded Successfully')).toBeVisible();
  133 |     
  134 |     if (isMobile) await page.getByLabel('Menu').click();
  135 |     await page.locator('a:has-text("Ledger & Bills") >> visible=true').click();
  136 |     
  137 |     await page.selectOption('select', { label: pFirm });
  138 |     
  139 |     // Finalize the bill
  140 |     await page.locator('button:has-text("Finalize & Lock Bill") >> visible=true').first().click();
  141 |     await page.locator('button:has-text("Yes, Delete") >> visible=true').first().click(); // Confirm Modal uses this text
  142 |     
  143 |     // Wait for the printable invoice to render
> 144 |     await expect(page.locator('text=Print / Download PDF')).toBeVisible({ timeout: 10000 });
      |                                                             ^ Error: expect(locator).toBeVisible() failed
  145 |     
  146 |     // Go back to Ledger
  147 |     await page.click('button:has-text("← Back")');
  148 |     
  149 |     // Go to History tab
  150 |     await page.click('button:has-text("Invoice History")');
  151 |     await expect(page.locator(`text=${pFirm} >> visible=true`).first()).toBeVisible();
  152 |     
  153 |     // Mark as PAID
  154 |     // Mark as PAID with Kasar
  155 |     const clearText = isMobile ? '✓ Pay' : 'Mark Cleared';
  156 |     await page.locator(`button:has-text("${clearText}") >> visible=true`).first().click();
  157 |     
  158 |     // Fill Kasar amount
  159 |     await page.fill('input[placeholder="Optional"]', '150');
  160 |     await page.locator('button:has-text("✓ Mark Paid") >> visible=true').first().click();
  161 |     
  162 |     // Verify Kasar badge is visible
  163 |     await expect(page.locator('text=Kasar: ₹150 >> visible=true').first()).toBeVisible();
  164 |   });
  165 | });
  166 | 
```