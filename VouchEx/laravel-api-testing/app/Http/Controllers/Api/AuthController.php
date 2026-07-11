<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\LoginLog;
use App\Models\User;
use App\Services\GoogleAuthService;
use App\Services\LogRetentionService;
use App\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private LogRetentionService $logRetention,
        private SubscriptionService $subscriptions,
        private GoogleAuthService $google,
    ) {}

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|max:255|confirmed',
        ]);

        $user = User::create([
            'name' => trim($data['name']),
            'email' => strtolower($data['email']),
            'password' => $data['password'],
            'role' => 'trial_owner',
            'auth_provider' => 'local',
            'onboarding_step' => 'company_create',
            'password_set' => true,
            'is_active' => true,
        ]);

        return response()->json($this->issueTokenResponse($user, 'Trial registration completed.'));
    }

    public function google(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id_token' => 'required|string',
        ]);

        try {
            $googleUser = $this->google->verifyIdToken($data['id_token']);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $user = User::where('google_id', $googleUser['google_id'])
            ->orWhere('email', $googleUser['email'])
            ->first();

        if ($user) {
            if (! $user->google_id) {
                $user->update([
                    'google_id' => $googleUser['google_id'],
                    'auth_provider' => 'google',
                ]);
            }
        } else {
            $user = User::create([
                'name' => $googleUser['name'],
                'email' => $googleUser['email'],
                'password' => Hash::make(bin2hex(random_bytes(16))),
                'role' => 'trial_owner',
                'google_id' => $googleUser['google_id'],
                'auth_provider' => 'google',
                'onboarding_step' => 'company_create',
                'password_set' => false,
                'is_active' => true,
            ]);
        }

        $payload = $this->issueTokenResponse($user, 'Google sign-in successful.');
        $payload['needs_password'] = ! $user->password_set;

        return response()->json($payload);
    }

    public function setPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'password' => 'required|string|min:8|max:255|confirmed',
        ]);

        $user = $request->user();
        $user->update([
            'password' => $data['password'],
            'password_set' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Password saved successfully.',
            'user' => $this->userPayload($user),
        ]);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email|max:255',
            'password' => 'required|string|max:255',
        ]);

        $user = User::where('email', strtolower($data['email']))->where('is_active', true)->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials. User does not exist or password is incorrect.'],
            ]);
        }

        return response()->json($this->issueTokenResponse($user, 'Login successful.'));
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        try {
            LoginLog::create([
                'company_id' => $user->company_id,
                'user_id' => $user->id,
                'email' => $user->email,
                'name' => $user->name,
                'status' => 'Logout',
                'details' => $request->boolean('inactivity')
                    ? 'Logged out automatically due to inactivity.'
                    : 'User clicked Logout button.',
                'logged_at' => now(),
            ]);
        } catch (\Throwable) {
        }

        try {
            $this->logRetention->pruneLoginLogs();
        } catch (\Throwable) {
        }

        $request->user()->currentAccessToken()?->delete();

        return response()->json(['success' => true]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $company = $user->company_id ? Company::find($user->company_id) : null;

        return response()->json([
            'user' => $this->userPayload($user),
            'companies' => $this->companiesForUser($user),
            'account' => $this->subscriptions->accountPayload($user, $company),
            'needs_password' => $user->auth_provider === 'google' && ! $user->password_set,
        ]);
    }

    private function issueTokenResponse(User $user, string $detail): array
    {
        $token = $user->createToken('vouchex-portal')->plainTextToken;

        try {
            LoginLog::create([
                'company_id' => $user->company_id,
                'user_id' => $user->id,
                'email' => $user->email,
                'name' => $user->name,
                'status' => 'Success',
                'details' => $detail.' Role ['.strtoupper($user->role).'].',
                'logged_at' => now(),
            ]);
            $this->logRetention->pruneLoginLogs();
        } catch (\Throwable) {
        }

        $company = $user->company_id ? Company::find($user->company_id) : null;

        return [
            'success' => true,
            'token' => $token,
            'user' => $this->userPayload($user),
            'companies' => $this->companiesForUser($user),
            'account' => $this->subscriptions->accountPayload($user, $company),
            'needs_password' => $user->auth_provider === 'google' && ! $user->password_set,
        ];
    }

    private function userPayload(User $user): array
    {
        $managed = $user->isSuperAdmin()
            ? []
            : $user->accessibleCompanyIds();

        return [
            'id' => $user->id,
            'email' => $user->email,
            'name' => $user->name,
            'role' => $user->role,
            'company_id' => $user->company_id,
            'onboarding_step' => $user->onboarding_step,
            'created_at' => $user->created_at?->toIso8601String(),
            'managed_company_ids' => $managed,
        ];
    }

    private function companiesForUser(User $user): array
    {
        return array_map(
            static fn (array $company) => [
                'id' => $company['id'],
                'name' => $company['name'],
                'slug' => $company['slug'],
            ],
            Company::portalListFor($user)
        );
    }
}
