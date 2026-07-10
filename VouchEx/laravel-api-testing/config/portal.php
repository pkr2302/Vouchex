<?php

return [
    'document_lock_ttl_minutes' => (int) env('DOCUMENT_LOCK_TTL_MINUTES', 15),
    'sync_poll_seconds' => (int) env('SYNC_POLL_SECONDS', 5),
    'calendar_timezone' => env('PORTAL_CALENDAR_TZ', 'Asia/Kolkata'),
];
