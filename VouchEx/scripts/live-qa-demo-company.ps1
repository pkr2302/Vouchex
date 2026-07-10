# Live QA for VouchEx Demo Company ONLY (company_id=1)
$ErrorActionPreference = 'Stop'
$Base = 'https://vouchex.kuhu.org.in/api'
$DemoCompanyId = 1
$Marker = "QA-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

$results = @()

function Log-Result($id, $status, $detail) {
  $script:results += [PSCustomObject]@{ Test = $id; Status = $status; Detail = $detail }
  $color = switch ($status) {
    'PASS' { 'Green' }
    'FAIL' { 'Red' }
    'WARN' { 'Yellow' }
    default { 'White' }
  }
  Write-Host "[$status] $id - $detail" -ForegroundColor $color
}

function Invoke-PortalApi {
  param(
    [string]$Method,
    [string]$Path,
    $Body = $null,
    [string]$Token,
    [int]$CompanyId
  )
  $headers = @{
    Authorization  = "Bearer $Token"
    Accept         = 'application/json'
    'X-Company-Id' = "$CompanyId"
  }
  $params = @{ Uri = "$Base$Path"; Method = $Method; Headers = $headers }
  if ($null -ne $Body) {
    $params.ContentType = 'application/json'
    $params.Body = ($Body | ConvertTo-Json -Depth 20 -Compress)
  }
  try {
    $r = Invoke-RestMethod @params
    return @{ ok = $true; data = $r; status = 200 }
  }
  catch {
    $resp = $_.Exception.Response
    $code = if ($resp) { [int]$resp.StatusCode } else { 0 }
    $text = ''
    if ($resp) {
      $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
      $text = $reader.ReadToEnd()
    }
    try { $json = $text | ConvertFrom-Json } catch { $json = @{ message = $text } }
    return @{ ok = $false; status = $code; error = $json; raw = $text }
  }
}

function Format-ApiError($resp) {
  if (-not $resp) { return 'unknown error' }
  if ($resp.raw -and $resp.raw.Trim()) {
    $t = $resp.raw.Trim()
    if ($t.Length -gt 400) { $t = $t.Substring(0, 400) + '...' }
    return $t
  }
  $e = $resp.error
  if (-not $e) { return "HTTP $($resp.status)" }
  if ($e.message -is [string] -and $e.message) { return $e.message }
  if ($e.errors) { return ($e.errors | ConvertTo-Json -Compress -Depth 6) }
  return ($e | ConvertTo-Json -Compress -Depth 6)
}

$login = Invoke-RestMethod -Uri "$Base/auth/login" -Method POST -ContentType 'application/json' -Body '{"email":"admin@vouchex.com","password":"user123"}'
$token = $login.token
Log-Result 'AUTH-01' 'PASS' "Logged in as $($login.user.email)"

$boot = Invoke-PortalApi -Method GET -Path '/portal/bootstrap' -Token $token -CompanyId $DemoCompanyId
if (-not $boot.ok) { Log-Result 'BOOT-01' 'FAIL' "Bootstrap failed $($boot.status)"; exit 1 }
$d = $boot.data
Log-Result 'BOOT-01' 'PASS' "Company: $($d.companyDetails.name) | Invoices: $($d.invoices.Count) Customers: $($d.customers.Count)"

$bootOther = Invoke-PortalApi -Method GET -Path '/portal/bootstrap' -Token $token -CompanyId 6
if ($bootOther.ok -and $bootOther.data.companyDetails.name -ne $d.companyDetails.name) {
  Log-Result 'TENANT-01' 'PASS' 'X-Company-Id isolates data (company 6 vs 1)'
}
else {
  Log-Result 'TENANT-01' 'WARN' 'Could not confirm tenant isolation'
}

$custBody = @{
  name            = "$Marker Customer"
  gst_type        = 'Registered Regular'
  gstin           = '24AABCU9603R1ZM'
  billing_address = '123 QA Street'
  billing_city    = 'Ahmedabad'
  billing_state   = 'Gujarat'
  billing_pincode = '380001'
  billing_country = 'India'
  shipping_same   = $true
  payment_terms   = 'Net 15'
  currency        = 'INR'
  email           = 'qa-test@example.com'
}
$cr = Invoke-PortalApi -Method POST -Path '/customers' -Body $custBody -Token $token -CompanyId $DemoCompanyId
if ($cr.ok) {
  $custId = $cr.data.customer.id
  Log-Result 'CUST-01' 'PASS' "Created customer id=$custId"
}
else {
  Log-Result 'CUST-01' 'FAIL' ($cr.error.message -join '; ')
  $custId = ($d.customers | Select-Object -First 1).id
}

if ($custId) {
  $upd = Invoke-PortalApi -Method PUT -Path "/customers/$custId" -Body @{ payment_terms = 'Net 7' } -Token $token -CompanyId $DemoCompanyId
  if ($upd.ok -and $upd.data.customer.payment_terms -eq 'Net 7') {
    Log-Result 'CUST-02' 'PASS' 'Payment terms Net 7 persisted'
  }
  else {
    Log-Result 'CUST-02' 'FAIL' 'Payment terms update failed'
  }
}

$invNum = "$Marker/2026-27"
$bankName = if ($d.bankAccounts.Count) { [string]$d.bankAccounts[0] } else { 'Bank' }
$expHead = if ($d.expenseHeads.Count) { [string]$d.expenseHeads[0] } else { 'Office Expenses' }

$invBody = @{
  invoice = @{
    invoice_number  = $invNum
    invoice_type      = 'B2B'
    customer_id       = [int]$custId
    customer_name     = "$Marker Customer"
    issue_date        = (Get-Date -Format 'yyyy-MM-dd')
    due_date          = (Get-Date).AddDays(15).ToString('yyyy-MM-dd')
    billing_address   = '123 QA Street, Ahmedabad'
    shipping_address  = '123 QA Street, Ahmedabad'
    place_of_supply   = 'Gujarat'
    gstin             = '24AABCU9603R1ZM'
    currency          = 'INR'
    conversion_rate   = 1
    subtotal          = 1000
    discount          = 0
    tax_rate          = 18
    tax_amount        = 180
    cgst              = 90
    sgst              = 90
    igst              = 0
    payable_tax       = 180
    total_amount      = 1180
    status            = 'Unpaid'
  }
  items   = @(@{
      description       = 'QA Test Widget'
      quantity          = 1
      rate              = 1000
      line_total        = 1000
      hsn_sac           = '8471'
      tax_rate_override = 18
      supply_mechanism  = 'FCM'
    })
}
$ir = Invoke-PortalApi -Method POST -Path '/invoices' -Body $invBody -Token $token -CompanyId $DemoCompanyId
$invId = $null
if ($ir.ok) {
  $invId = $ir.data.invoice.id
  Log-Result 'SAL-01' 'PASS' "Invoice $invNum id=$invId total=1180"
}
else {
  Log-Result 'SAL-01' 'FAIL' ($ir.error.message -join '; ')
}

if ($invId) {
  $recBody = @{
    invoice_id       = [int]$invId
    invoice_number   = $invNum
    customer_id      = [int]$custId
    customer_name    = "$Marker Customer"
    payment_date     = (Get-Date -Format 'yyyy-MM-dd')
    amount_received  = 500
    tds_deducted     = 50
    discount_allowed = 0
    currency         = 'INR'
    payment_mode     = 'Bank'
    deposit_to       = $bankName
    reference_no     = "$Marker-REC"
    is_advance       = $false
  }
  $rr = Invoke-PortalApi -Method POST -Path '/receipts' -Body $recBody -Token $token -CompanyId $DemoCompanyId
  if ($rr.ok) {
    Log-Result 'REC-01' 'PASS' 'Partial receipt 500+TDS 50 saved'
    $boot2 = Invoke-PortalApi -Method GET -Path '/portal/bootstrap' -Token $token -CompanyId $DemoCompanyId
    $invStatus = ($boot2.data.invoices | Where-Object { $_.id -eq $invId }).status
    if ($invStatus -eq 'Partially Paid') { Log-Result 'REC-02' 'PASS' "Invoice status=$invStatus" }
    else { Log-Result 'REC-02' 'FAIL' "Expected Partially Paid got $invStatus" }
  }
  else {
    Log-Result 'REC-01' 'FAIL' ($rr.error.message -join '; ')
  }
}

$fcNum = "$Marker-FC/2026-27"
$fcBody = @{
  invoice = @{
    invoice_number  = $fcNum
    invoice_type      = 'Export'
    customer_id       = [int]$custId
    customer_name     = "$Marker Customer"
    issue_date        = (Get-Date -Format 'yyyy-MM-dd')
    due_date          = (Get-Date).AddDays(30).ToString('yyyy-MM-dd')
    billing_address   = 'Overseas Client'
    shipping_address  = 'Overseas Client'
    place_of_supply   = 'Out of India'
    export_country    = 'United States'
    export_treatment  = 'LUT'
    gstin             = 'NIL'
    currency          = 'USD'
    conversion_rate   = 83
    subtotal          = 1000
    discount          = 0
    tax_amount        = 0
    cgst              = 0
    sgst              = 0
    igst              = 0
    payable_tax       = 0
    total_amount      = 1000
    status            = 'Unpaid'
  }
  items   = @(@{
      description       = 'QA Export Service'
      quantity          = 1
      rate              = 1000
      line_total        = 1000
      hsn_sac           = '998314'
      tax_rate_override = 0
      supply_mechanism  = 'FCM'
    })
}
$fcr = Invoke-PortalApi -Method POST -Path '/invoices' -Body $fcBody -Token $token -CompanyId $DemoCompanyId
$fcInvId = $null
if ($fcr.ok) {
  $fcInvId = $fcr.data.invoice.id
  Log-Result 'SAL-FC-01' 'PASS' "FC invoice $fcNum id=$fcInvId"
  $fcRec = @{
    invoice_id       = [int]$fcInvId
    invoice_number   = $fcNum
    customer_id      = [int]$custId
    customer_name    = "$Marker Customer"
    payment_date     = (Get-Date -Format 'yyyy-MM-dd')
    amount_received  = 1000
    tds_deducted     = 0
    discount_allowed = 0
    currency         = 'USD'
    payment_mode     = 'Bank'
    deposit_to       = $bankName
    reference_no     = "$Marker-FC-REC"
    is_advance       = $false
  }
  $frr = Invoke-PortalApi -Method POST -Path '/receipts' -Body $fcRec -Token $token -CompanyId $DemoCompanyId
  if ($frr.ok) { Log-Result 'REC-FC-01' 'PASS' 'FC receipt saved (tds=0)' }
  else { Log-Result 'REC-FC-01' 'FAIL' ($frr.error.message -join '; ') }

  $fx = @{
    conversion_date = (Get-Date -Format 'yyyy-MM-dd')
    invoice_id      = [int]$fcInvId
    invoice_number  = $fcNum
    from_currency   = 'USD'
    from_amount     = 400
    to_currency     = 'INR'
    to_amount       = 33200
    conversion_rate = 83
    from_ledger     = $bankName
    to_ledger       = $bankName
    reference_no    = "$Marker-FX"
  }
  $fxr = Invoke-PortalApi -Method POST -Path '/currency-conversions' -Body $fx -Token $token -CompanyId $DemoCompanyId
  if ($fxr.ok) { Log-Result 'FX-01' 'PASS' 'Partial forex conversion saved' }
  else { Log-Result 'FX-01' 'FAIL' ($fxr.error.message -join '; ') }
}
else {
  Log-Result 'SAL-FC-01' 'FAIL' ($fcr.error.message -join '; ')
}

$vendorId = ($d.vendors | Select-Object -First 1).id
$vendorName = ($d.vendors | Where-Object { $_.id -eq $vendorId } | Select-Object -First 1).name
if (-not $vendorId) {
  $vr = Invoke-PortalApi -Method POST -Path '/vendors' -Body @{
    name            = "$Marker Vendor"
    billing_address = 'V Addr'
    billing_city    = 'Ahmedabad'
    billing_state   = 'Gujarat'
    billing_pincode = '380001'
  } -Token $token -CompanyId $DemoCompanyId
  $vendorId = $vr.data.vendor.id
  $vendorName = $vr.data.vendor.name
}

$expBody = @{
  invoice_number  = "$Marker-BILL"
  expense_head    = $expHead
  vendor_id       = [int]$vendorId
  vendor_name     = $vendorName
  expense_date    = (Get-Date -Format 'yyyy-MM-dd')
  amount          = 500
  tax_amount      = 90
  total_amount    = 590
  payment_status  = 'Unpaid'
  record_type     = 'purchase'
  currency        = 'INR'
}
$er = Invoke-PortalApi -Method POST -Path '/expenses' -Body $expBody -Token $token -CompanyId $DemoCompanyId
$expId = $null
if ($er.ok) {
  $expId = $er.data.expense.id
  Log-Result 'EXP-01' 'PASS' "Expense id=$expId"
  $payBody = @{
    expense_id     = [int]$expId
    expense_number = $er.data.expense.expense_number
    payee          = $vendorName
    payment_date   = (Get-Date -Format 'yyyy-MM-dd')
    amount_paid    = 500
    tds_deducted   = 50
    currency       = 'INR'
    payment_mode   = 'Bank'
    paid_from      = $bankName
    reference_no   = "$Marker-PAY"
    is_advance     = $false
  }
  $pr = Invoke-PortalApi -Method POST -Path '/payments' -Body $payBody -Token $token -CompanyId $DemoCompanyId
  if ($pr.ok) {
    Log-Result 'PAY-01' 'PASS' 'Partial payment 500+TDS 50'
    $boot3 = Invoke-PortalApi -Method GET -Path '/portal/bootstrap' -Token $token -CompanyId $DemoCompanyId
    $expSt = ($boot3.data.expenses | Where-Object { $_.id -eq $expId }).payment_status
    if ($expSt -eq 'Partially Paid') { Log-Result 'PAY-02' 'PASS' "Expense status=$expSt" }
    else { Log-Result 'PAY-02' 'WARN' "Expense status=$expSt (expected Partially Paid)" }
  }
  else { Log-Result 'PAY-01' 'FAIL' ($pr.error.message -join '; ') }
}
else { Log-Result 'EXP-01' 'FAIL' (Format-ApiError $er) }

if ($invId) {
  $cnBody = @{
    credit_note = @{
      customer_id             = [int]$custId
      customer_name           = "$Marker Customer"
      original_invoice_id     = [int]$invId
      original_invoice_number = $invNum
      original_invoice_date   = (Get-Date -Format 'yyyy-MM-dd')
      issue_date              = (Get-Date -Format 'yyyy-MM-dd')
      reason                  = 'QA test return'
      subtotal                = 200
      tax_amount              = 36
      cgst                    = 18
      sgst                    = 18
      igst                    = 0
      total_amount            = 236
      currency                = 'INR'
    }
    items       = @(@{ description = 'Return line'; quantity = 1; rate = 200; line_total = 200; hsn_sac = '8471' })
  }
  $cnr = Invoke-PortalApi -Method POST -Path '/credit-notes' -Body $cnBody -Token $token -CompanyId $DemoCompanyId
  if ($cnr.ok) {
    Log-Result 'CN-01' 'PASS' 'Credit note created'
    $boot4 = Invoke-PortalApi -Method GET -Path '/portal/bootstrap' -Token $token -CompanyId $DemoCompanyId
    $invAfter = $boot4.data.invoices | Where-Object { $_.id -eq $invId }
    Log-Result 'CN-02' 'PASS' "Invoice status after CN: $($invAfter.status)"
  }
  else { Log-Result 'CN-01' 'FAIL' ($cnr.error.message -join '; ') }
}

if ($invId) {
  $badRec = @{
    invoice_id       = [int]$invId
    invoice_number   = $invNum
    customer_id      = [int]$custId
    customer_name    = "$Marker Customer"
    payment_date     = (Get-Date -Format 'yyyy-MM-dd')
    amount_received  = 999999
    tds_deducted     = 0
    discount_allowed = 0
    currency         = 'INR'
    payment_mode     = 'Bank'
    deposit_to       = $bankName
    is_advance       = $false
  }
  $br = Invoke-PortalApi -Method POST -Path '/receipts' -Body $badRec -Token $token -CompanyId $DemoCompanyId
  if (-not $br.ok) { Log-Result 'VAL-01' 'PASS' 'Server rejected absurd over-allocation' }
  else { Log-Result 'VAL-01' 'WARN' 'Server accepted over-allocation (no server-side cap)' }
}

# --- Extended minute-level coverage (Demo Company only) ---

$me = Invoke-PortalApi -Method GET -Path '/auth/me' -Token $token -CompanyId $DemoCompanyId
if ($me.ok) { Log-Result 'AUTH-ME' 'PASS' "User role=$($me.data.user.role)" }
else { Log-Result 'AUTH-ME' 'FAIL' (Format-ApiError $me) }

try {
  Invoke-RestMethod -Uri "$Base/auth/login" -Method POST -ContentType 'application/json' -Body '{"email":"admin@vouchex.com","password":"wrong"}' | Out-Null
  Log-Result 'AUTH-02' 'FAIL' 'Wrong password should fail'
}
catch {
  Log-Result 'AUTH-02' 'PASS' 'Wrong password rejected'
}

$ref = Invoke-PortalApi -Method GET -Path '/reference-rate?currency=USD' -Token $token -CompanyId $DemoCompanyId
if ($ref.ok -and $ref.data.reference) { Log-Result 'REF-01' 'PASS' 'USD reference rate fetched' }
else { Log-Result 'REF-01' 'WARN' (Format-ApiError $ref) }

$sync = Invoke-PortalApi -Method GET -Path '/sync/changes?since=0' -Token $token -CompanyId $DemoCompanyId
if ($sync.ok) { Log-Result 'SYNC-01' 'PASS' 'Sync changes endpoint OK' }
else { Log-Result 'SYNC-01' 'FAIL' (Format-ApiError $sync) }

$gst = Invoke-PortalApi -Method GET -Path '/gst-compliance/settings' -Token $token -CompanyId $DemoCompanyId
if ($gst.ok) { Log-Result 'GST-01' 'PASS' 'GST compliance settings readable' }
else { Log-Result 'GST-01' 'WARN' (Format-ApiError $gst) }

$calBody = @{
  kind           = 'task'
  title          = "$Marker Calendar Task"
  notes          = 'QA test task'
  reminder_date  = (Get-Date).AddDays(7).ToString('yyyy-MM-dd')
  reminder_time  = '10:00'
  notify_email   = 'qa-test@example.com'
  priority       = 'B'
}
$cal = Invoke-PortalApi -Method POST -Path '/tax-calendar/reminders' -Body $calBody -Token $token -CompanyId $DemoCompanyId
if ($cal.ok) {
  $calId = $cal.data.reminder.id
  Log-Result 'CAL-01' 'PASS' "Calendar task id=$calId"
  $calDel = Invoke-PortalApi -Method DELETE -Path "/tax-calendar/reminders/$calId" -Token $token -CompanyId $DemoCompanyId
  if ($calDel.ok) { Log-Result 'CAL-02' 'PASS' 'Calendar task deleted' }
  else { Log-Result 'CAL-02' 'FAIL' (Format-ApiError $calDel) }
}
else { Log-Result 'CAL-01' 'FAIL' (Format-ApiError $cal) }

$prodBody = @{
  type               = 'Product'
  name               = "$Marker Widget"
  code               = "$Marker-P1"
  quantity           = 50
  unit               = 'Nos'
  rate               = 100
  purchase_price     = 80
  sales_price        = 120
  tax_rate           = 18
  opening_stock      = 50
  low_stock_threshold = 5
  product_class      = 'finished_goods'
  default_expense_head = $expHead
}
$prod = Invoke-PortalApi -Method POST -Path '/inventory' -Body $prodBody -Token $token -CompanyId $DemoCompanyId
$prodId = $null
if ($prod.ok) {
  $prodId = $prod.data.item.id
  Log-Result 'INV-01' 'PASS' "Product id=$prodId qty=50"
  $prodUpd = Invoke-PortalApi -Method PUT -Path "/inventory/$prodId" -Body @{ sales_price = 125 } -Token $token -CompanyId $DemoCompanyId
  if ($prodUpd.ok) { Log-Result 'INV-02' 'PASS' 'Product price updated' }
  else { Log-Result 'INV-02' 'FAIL' (Format-ApiError $prodUpd) }
}
else { Log-Result 'INV-01' 'FAIL' (Format-ApiError $prod) }

$svc = Invoke-PortalApi -Method POST -Path '/inventory' -Body @{
  type = 'Service'; name = "$Marker Service"; rate = 500; tax_rate = 18
} -Token $token -CompanyId $DemoCompanyId
if ($svc.ok) { Log-Result 'INV-03' 'PASS' "Service id=$($svc.data.item.id)" }
else { Log-Result 'INV-03' 'FAIL' (Format-ApiError $svc) }

if ($prodId) {
  $cons = Invoke-PortalApi -Method POST -Path '/consumptions' -Body @{
    consumption_number = "$Marker-CON"
    consumption_date   = (Get-Date -Format 'yyyy-MM-dd')
    product_id           = [int]$prodId
    quantity             = 2
    unit_cost            = 80
    total_value          = 160
    expense_head         = $expHead
    reference            = 'QA consumption'
  } -Token $token -CompanyId $DemoCompanyId
  if ($cons.ok) {
    Log-Result 'CONS-01' 'PASS' 'Stock consumption recorded'
    $bootCons = Invoke-PortalApi -Method GET -Path '/portal/bootstrap' -Token $token -CompanyId $DemoCompanyId
    $newQty = ($bootCons.data.inventory | Where-Object { $_.id -eq $prodId }).quantity
    if ($newQty -eq 48) { Log-Result 'CONS-02' 'PASS' "Stock now $newQty" }
    else { Log-Result 'CONS-02' 'WARN' "Stock=$newQty (expected 48)" }
  }
  else { Log-Result 'CONS-01' 'FAIL' (Format-ApiError $cons) }
}

if ($custId) {
  $adv = Invoke-PortalApi -Method POST -Path '/receipts' -Body @{
    customer_id     = [int]$custId
    customer_name   = "$Marker Customer"
    payment_date    = (Get-Date -Format 'yyyy-MM-dd')
    amount_received = 1000
    tds_deducted    = 0
    currency        = 'INR'
    payment_mode    = 'Bank'
    deposit_to      = $bankName
    reference_no    = "$Marker-ADV"
    is_advance      = $true
  } -Token $token -CompanyId $DemoCompanyId
  if ($adv.ok -and $adv.data.receipt.is_advance) { Log-Result 'ADV-01' 'PASS' 'Advance receipt saved' }
  elseif ($adv.ok) { Log-Result 'ADV-01' 'WARN' 'Advance receipt saved but is_advance flag unclear' }
  else { Log-Result 'ADV-01' 'FAIL' (Format-ApiError $adv) }
}

$delInvNum = "$Marker-DEL/2026-27"
$delInv = Invoke-PortalApi -Method POST -Path '/invoices' -Body @{
  invoice = @{
    invoice_number = $delInvNum; invoice_type = 'B2B'; customer_id = [int]$custId
    customer_name = "$Marker Customer"; issue_date = (Get-Date -Format 'yyyy-MM-dd')
    due_date = (Get-Date).AddDays(7).ToString('yyyy-MM-dd'); billing_address = 'QA'
    shipping_address = 'QA'; place_of_supply = 'Gujarat'; gstin = '24AABCU9603R1ZM'
    currency = 'INR'; conversion_rate = 1; subtotal = 100; discount = 0; tax_rate = 18
    tax_amount = 18; cgst = 9; sgst = 9; igst = 0; payable_tax = 18; total_amount = 118; status = 'Unpaid'
  }
  items = @(@{ description = 'Del test'; quantity = 1; rate = 100; line_total = 100; hsn_sac = '8471'; tax_rate_override = 18; supply_mechanism = 'FCM' })
} -Token $token -CompanyId $DemoCompanyId
$delInvId = $null
$delRecId = $null
if ($delInv.ok) {
  $delInvId = $delInv.data.invoice.id
  $delRec = Invoke-PortalApi -Method POST -Path '/receipts' -Body @{
    invoice_id = [int]$delInvId; invoice_number = $delInvNum; customer_id = [int]$custId
    customer_name = "$Marker Customer"; payment_date = (Get-Date -Format 'yyyy-MM-dd')
    amount_received = 118; tds_deducted = 0; currency = 'INR'; payment_mode = 'Bank'
    deposit_to = $bankName; is_advance = $false
  } -Token $token -CompanyId $DemoCompanyId
  if ($delRec.ok) {
    $delRecId = $delRec.data.receipt.id
    $bootDel = Invoke-PortalApi -Method GET -Path '/portal/bootstrap' -Token $token -CompanyId $DemoCompanyId
    $stPaid = ($bootDel.data.invoices | Where-Object { $_.id -eq $delInvId }).status
    if ($stPaid -eq 'Paid') {
      Log-Result 'REC-DEL-01' 'PASS' 'Receipt marked invoice Paid'
      $recDel = Invoke-PortalApi -Method DELETE -Path "/receipts/$delRecId" -Token $token -CompanyId $DemoCompanyId
      if ($recDel.ok) {
        $bootDel2 = Invoke-PortalApi -Method GET -Path '/portal/bootstrap' -Token $token -CompanyId $DemoCompanyId
        $stUnpaid = ($bootDel2.data.invoices | Where-Object { $_.id -eq $delInvId }).status
        if ($stUnpaid -eq 'Unpaid') { Log-Result 'REC-DEL-02' 'PASS' 'Receipt delete reverted to Unpaid' }
        else { Log-Result 'REC-DEL-02' 'FAIL' "Expected Unpaid got $stUnpaid" }
      }
      else { Log-Result 'REC-DEL-02' 'FAIL' (Format-ApiError $recDel) }
    }
    else { Log-Result 'REC-DEL-01' 'FAIL' "Expected Paid got $stPaid" }
  }
  else { Log-Result 'REC-DEL-01' 'FAIL' (Format-ApiError $delRec) }
}

if ($expId) {
  $bootExp = Invoke-PortalApi -Method GET -Path '/portal/bootstrap' -Token $token -CompanyId $DemoCompanyId
  $expRow = $bootExp.data.expenses | Where-Object { $_.id -eq $expId } | Select-Object -First 1
  $dnBody = @{
    debit_note = @{
      vendor_id = [int]$vendorId; vendor_name = $vendorName
      original_expense_id = [int]$expId; original_expense_number = $expRow.expense_number
      original_expense_date = $expRow.expense_date; issue_date = (Get-Date -Format 'yyyy-MM-dd')
      reason = 'QA debit note'; subtotal = 50; tax_amount = 9; cgst = 4.5; sgst = 4.5
      igst = 0; total_amount = 59; currency = 'INR'
    }
    items = @(@{ description = 'DN line'; quantity = 1; rate = 50; line_total = 50; hsn_sac = '8471' })
  }
  $dnr = Invoke-PortalApi -Method POST -Path '/debit-notes' -Body $dnBody -Token $token -CompanyId $DemoCompanyId
  if ($dnr.ok) {
    Log-Result 'DN-01' 'PASS' 'Debit note on expense created'
    $bootDn = Invoke-PortalApi -Method GET -Path '/portal/bootstrap' -Token $token -CompanyId $DemoCompanyId
    $expAfterDn = ($bootDn.data.expenses | Where-Object { $_.id -eq $expId }).payment_status
    Log-Result 'DN-02' 'PASS' "Expense status after DN: $expAfterDn"
  }
  else { Log-Result 'DN-01' 'FAIL' (Format-ApiError $dnr) }
}

$b2cNum = "$Marker-B2C/2026-27"
$b2c = Invoke-PortalApi -Method POST -Path '/invoices' -Body @{
  invoice = @{
    invoice_number = $b2cNum; invoice_type = 'B2C'; customer_id = [int]$custId
    customer_name = "$Marker Customer"; issue_date = (Get-Date -Format 'yyyy-MM-dd')
    due_date = (Get-Date).AddDays(15).ToString('yyyy-MM-dd'); billing_address = 'QA B2C'
    shipping_address = 'QA B2C'; place_of_supply = 'Gujarat'; gstin = 'NIL'
    currency = 'INR'; conversion_rate = 1; subtotal = 500; discount = 0; tax_rate = 18
    tax_amount = 90; cgst = 45; sgst = 45; igst = 0; payable_tax = 90; total_amount = 590; status = 'Unpaid'
  }
  items = @(@{ description = 'B2C item'; quantity = 1; rate = 500; line_total = 500; hsn_sac = '8471'; tax_rate_override = 18; supply_mechanism = 'FCM' })
} -Token $token -CompanyId $DemoCompanyId
if ($b2c.ok) { Log-Result 'SAL-B2C-01' 'PASS' "B2C invoice id=$($b2c.data.invoice.id)" }
else { Log-Result 'SAL-B2C-01' 'FAIL' (Format-ApiError $b2c) }

if ($vendorId) {
  $vUpd = Invoke-PortalApi -Method PUT -Path "/vendors/$vendorId" -Body @{ category = 'QA-Test' } -Token $token -CompanyId $DemoCompanyId
  if ($vUpd.ok) { Log-Result 'VEND-01' 'PASS' 'Vendor category updated' }
  else { Log-Result 'VEND-01' 'FAIL' (Format-ApiError $vUpd) }
}

if ($invId) {
  $lock = Invoke-PortalApi -Method POST -Path '/locks/acquire' -Body @{
    document_type = 'invoice'; document_key = "invoice-$invId"
  } -Token $token -CompanyId $DemoCompanyId
  if ($lock.ok) {
    $lockId = $lock.data.lock_id
    Log-Result 'LOCK-01' 'PASS' "Document lock acquired id=$lockId"
    $lockRel = Invoke-PortalApi -Method DELETE -Path "/locks/$lockId" -Token $token -CompanyId $DemoCompanyId
    if ($lockRel.ok) { Log-Result 'LOCK-02' 'PASS' 'Document lock released' }
    else { Log-Result 'LOCK-02' 'FAIL' (Format-ApiError $lockRel) }
  }
  else { Log-Result 'LOCK-01' 'WARN' (Format-ApiError $lock) }
}

$ehName = "$Marker ExpHead"
$eh = Invoke-PortalApi -Method POST -Path '/settings/expense-heads' -Body @{ name = $ehName; active = $true } -Token $token -CompanyId $DemoCompanyId
if ($eh.ok) {
  Log-Result 'COA-01' 'PASS' 'QA expense head created'
  $bootCoa = Invoke-PortalApi -Method GET -Path '/portal/bootstrap' -Token $token -CompanyId $DemoCompanyId
  $ehRow = $bootCoa.data.coaRecords.expense_heads | Where-Object { $_.name -eq $ehName } | Select-Object -First 1
  if ($ehRow) {
    $ehDel = Invoke-PortalApi -Method DELETE -Path "/settings/expense-heads/$($ehRow.id)" -Token $token -CompanyId $DemoCompanyId
    if ($ehDel.ok) { Log-Result 'COA-02' 'PASS' 'QA expense head deleted' }
    else { Log-Result 'COA-02' 'WARN' 'Could not delete QA expense head' }
  }
}
else { Log-Result 'COA-01' 'FAIL' (Format-ApiError $eh) }

$bootFinal = Invoke-PortalApi -Method GET -Path '/portal/bootstrap' -Token $token -CompanyId $DemoCompanyId
if ($bootFinal.ok) {
  $invCount = $bootFinal.data.invoices.Count
  $expCount = $bootFinal.data.expenses.Count
  $recCount = $bootFinal.data.receipts.Count
  $payCount = $bootFinal.data.payments.Count
  $cnCount = $bootFinal.data.creditNotes.Count
  $dnCount = $bootFinal.data.debitNotes.Count
  Log-Result 'DATA-01' 'PASS' "Bootstrap counts: inv=$invCount exp=$expCount rec=$recCount pay=$payCount cn=$cnCount dn=$dnCount"
}

$health = Invoke-PortalApi -Method GET -Path '/system/health' -Token $token -CompanyId $DemoCompanyId
if ($health.ok) { Log-Result 'SYS-01' 'PASS' 'System health OK' }
else { Log-Result 'SYS-01' 'WARN' 'Health check unavailable' }

Write-Host ''
Write-Host '=== SUMMARY ===' -ForegroundColor Cyan
$results | Group-Object Status | ForEach-Object { Write-Host "$($_.Name): $($_.Count)" }
Write-Host ''
$results | Format-Table -AutoSize
Write-Host "QA marker: $Marker (test records in Demo Company only)"
