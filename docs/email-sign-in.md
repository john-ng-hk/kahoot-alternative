# Email sign-in setup

Hosts sign in with an email code or link. Supabase Auth sends the email through Amazon SES.
No secrets are stored in this repo.

## AWS (account `imhk-master`, region `ap-southeast-1`)

- SES domain identity `quiz.imhk.tech` with DKIM. The 3 DKIM CNAME records are in the `imhk.tech` zone in the `imhk-network` account.
- IAM user `quiz-ses-smtp`: may only call `ses:SendRawEmail` as `notify@quiz.imhk.tech`. Its access key gives the SES SMTP username, and the SMTP password is derived from its secret.
- SES is in sandbox mode. It only sends to verified recipient identities, so each new host address must be verified, or production access must be approved.

## Supabase (Authentication)

- SMTP Settings: host `email-smtp.ap-southeast-1.amazonaws.com`, port 587, sender `notify@quiz.imhk.tech`, username and password from the IAM user above.
- Email Templates: put `<p>Your sign-in code: <strong>{{ .Token }}</strong></p>` in both **Magic Link** and **Confirm sign up** (new addresses get the second one). Keep `{{ .ConfirmationURL }}` for the link. Avoid the subject "Your Magic Link", which corporate filters tend to hold.
- URL Configuration: Site URL and Redirect URLs must include the production site.

## Known behaviour

- Some corporate mail gateways (for example Proofpoint URL Defense) open links in email and use up the one-time token. The sign-in code avoids this.
- Supabase allows one sign-in email per address every 60 seconds.
- To rotate the SMTP password, create a new access key for `quiz-ses-smtp`, derive the SMTP password, update Supabase, then delete the old key.
