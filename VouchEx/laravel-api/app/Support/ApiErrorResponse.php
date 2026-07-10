<?php

namespace App\Support;

use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

class ApiErrorResponse
{
    /** Structured JSON for controller-level validation / business rule failures. */
    public static function manual(string $message, int $status = 422, ?string $cause = null, ?string $hint = null, ?string $type = 'business'): JsonResponse
    {
        return response()->json([
            'message' => $message,
            'type' => $type,
            'error' => $message,
            'cause' => $cause ?? 'The server rejected this request before saving.',
            'hint' => $hint ?? 'Correct the issue described above and submit again.',
        ], $status);
    }

    public static function fromThrowable(Throwable $e, Request $request, int $defaultStatus = 500): JsonResponse
    {
        if ($e instanceof ValidationException) {
            $first = collect($e->errors())->flatten()->first();

            return response()->json([
                'message' => $first ?: 'Some fields failed validation.',
                'type' => 'validation',
                'errors' => $e->errors(),
                'cause' => 'The server rejected the submitted data before saving.',
                'hint' => 'Check the fields listed under Validation and correct them, then try again.',
            ], $e->status);
        }

        $status = $defaultStatus;
        if ($e instanceof HttpExceptionInterface) {
            $status = $e->getStatusCode();
        }

        $payload = [
            'message' => self::headline($e, $status),
            'type' => self::typeFor($e),
            'error' => $e->getMessage(),
            'cause' => self::causeFor($e),
            'hint' => self::hintFor($e, $request),
        ];

        if ($e instanceof QueryException) {
            $payload['sql_state'] = $e->errorInfo[0] ?? null;
            $payload['sql_code'] = isset($e->errorInfo[1]) ? (int) $e->errorInfo[1] : null;
            $payload['error'] = $e->errorInfo[2] ?? $e->getMessage();
        }

        if (config('app.debug')) {
            $payload['file'] = basename($e->getFile()).':'.$e->getLine();
            $payload['exception'] = class_basename($e);
        } elseif ($payload['error'] === $payload['message']) {
            $payload['error'] = $e->getMessage();
        }

        return response()->json($payload, $status);
    }

    private static function headline(Throwable $e, int $status): string
    {
        if ($e instanceof QueryException) {
            return match ((int) ($e->errorInfo[1] ?? 0)) {
                1062 => 'Duplicate record — this value already exists in the database.',
                1452 => 'Linked record missing — a related customer, product, or company record was not found.',
                1406, 1265 => 'Data too long — one field exceeds the allowed length (often GSTIN is max 15 characters).',
                1048, 1364 => 'Required field missing — the database expected a value that was not sent.',
                1067 => 'Invalid date or timestamp value sent to the database.',
                default => 'Database error while saving your data.',
            };
        }

        if ($status === 403) {
            return 'You do not have permission to perform this action.';
        }

        if ($status === 404) {
            return 'The requested record was not found.';
        }

        if ($status === 422) {
            return $e->getMessage() ?: 'The request could not be processed.';
        }

        if ($e instanceof \InvalidArgumentException) {
            return $e->getMessage();
        }

        return 'Server error — the request could not be completed.';
    }

    private static function typeFor(Throwable $e): string
    {
        if ($e instanceof ValidationException) {
            return 'validation';
        }
        if ($e instanceof QueryException) {
            return 'database';
        }
        if ($e instanceof HttpExceptionInterface) {
            return 'http';
        }

        return 'server';
    }

    private static function causeFor(Throwable $e): string
    {
        if ($e instanceof QueryException) {
            $code = (int) ($e->errorInfo[1] ?? 0);
            $detail = $e->errorInfo[2] ?? $e->getMessage();

            return match ($code) {
                1062 => 'A unique rule was violated (for example duplicate invoice number). Detail: '.$detail,
                1452 => 'A foreign-key link points to a record that does not exist (wrong customer, product, or company). Detail: '.$detail,
                1406, 1265 => 'Text or number in the form is too long or invalid for the column. Detail: '.$detail,
                1048, 1364 => 'A required database column received NULL or an empty value. Detail: '.$detail,
                1067 => 'A date field (often due date) had an invalid or empty value. Detail: '.$detail,
                default => 'MySQL rejected the insert/update. Detail: '.$detail,
            };
        }

        if (str_contains($e->getMessage(), 'Company context required')) {
            return 'No company was selected. Super admin must pick a company from the top dropdown before saving transactions.';
        }

        if ($e instanceof \InvalidArgumentException) {
            return $e->getMessage();
        }

        return class_basename($e).': '.$e->getMessage();
    }

    private static function hintFor(Throwable $e, Request $request): string
    {
        if ($e instanceof QueryException) {
            return match ((int) ($e->errorInfo[1] ?? 0)) {
                1062 => 'Refresh the page and try again, or use a different document number.',
                1452 => 'Re-select the customer and line items from the dropdown lists (do not use stale data). Ensure the correct company is selected in the header.',
                1406, 1265 => 'Shorten GSTIN to 15 characters, reduce long text fields, and try again.',
                1048, 1364 => 'Fill all mandatory fields (customer, dates, line item description and rate) and try again.',
                1067 => 'Set a valid issue date and due date, then try again.',
                default => 'If this persists, contact support with the Technical detail shown above.',
            };
        }

        if ($request->is('api/invoices') && $request->isMethod('post')) {
            return 'Ensure a customer is selected, every line has description + rate, GSTIN is valid, and the correct company is active in the header dropdown. If you see a duplicate invoice number, open Income → Invoices — a previous save may have already created it.';
        }

        if (str_contains($e->getMessage(), 'Company context required')) {
            return 'Select a company from the dropdown at the top-right (super admin), then retry.';
        }

        return 'Read the Technical detail above, fix the mentioned field or setting, and submit again.';
    }
}
