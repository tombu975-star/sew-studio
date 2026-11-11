/**
 * Sends one test email with the app's real email settings.
 *   railway run npm run email:test -- you@example.com
 * It prints which provider was used and the exact error if it fails.
 */
import { emailProviderConfigured, sendEmailDetailed } from "../src/lib/mailer";

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error("Usage: npm run email:test -- you@example.com");
    process.exit(1);
  }
  console.log(`Provider in use: ${emailProviderConfigured()}`);
  const r = await sendEmailDetailed({
    to,
    subject: "Sewsiness test email",
    body: "If you can read this, Sewsiness can send email.\n\nhttps://example.com/test-link",
    type: "test",
  });
  console.log(
    r.ok ? `Sent via ${r.provider}. Check the inbox (and spam) of ${to}.` : `FAILED (${r.provider}): ${r.error}`
  );
  process.exit(r.ok ? 0 : 1);
}

main();
