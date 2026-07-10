VouchEx — {{ $reminder->kind === 'task' ? 'Task' : 'Reminder' }} due

Company: {{ $companyName }}

Title: {{ $reminder->title }}

Scheduled: {{ $when }}

@if($reminder->notes)
Notes:
{{ $reminder->notes }}
@endif

—
This message was sent automatically by VouchEx Tax Calendar.
Please verify statutory due dates on official government portals before filing.
