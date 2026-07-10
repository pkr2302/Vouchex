VouchEx — New subscription payment submitted for approval

A customer has submitted a UPI payment claim on VouchEx. Please verify the payment in your bank/UPI app and approve the subscription from the Super Admin portal (Settings → Subscriptions).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PLAN SELECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Plan: {{ $plan['label'] ?? ucfirst($payment->plan) }}
Amount: ₹{{ number_format((float) $payment->amount, 2) }}
Access period: {{ $plan['days'] ?? '—' }} days
UPI reference: {{ $payment->payment_reference }}
Submitted at: {{ $payment->created_at?->format('d M Y, h:i A') ?? now()->format('d M Y, h:i A') }} (IST)

@if($payment->notes)
Customer notes:
{{ $payment->notes }}
@endif

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: {{ $user->name }}
Email: {{ $user->email }}
Role: {{ $user->role }}
User ID: {{ $user->id }}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPANY DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Company: {{ $settings?->name ?? $company->name }}
Trade name: {{ $settings?->trade_name ?? '—' }}
GSTIN: {{ $settings?->gstin ?? '—' }}
PAN: {{ $settings?->pan ?? '—' }}
State: {{ $settings?->state ?? '—' }}
Phone: {{ $settings?->phone ?? '—' }}
Email: {{ $settings?->email ?? '—' }}
Address: {{ trim(collect([$settings?->address, $settings?->city, $settings?->pincode, $settings?->country])->filter()->implode(', ')) ?: '—' }}
Company ID: {{ $company->id }}

Current subscription status: {{ $company->subscription_status ?? 'none' }}
@if($company->trial_ends_at)
Trial ends: {{ $company->trial_ends_at->format('d M Y') }}
@endif

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Confirm ₹{{ number_format((float) $payment->amount, 2) }} received on UPI (ref: {{ $payment->payment_reference }})
2. Sign in to VouchEx as Super Admin
3. Go to Settings → Subscriptions → Approve payment #{{ $payment->id }}

—
This is an automated notification from VouchEx (https://vouchex.kuhu.org.in).
