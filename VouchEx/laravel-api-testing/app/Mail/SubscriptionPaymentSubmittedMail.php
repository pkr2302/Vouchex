<?php

namespace App\Mail;

use App\Models\Company;
use App\Models\CompanySetting;
use App\Models\SubscriptionPayment;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SubscriptionPaymentSubmittedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public SubscriptionPayment $payment,
        public User $user,
        public Company $company,
        public ?CompanySetting $settings,
        public array $planDetails,
    ) {}

    public function envelope(): Envelope
    {
        $companyLabel = $this->settings?->name ?: $this->company->name;

        return new Envelope(
            subject: "VouchEx — New subscription payment submitted ({$companyLabel})",
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'mail.subscription-payment-submitted',
            with: [
                'payment' => $this->payment,
                'user' => $this->user,
                'company' => $this->company,
                'settings' => $this->settings,
                'plan' => $this->planDetails,
            ],
        );
    }
}
