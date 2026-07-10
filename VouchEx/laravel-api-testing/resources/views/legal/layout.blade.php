<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title') — VouchEx</title>
    <meta name="description" content="@yield('meta_description')">
    <meta name="robots" content="noindex, nofollow">
    <link rel="icon" href="/favicon.ico" sizes="any">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="manifest" href="/site.webmanifest">
    <meta name="theme-color" content="#001B5E">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --vx-navy: #0c1f4a;
            --vx-blue: #2563eb;
            --vx-text: #0f172a;
            --vx-muted: #475569;
            --vx-border: #e2e8f0;
            --vx-bg: #f8fafc;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: 'Inter', system-ui, sans-serif;
            color: var(--vx-text);
            background: var(--vx-bg);
            line-height: 1.65;
        }
        .vx-legal-header {
            background: linear-gradient(135deg, #061228 0%, #0c1f4a 100%);
            border-bottom: 1px solid rgba(255,255,255,0.08);
            padding: 20px 24px;
        }
        .vx-legal-header-inner {
            max-width: 880px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            flex-wrap: wrap;
        }
        .vx-legal-header a.vx-home {
            color: #93c5fd;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
        }
        .vx-legal-header a.vx-home:hover { color: #fff; }
        .vx-legal-logo { height: 48px; width: auto; }
        .vx-legal-main {
            max-width: 880px;
            margin: 0 auto;
            padding: 40px 24px 56px;
        }
        .vx-legal-main h1 {
            font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
            font-size: clamp(1.75rem, 4vw, 2.25rem);
            margin: 0 0 8px;
            color: var(--vx-navy);
        }
        .vx-legal-updated {
            color: var(--vx-muted);
            font-size: 14px;
            margin-bottom: 32px;
        }
        .vx-legal-main h2 {
            font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
            font-size: 1.125rem;
            margin: 28px 0 10px;
            color: var(--vx-navy);
        }
        .vx-legal-main p, .vx-legal-main li {
            color: #334155;
            font-size: 15px;
        }
        .vx-legal-main ul { padding-left: 1.25rem; }
        .vx-legal-main li { margin-bottom: 8px; }
        .vx-legal-main a { color: var(--vx-blue); }
        .vx-legal-footer {
            border-top: 1px solid var(--vx-border);
            padding: 24px;
            text-align: center;
            font-size: 13px;
            color: var(--vx-muted);
            background: #fff;
        }
        .vx-legal-footer nav {
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
            margin-bottom: 12px;
        }
        .vx-legal-footer nav a {
            color: var(--vx-blue);
            text-decoration: none;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <header class="vx-legal-header">
        <div class="vx-legal-header-inner">
            <a href="/"><img src="/brand/vouchex-logo.svg" alt="VouchEx" class="vx-legal-logo"></a>
            <a class="vx-home" href="/">← Back to VouchEx homepage</a>
        </div>
    </header>

    <main class="vx-legal-main">
        @yield('content')
    </main>

    <footer class="vx-legal-footer">
        <nav>
            <a href="/">Home</a>
            <a href="/privacy-policy">Privacy Policy</a>
            <a href="/terms-of-service">Terms of Service</a>
        </nav>
        <p>© {{ date('Y') }} VouchEx. All rights reserved.</p>
    </footer>
</body>
</html>
