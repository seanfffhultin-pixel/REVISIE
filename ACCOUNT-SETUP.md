# Account recovery and deletion

The account screens use the existing Supabase project. To enable these features in production:

1. In Supabase **Authentication → URL Configuration**, set the production Site URL and add the exact recovery URL (`https://YOUR-SITE/account.html?mode=recovery`) to Redirect URLs. Add preview/local recovery URLs separately if needed. Keep the existing signup confirmation redirect allowed too.
2. Check the **Reset Password** email template uses Supabase's `{{ .ConfirmationURL }}` link, and configure email delivery for production.
3. Apply `supabase-setup.sql` if the workspace, share-link tables and storage policies have not already been created. Both tables must retain their `on delete cascade` foreign keys to `auth.users`.
4. Deploy the server function with your authorized Supabase CLI session:

   ```sh
   supabase functions deploy delete-account --project-ref ezlxermogoenqqecplev --no-verify-jwt
   ```

   JWT verification at the gateway is disabled for compatibility with Supabase's newer signing keys; the function explicitly verifies the bearer token with `auth.getUser(token)` before any action. Supabase supplies the server environment variables `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. Never put the service role key in browser code.

The deletion function verifies the current password, removes every file under the authenticated user's `workspace-files` folder, then deletes that user. The workspace and their shared snapshots cascade away. The browser clears its REVISIÉ cache only after server success. Storage cleanup and account deletion are not a single transaction: if cleanup fails partway, the account remains and deletion can be retried; some files may already have been removed.

Check on a disposable account: request/reset a password, open an expired link, reject an incorrect deletion password, cancel deletion, then delete an account with notes/PDFs/share links and verify the account, files and shared links are gone. Local browser tests mock Supabase and do not validate production email delivery or deployment.

API references: [password recovery](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [server account deletion](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser).
