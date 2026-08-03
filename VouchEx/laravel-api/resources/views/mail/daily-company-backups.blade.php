VouchEx — Daily automated company backups

Run date: {{ $runDate }}

Attached: {{ $companyCount }} company backup(s).

Attachment(s):
@foreach($fileNames as $name)
- {{ $name }}
@endforeach

If the attachment is a .zip file, unzip it to get one JSON file per company.

Each JSON file is a complete snapshot of that company's data only (transactions, users, settings, logs). Other companies are not included.

To restore: log in as super admin, select the company in the header, open Settings → Data Backups, and use Restore.

—
This message was sent automatically by VouchEx.
