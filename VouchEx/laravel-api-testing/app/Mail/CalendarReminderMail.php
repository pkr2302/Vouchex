<?php

namespace App\Mail;

use App\Models\CalendarReminder;
use App\Models\CompanySetting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CalendarReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public CalendarReminder $reminder,
        public ?string $companyName = null
    ) {}

    public function envelope(): Envelope
    {
        $label = $this->reminder->kind === 'task' ? 'Task' : 'Reminder';

        return new Envelope(
            subject: "VouchEx {$label}: {$this->reminder->title}",
        );
    }

    public function content(): Content
    {
        $when = $this->reminder->reminder_date?->format('d M Y').' at '.$this->reminder->reminder_time;

        return new Content(
            text: 'mail.calendar-reminder',
            with: [
                'reminder' => $this->reminder,
                'companyName' => $this->companyName ?? 'Your company',
                'when' => $when,
            ],
        );
    }
}
