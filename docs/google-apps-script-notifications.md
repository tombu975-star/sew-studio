# Google Apps Script — customer notification receiver

Paste this into a new Apps Script project (script.google.com), deploy it as
a Web App, and put the deployment URL + your chosen secret into
`GOOGLE_APPS_SCRIPT_URL` / `GOOGLE_APPS_SCRIPT_SECRET` (see `DEPLOYMENT.md`).

What it does on every call from the app:
1. Checks the shared secret — rejects the request if it doesn't match.
2. Appends a row to a "Notifications" sheet in the script's bound
   spreadsheet (created automatically on first run) — a durable log you can
   open any time, independent of the app's own database.
3. If the channel is `email` and a recipient address was given, sends it via
   `GmailApp` (using the Google account the script is deployed under).
4. For `whatsapp`/`sms`, there's a clearly marked spot to call your provider
   of choice (Twilio, Meta's WhatsApp Cloud API, etc.) via `UrlFetchApp` —
   left as a stub since which provider (if any) is up to you. Until you fill
   that in, those channels are still logged to the sheet either way.

```javascript
// ── Configuration ──────────────────────────────────────────────
var SHARED_SECRET = "choose-a-random-string"; // must match GOOGLE_APPS_SCRIPT_SECRET
var SHEET_NAME = "Notifications";

function doPost(e) {
  var result = { ok: false };
  try {
    var payload = JSON.parse(e.postData.contents);

    if (payload.secret !== SHARED_SECRET) {
      return respond({ ok: false, error: "Invalid secret" }, 401);
    }

    logToSheet(payload);

    if (payload.channel === "email" && payload.recipient) {
      GmailApp.sendEmail(payload.recipient, payload.title || "Update from your atelier", payload.body || "");
      result.ok = true;
    } else if (payload.channel === "whatsapp" || payload.channel === "sms") {
      // ── Plug in your provider here (Twilio, WhatsApp Cloud API, etc.) ──
      // Example shape for a generic REST provider:
      //
      // UrlFetchApp.fetch("https://your-provider.example.com/send", {
      //   method: "post",
      //   contentType: "application/json",
      //   payload: JSON.stringify({ to: payload.recipient, message: payload.body }),
      //   headers: { Authorization: "Bearer YOUR_PROVIDER_API_KEY" },
      // });
      //
      // Until this is filled in, these channels are logged to the sheet
      // above but not actually delivered — report that honestly:
      result.ok = false;
      result.error = "whatsapp/sms provider not configured in the script yet";
    } else {
      // in_app, or a channel with no recipient — nothing to send externally.
      result.ok = true;
    }
  } catch (err) {
    result.ok = false;
    result.error = String(err);
  }
  return respond(result, result.ok ? 200 : 500);
}

function logToSheet(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.create("Madam Studio Notifications");
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["Timestamp", "Shop ID", "Type", "Channel", "Recipient", "Customer", "Title", "Body"]);
  }
  sheet.appendRow([
    new Date(),
    payload.shopId || "",
    payload.type || "",
    payload.channel || "",
    payload.recipient || "",
    payload.customerName || "",
    payload.title || "",
    payload.body || "",
  ]);
}

function respond(obj, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  // Note: Apps Script Web Apps don't let you set a custom HTTP status code
  // on the response; the app only checks the JSON body's `ok` field, so
  // this is fine — `statusCode` is accepted above for clarity but unused.
}
```

## What the app sends

```json
{
  "secret": "your-shared-secret",
  "shopId": "uuid",
  "channel": "whatsapp | sms | email | in_app",
  "recipient": "+233... or name@example.com",
  "title": "Order update",
  "body": "Good news — your garment is ready for collection. (Silk Evening Gown)",
  "type": "status_change | payment_received | fitting_scheduled | fitting_completed | message | ready_for_collection | delivered",
  "customerName": "Ama Serwaa"
}
```

The app only calls this for `whatsapp`/`sms`/`email` channels with a
recipient present — `in_app`-only notifications never reach the script (there's
nothing external to send).
