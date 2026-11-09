# Platform releases and audit history

The existing **Experience & releases** console at `/admin/experience` now includes release snapshots and an administrator audit log.

1. Save platform presentation settings to update the live login branding and theme.
2. Enter a version and release notes, then choose **Save draft**. The server captures a snapshot of the current saved settings; clients cannot submit arbitrary snapshot data.
3. Choose **Publish** on a draft to apply that snapshot. The previous published snapshot is archived.
4. Choose **Restore** on an earlier release to reapply it. The restored release becomes the active published snapshot.
5. Review settings edits, draft creation, publishing and restores in the audit log.

This controls version metadata and the platform presentation settings only. It does not deploy or roll back application code; use the configured deployment pipeline for code releases.

Database migrations run through `npm run db:migrate`; migration `018_platform_release_management.sql` adds the release registry and audit log. No manual app configuration or secret is required.
