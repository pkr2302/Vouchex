/**
 * Parse an API / network failure into structured sections for the error dialog.
 */
export function parseApiError(err, context = '') {
  const data = err?.data || {};
  const status = err?.status || data.status;

  const sections = [];

  if (context) {
    sections.push({ title: 'What you were doing', body: context, tone: 'neutral' });
  } else if (data.action || err?.action) {
    sections.push({ title: 'Request', body: data.action || err.action, tone: 'neutral' });
  }

  const headline = data.message || (err?.message && !err?.data ? err.message : null);
  if (headline) {
    sections.push({ title: 'Problem', body: headline, tone: 'error' });
  }

  const technical = data.error;
  if (technical && technical !== headline) {
    sections.push({ title: 'Technical detail', body: technical, tone: 'mono' });
  }

  if (data.cause) {
    sections.push({ title: 'Why this happened', body: data.cause, tone: 'warn' });
  }

  if (data.errors && typeof data.errors === 'object') {
    const validation = Object.entries(data.errors)
      .map(([field, msgs]) => {
        const text = Array.isArray(msgs) ? msgs.join('; ') : String(msgs);
        return `• ${field}: ${text}`;
      })
      .join('\n');
    if (validation) {
      sections.push({ title: 'Validation issues', body: validation, tone: 'warn' });
    }
  }

  if (data.hint) {
    sections.push({ title: 'What to do', body: data.hint, tone: 'info' });
  }

  const meta = [];
  if (data.sql_code) {
    meta.push(`Database code: ${data.sql_code}${data.sql_state ? ` (${data.sql_state})` : ''}`);
  }
  if (status) meta.push(`HTTP status: ${status}`);
  if (data.file) meta.push(`Server location: ${data.file}`);
  if (data.exception) meta.push(`Exception: ${data.exception}`);
  if (meta.length) {
    sections.push({ title: 'Reference', body: meta.join('\n'), tone: 'muted' });
  }

  const isGeneric =
    !data.cause &&
    !data.error &&
    !data.hint &&
    (!headline || /^(server error|request failed|internal server error)$/i.test(String(headline).trim()));

  if (isGeneric && status >= 500) {
    sections.push({
      title: 'Why this happened',
      body: 'The server failed before it could return a detailed explanation. This usually means the latest backend error-reporting files are not deployed yet, or PHP crashed.',
      tone: 'warn',
    });
    sections.push({
      title: 'What to do',
      body: 'Upload the latest laravel-api files (ApiErrorResponse.php, bootstrap/app.php, PortalMutationController.php), run php artisan config:cache, then try again. If it persists, check storage/logs/laravel.log on the server.',
      tone: 'info',
    });
  }

  if (sections.length === 0) {
    sections.push({
      title: 'Problem',
      body: context ? 'The operation failed.' : 'Request failed.',
      tone: 'error',
    });
  }

  return {
    title: headline && !/^(server error|request failed)$/i.test(headline) ? headline : 'Something went wrong',
    sections,
  };
}

/** Plain-text version for logs and login banners. */
export function formatApiError(err, context = '') {
  const { sections } = parseApiError(err, context);
  return sections.map((s) => `${s.title}:\n${s.body}`).join('\n\n');
}

let dialogHandler = null;

/** Register the React error dialog (called by ErrorDialogProvider on mount). */
export function registerErrorDialog(handler) {
  dialogHandler = handler;
}

/** Show a detailed error popup — use instead of alert(err.message). */
export function showApiError(context, err, fallback = 'The operation failed.') {
  if (dialogHandler) {
    dialogHandler(context, err, fallback);
    return;
  }
  const text = formatApiError(err, context) || fallback;
  alert(text);
}
