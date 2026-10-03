# Note photo loading

Private photo links expire after one hour. Notes now persist the storage path,
not the temporary link, and resolve a fresh link when loading the workspace or
opening a note. Runtime links are cached for 55 minutes. Older saved signed URLs
can recover their original path when they point to the configured workspace
storage bucket.

The notes library, subject notes, and note viewer show photos with loading/error
states. Open a note and select **Retry photo** to request a fresh link. An image
load failure automatically renews the link once before showing an error.
Embedded legacy photos remain available if migration to cloud storage fails.
Uploads retain their colours; OCR preprocessing is applied separately.

This requires the existing private `workspace-files` bucket and user storage
policy from `supabase-setup.sql`. These local changes do not modify the live
Supabase project. If the original file is missing or belongs to a different
account, renewing the link cannot recover its bytes; the UI asks the user to
check their account or attach the photo again.

Run `node --test tests/*.test.cjs` and `node --check site.js`.
Photo tests simulate expired links, missing files, auth/connection errors,
legacy migration, note objects replaced during sync, rendering on both note
surfaces, bounded retries, and failed image conversion. No live account or
physical device was used for validation.
