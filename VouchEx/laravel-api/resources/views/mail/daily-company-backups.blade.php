VouchEx — Daily automated company backups

Run date: {{ $runDate }}

Attached: {{ $companyCount }} backup file(s), one per active company on the portal.

Files:
@foreach($fileNames as $name)
- {{ $name }}
@endforeach

Each file is a complete JSON snapshot of that company's data only (transactions, users, settings, logs). Other companies are not included.

To restore: log in as super admin, select the company in the header, open Settings → Data Backups, and use Restore.

—
This message was sent automatically by VouchEx.
