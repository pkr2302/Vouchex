<?php

namespace App\Console\Commands;

use App\Mail\CalendarReminderMail;
use App\Models\CalendarReminder;
use App\Models\CompanySetting;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendCalendarReminderEmails extends Command
{
    protected $signature = 'calendar:send-reminders';

    protected $description = 'Send due tax calendar reminder emails (runs via scheduler/cron)';

    public function handle(): int
    {
        $tz = config('portal.calendar_timezone', 'Asia/Kolkata');
        $now = Carbon::now($tz);

        $due = CalendarReminder::withoutGlobalScopes()
            ->where('kind', 'reminder')
            ->where('email_status', 'pending')
            ->whereNull('email_sent_at')
            ->get()
            ->filter(function (CalendarReminder $r) use ($tz, $now) {
                $at = Carbon::parse(
                    $r->reminder_date->format('Y-m-d').' '.$r->reminder_time.':00',
                    $tz
                );

                return $at->lte($now);
            });

        $sent = 0;
        foreach ($due as $reminder) {
            $company = CompanySetting::withoutGlobalScopes()
                ->where('company_id', $reminder->company_id)
                ->first();
            $companyName = $company?->name ?? 'VouchEx Company';

            try {
                Mail::to($reminder->notify_email)->send(new CalendarReminderMail($reminder, $companyName));

                if ($reminder->is_recurring && $reminder->recurring_frequency) {
                    $nextDate = $this->nextOccurrence($reminder->reminder_date, $reminder->recurring_frequency);
                    $reminder->update([
                        'reminder_date' => $nextDate,
                        'email_status' => 'pending',
                        'email_sent_at' => null,
                        'email_error' => null,
                        'popup_shown_at' => null,
                        'last_occurrence_sent_at' => now(),
                    ]);
                } else {
                    $reminder->update([
                        'email_status' => 'sent',
                        'email_sent_at' => now(),
                        'email_error' => null,
                        'last_occurrence_sent_at' => now(),
                    ]);
                }
                $sent++;
            } catch (\Throwable $e) {
                $reminder->update([
                    'email_status' => 'failed',
                    'email_error' => substr($e->getMessage(), 0, 500),
                ]);
                $this->error("Reminder #{$reminder->id}: {$e->getMessage()}");
            }
        }

        $this->info("Calendar reminders processed: {$sent} sent, ".$due->count().' checked.');

        return self::SUCCESS;
    }

    private function nextOccurrence(Carbon $date, string $frequency): Carbon
    {
        return match ($frequency) {
            'daily' => $date->copy()->addDay(),
            'weekly' => $date->copy()->addWeek(),
            'yearly' => $date->copy()->addYear(),
            default => $date->copy()->addMonth(),
        };
    }
}
