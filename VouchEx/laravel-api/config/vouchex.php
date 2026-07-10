<?php

return [
    'backup_notify_emails' => array_values(array_filter(array_map(
        'trim',
        explode(',', env('VOUCHEX_BACKUP_NOTIFY_EMAILS', 'rajatlakhani2@gmail.com,rajpopatpriyank@gmail.com'))
    ))),
    'backup_timezone' => env('VOUCHEX_BACKUP_TIMEZONE', 'Asia/Kolkata'),
    'backup_daily_at' => env('VOUCHEX_BACKUP_DAILY_AT', '13:00'),
];
