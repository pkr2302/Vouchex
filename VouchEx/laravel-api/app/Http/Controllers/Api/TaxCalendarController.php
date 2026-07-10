<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CalendarReminder;
use App\Services\SyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaxCalendarController extends Controller
{
    public function __construct(private SyncService $sync) {}

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $reminder = CalendarReminder::create([
            ...$data,
            'user_id' => $request->user()->id,
            'email_status' => $data['kind'] === 'reminder' ? 'pending' : 'n/a',
        ]);
        $this->sync->bump('calendarReminders', 'create', $reminder->id, $request->user()->id);

        return response()->json(['success' => true, 'reminder' => $this->map($reminder)]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $reminder = CalendarReminder::findOrFail($id);
        $data = $this->validated($request);
        $scheduleChanged = $reminder->reminder_date?->format('Y-m-d') !== $data['reminder_date']
            || $reminder->reminder_time !== $data['reminder_time'];

        $updates = [
            ...$data,
            'email_status' => $data['kind'] === 'reminder' ? 'pending' : 'n/a',
            'email_sent_at' => null,
            'email_error' => null,
        ];
        if ($scheduleChanged) {
            $updates['popup_shown_at'] = null;
        }
        $reminder->update($updates);
        $this->sync->bump('calendarReminders', 'update', $reminder->id, $request->user()->id);

        return response()->json(['success' => true, 'reminder' => $this->map($reminder->fresh())]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $reminder = CalendarReminder::findOrFail($id);
        $reminder->delete();
        $this->sync->bump('calendarReminders', 'delete', $id, $request->user()->id);

        return response()->json(['success' => true]);
    }

    public function acknowledgePopup(Request $request, int $id): JsonResponse
    {
        $reminder = CalendarReminder::findOrFail($id);
        $reminder->update(['popup_shown_at' => now()]);
        $this->sync->bump('calendarReminders', 'update', $reminder->id, $request->user()->id);

        return response()->json(['success' => true, 'reminder' => $this->map($reminder->fresh())]);
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'kind' => 'required|in:task,reminder',
            'title' => 'required|string|max:255',
            'notes' => 'nullable|string|max:5000',
            'reminder_date' => 'required|date',
            'reminder_time' => ['required', 'regex:/^\d{2}:\d{2}$/'],
            'notify_email' => 'required|email|max:255',
            'priority' => 'nullable|in:A,B,C',
            'is_recurring' => 'nullable|boolean',
            'recurring_frequency' => 'nullable|in:daily,weekly,monthly,yearly',
        ]);

        if ($data['kind'] === 'task') {
            $data['priority'] = $data['priority'] ?? 'B';
            $data['is_recurring'] = false;
            $data['recurring_frequency'] = null;
        } else {
            $data['priority'] = null;
            $data['is_recurring'] = (bool) ($data['is_recurring'] ?? false);
            if ($data['is_recurring'] && empty($data['recurring_frequency'])) {
                $data['recurring_frequency'] = 'monthly';
            }
            if (! $data['is_recurring']) {
                $data['recurring_frequency'] = null;
            }
        }

        return $data;
    }

    private function map(CalendarReminder $r): array
    {
        return [
            'id' => $r->id,
            'kind' => $r->kind,
            'priority' => $r->priority,
            'title' => $r->title,
            'notes' => $r->notes,
            'reminder_date' => $r->reminder_date?->format('Y-m-d'),
            'reminder_time' => $r->reminder_time,
            'notify_email' => $r->notify_email,
            'is_recurring' => (bool) $r->is_recurring,
            'recurring_frequency' => $r->recurring_frequency,
            'email_status' => $r->email_status,
            'email_sent_at' => $r->email_sent_at?->toIso8601String(),
            'popup_shown_at' => $r->popup_shown_at?->toIso8601String(),
            'user_id' => $r->user_id,
            'created_at' => $r->created_at?->toIso8601String(),
        ];
    }
}
