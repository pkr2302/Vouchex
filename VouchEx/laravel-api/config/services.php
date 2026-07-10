<?php

return [
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
    ],

    'vouchex' => [
        'upi_vpa' => env('VOUCHEX_UPI_VPA', ''),
        'upi_payee_name' => env('VOUCHEX_UPI_PAYEE_NAME', 'VouchEx'),
        'upi_qr_url' => env('VOUCHEX_UPI_QR_URL', '/brand/upi-payment-qr.png'),
        'support_email' => env('VOUCHEX_SUPPORT_EMAIL', 'support@vouchex.com'),
        'subscription_notify_emails' => array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('VOUCHEX_SUBSCRIPTION_NOTIFY_EMAILS', 'rajpopatpriyank@gmail.com,rajatlakhani2@gmail.com'))
        ))),
    ],
];
