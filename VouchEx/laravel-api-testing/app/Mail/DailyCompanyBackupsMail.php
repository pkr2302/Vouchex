<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DailyCompanyBackupsMail extends Mailable
{
    use Queueable, SerializesModels;

    /** @param array<int, array{path: string, name: string}> $files */
    public function __construct(
        public string $runDate,
        public int $companyCount,
        public array $files
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'VouchEx daily company backups — '.$this->runDate,
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'mail.daily-company-backups',
            with: [
                'runDate' => $this->runDate,
                'companyCount' => $this->companyCount,
                'fileNames' => array_column($this->files, 'name'),
            ],
        );
    }

    /** @return array<int, Attachment> */
    public function attachments(): array
    {
        return array_map(
            fn (array $f) => Attachment::fromPath($f['path'])->as($f['name']),
            $this->files
        );
    }
}
