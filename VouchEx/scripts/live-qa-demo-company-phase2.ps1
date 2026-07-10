# Phase-2 live QA — supplemental edge cases (Demo Company id=1 only)
$ErrorActionPreference = 'Stop'

$Base = 'https://vouchex.kuhu.org.in/api'
$DemoCompanyId = 1
$Marker = "QA2-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$results = @()

function Log-Result($id, $status, $detail) {
  $script:results += [PSCustomObject]@{ Test = $id; Status = $status; Detail = $detail }
  Write-Host "[$status] $id - $detail" -ForegroundColor $(if ($status -eq 'PASS') { 'Green' } elseif ($status -eq 'FAIL') { 'Red' } else { 'Yellow' })
}

function Invoke-PortalApi {
  param([string]$Method, [string]$Path, $Body = $null, [string]$Token, [int]$CompanyId)
  $headers = @{ Authorization = "Bearer $Token"; Accept = 'application/json'; 'X-Company-Id' = "$CompanyId" }
  $params = @{ Uri = "$Base$Path"; Method = $Method; Headers = $headers }
  if ($null -ne $Body) { $params.ContentType = 'application/json'; $params.Body = ($Body | ConvertTo-Json -Depth 20 -Compress) }
  try { return @{ ok = $true; data = (Invoke-RestMethod @params); status = 200 } }
  catch {
    $resp = $_.Exception.Response
    $code = if ($resp) { [int]$resp.StatusCode } else { 0 }
    $text = if ($resp) { (New-Object System.IO.StreamReader($resp.GetResponseStream())).ReadToEnd() } else { '' }
    try { $json = $text | ConvertFrom-Json } catch { $json = @{ message = $text } }
    return @{ ok = $false; status = $code; error = $json; raw = $text }
  }
}

function Format-ApiError($resp) {
  if ($resp.raw) { return $resp.raw.Substring(0, [Math]::Min(300, $resp.raw.Length)) }
  if ($resp.error.message) { return $resp.error.message }
  return "HTTP $($resp.status)"
}

$login = Invoke-RestMethod -Uri "$Base/auth/login" -Method POST -ContentType 'application/json' -Body '{"email":"admin@vouchex.com","password":"user123"}'
$token = $login.token
$boot = Invoke-PortalApi -Method GET -Path '/portal/bootstrap' -Token $token -CompanyId $DemoCompanyId
$d = $boot.data
$bankName = [string]$d.bankAccounts[0]
$cust = $d.customers | Select-Object -First 1
$custId = $cust.id

$ref = Invoke-PortalApi -Method GET -Path "/reference-rate?currency=USD" -Token $token -CompanyId $DemoCompanyId
if ($ref.ok -and $ref.data.reference) { Log-Result 'REF-02' 'PASS' 'USD reference rate fetched' }
else { Log-Result 'REF-02' 'WARN' (Format-ApiError $ref) }

$invA = Invoke-PortalApi -Method POST -Path '/invoices' -Body @{
  invoice = @{
    invoice_number = "$Marker-A/2026-27"; invoice_type = 'B2B'; customer_id = [int]$custId
    customer_name = $cust.name; issue_date = (Get-Date -Format 'yyyy-MM-dd')
    due_date = (Get-Date).AddDays(10).ToString('yyyy-MM-dd'); billing_address = 'QA'; shipping_address = 'QA'
    place_of_supply = 'Gujarat'; gstin = '24AABCU9603R1ZM'; currency = 'INR'; conversion_rate = 1
    subtotal = 200; tax_amount = 36; cgst = 18; sgst = 18; igst = 0; payable_tax = 36; total_amount = 236; status = 'Unpaid'
  }
  items = @(@{ description = 'Bulk A'; quantity = 1; rate = 200; line_total = 200; hsn_sac = '8471'; tax_rate_override = 18; supply_mechanism = 'FCM' })
} -Token $token -CompanyId $DemoCompanyId

if ($invA.ok) {
  $overRec = Invoke-PortalApi -Method POST -Path '/receipts' -Body @{
    invoice_id = [int]$invA.data.invoice.id; invoice_number = "$Marker-A/2026-27"
    customer_id = [int]$custId; customer_name = $cust.name
    payment_date = (Get-Date -Format 'yyyy-MM-dd'); amount_received = 999999
    tds_deducted = 0; discount_allowed = 0; currency = 'INR'
    payment_mode = 'Bank'; deposit_to = $bankName; is_advance = $false
  } -Token $token -CompanyId $DemoCompanyId
  if (-not $overRec.ok) { Log-Result 'VAL-02' 'PASS' 'Server rejected over-allocation receipt' }
  else { Log-Result 'VAL-02' 'FAIL' 'Over-allocation receipt was accepted' }
}

if ($invA.ok) {
  $iid = $invA.data.invoice.id
  $inv = $invA.data.invoice
  $upd = Invoke-PortalApi -Method PUT -Path "/invoices/$iid" -Body @{
    invoice = @{
      invoice_number = $inv.invoice_number; invoice_type = 'B2B'; customer_id = [int]$custId
      customer_name = $cust.name; issue_date = $inv.issue_date; due_date = $inv.due_date
      billing_address = 'QA Updated'; shipping_address = 'QA Updated'; place_of_supply = 'Gujarat'
      gstin = '24AABCU9603R1ZM'; currency = 'INR'; conversion_rate = 1; subtotal = 200
      tax_amount = 36; cgst = 18; sgst = 18; igst = 0; payable_tax = 36; total_amount = 236
      status = 'Paid'; po_number = "$Marker-PO"
    }
    items = @(@{ description = 'Bulk A updated'; quantity = 1; rate = 200; line_total = 200; hsn_sac = '8471'; tax_rate_override = 18; supply_mechanism = 'FCM' })
  } -Token $token -CompanyId $DemoCompanyId
  if ($upd.ok) { Log-Result 'INV-UPD-01' 'PASS' 'Invoice update with PO number' }
  else { Log-Result 'INV-UPD-01' 'FAIL' (Format-ApiError $upd) }

  $lock = Invoke-PortalApi -Method POST -Path '/locks/acquire' -Body @{
    document_type = 'invoice'; document_key = "invoice-$iid"
  } -Token $token -CompanyId $DemoCompanyId
  if ($lock.ok) {
    Log-Result 'LOCK-03' 'PASS' "Lock acquired id=$($lock.data.lock_id)"
    $rel = Invoke-PortalApi -Method DELETE -Path "/locks/$($lock.data.lock_id)" -Token $token -CompanyId $DemoCompanyId
    if ($rel.ok) { Log-Result 'LOCK-04' 'PASS' 'Lock released' } else { Log-Result 'LOCK-04' 'FAIL' (Format-ApiError $rel) }
  }
  else { Log-Result 'LOCK-03' 'FAIL' (Format-ApiError $lock) }
}

$exp = Invoke-PortalApi -Method POST -Path '/expenses' -Body @{
  invoice_number = "$Marker-PAYDEL"; expense_head = [string]$d.expenseHeads[0]
  vendor_id = [int]($d.vendors | Select-Object -First 1).id
  vendor_name = ($d.vendors | Select-Object -First 1).name
  expense_date = (Get-Date -Format 'yyyy-MM-dd'); amount = 100; tax_amount = 18; total_amount = 118
  payment_status = 'Unpaid'; record_type = 'expense'; currency = 'INR'
} -Token $token -CompanyId $DemoCompanyId
if ($exp.ok) {
  $eid = $exp.data.expense.id
  $pay = Invoke-PortalApi -Method POST -Path '/payments' -Body @{
    expense_id = [int]$eid; expense_number = $exp.data.expense.expense_number
    payee = ($d.vendors | Select-Object -First 1).name; payment_date = (Get-Date -Format 'yyyy-MM-dd')
    amount_paid = 118; tds_deducted = 0; currency = 'INR'; payment_mode = 'Bank'; paid_from = $bankName; is_advance = $false
  } -Token $token -CompanyId $DemoCompanyId
  if ($pay.ok) {
    $paymentId = $pay.data.payment.id
    $boot3 = Invoke-PortalApi -Method GET -Path '/portal/bootstrap' -Token $token -CompanyId $DemoCompanyId
    $st = ($boot3.data.expenses | Where-Object { $_.id -eq $eid }).payment_status
    if ($st -eq 'Paid') {
      Log-Result 'PAY-DEL-01' 'PASS' 'Full payment marked expense Paid'
      $pdel = Invoke-PortalApi -Method DELETE -Path "/payments/$paymentId" -Token $token -CompanyId $DemoCompanyId
      if ($pdel.ok) {
        $boot4 = Invoke-PortalApi -Method GET -Path '/portal/bootstrap' -Token $token -CompanyId $DemoCompanyId
        $st2 = ($boot4.data.expenses | Where-Object { $_.id -eq $eid }).payment_status
        if ($st2 -eq 'Unpaid') { Log-Result 'PAY-DEL-02' 'PASS' 'Payment delete reverted to Unpaid' }
        else { Log-Result 'PAY-DEL-02' 'FAIL' "Got $st2" }
      }
      else { Log-Result 'PAY-DEL-02' 'FAIL' (Format-ApiError $pdel) }
    }
    else { Log-Result 'PAY-DEL-01' 'FAIL' "Status=$st" }
  }
  $overPay = Invoke-PortalApi -Method POST -Path '/payments' -Body @{
    expense_id = [int]$eid; expense_number = $exp.data.expense.expense_number
    payee = ($d.vendors | Select-Object -First 1).name; payment_date = (Get-Date -Format 'yyyy-MM-dd')
    amount_paid = 999999; tds_deducted = 0; currency = 'INR'; payment_mode = 'Bank'
    paid_from = $bankName; is_advance = $false
  } -Token $token -CompanyId $DemoCompanyId
  if (-not $overPay.ok) { Log-Result 'VAL-03' 'PASS' 'Server rejected over-allocation payment' }
  else { Log-Result 'VAL-03' 'FAIL' 'Over-allocation payment was accepted' }
}

$eway = Invoke-PortalApi -Method GET -Path '/eway-bills' -Token $token -CompanyId $DemoCompanyId
if ($eway.ok) { Log-Result 'EWAY-01' 'PASS' "E-way bills list OK (count=$($eway.data.eway_bills.Count))" }
else { Log-Result 'EWAY-01' 'WARN' (Format-ApiError $eway) }

Write-Host ''
Write-Host '=== PHASE 2 SUMMARY ===' -ForegroundColor Cyan
$results | Group-Object Status | ForEach-Object { Write-Host "$($_.Name): $($_.Count)" }
$results | Format-Table -AutoSize
Write-Host "QA2 marker: $Marker"
