<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PortalSetting extends Model
{
    protected $fillable = [
        'inactivity_timeout',
        'last_backup_email_at',
        'last_backup_email_ok',
        'last_backup_email_message',
        'last_scheduled_backup_on',
    ];

    protected function casts(): array
    {
        return [
            'last_backup_email_at' => 'datetime',
            'last_backup_email_ok' => 'boolean',
        ];
    }

    public static function record(): self
    {
        $row = self::query()->first();
        if ($row) {
            return $row;
        }

        return self::query()->create(['inactivity_timeout' => 900]);
    }

    public static function inactivityTimeout(): int
    {
        return max(60, (int) self::record()->inactivity_timeout);
    }

    public static function setInactivityTimeout(int $seconds): self
    {
        $row = self::record();
        $row->inactivity_timeout = max(60, min(7200, $seconds));
        $row->save();

        return $row;
    }

    public static function recordBackupEmailRun(bool $ok, string $message): self
    {
        $row = self::record();
        $row->last_backup_email_at = now();
        $row->last_backup_email_ok = $ok;
        $row->last_backup_email_message = $message;
        $row->save();

        return $row;
    }

    public static function scheduledBackupAlreadySentToday(string $timezone = 'Asia/Kolkata'): bool
    {
        $today = now($timezone)->format('Y-m-d');
        $row = self::record();

        return $row->last_scheduled_backup_on === $today;
    }

    public static function markScheduledBackupSent(string $timezone = 'Asia/Kolkata'): self
    {
        $row = self::record();
        $row->last_scheduled_backup_on = now($timezone)->format('Y-m-d');
        $row->save();

        return $row;
    }
}
