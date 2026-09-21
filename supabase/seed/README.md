# Local seed

`local.sql` runs only through the local reset workflow. It contains the UNC reference row and an empty domain allowlist, with no real users, login credentials, or enrollment claim. Synthetic identity fixtures live in transactional SQL tests. Never include local seed data in a hosted push.
