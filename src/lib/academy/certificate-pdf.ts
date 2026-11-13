import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

// Standard PDF fonts cannot draw every letter (Ghanaian names can contain ɛ or ɔ),
// so anything the font cannot encode is dropped rather than breaking the certificate.
function safe(font: PDFFont, s: string) {
  const set = new Set(font.getCharacterSet());
  return Array.from(s.normalize("NFC")).filter((c) => set.has(c.codePointAt(0)!)).join("") || "-";
}

export async function buildCertificatePdf(c: { code: string; learnerName: string; courseTitle: string; issuedAt: Date; verifyUrl: string }) {
  const doc = await PDFDocument.create();
  doc.setTitle(`Certificate: ${c.courseTitle}`);
  const page = doc.addPage([841.89, 595.28]);
  const { width: W, height: H } = page.getSize();
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const wine = rgb(0.5, 0, 0.125), ink = rgb(0.18, 0.08, 0.1), gold = rgb(0.85, 0.66, 0.3), grey = rgb(0.45, 0.35, 0.38);
  const centre = (t: string, y: number, f: PDFFont, size: number, color = ink) => {
    const s = safe(f, t); page.drawText(s, { x: (W - f.widthOfTextAtSize(s, size)) / 2, y, size, font: f, color });
  };
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(0.988, 0.973, 0.961) });
  page.drawRectangle({ x: 24, y: 24, width: W - 48, height: H - 48, borderColor: wine, borderWidth: 3 });
  page.drawRectangle({ x: 34, y: 34, width: W - 68, height: H - 68, borderColor: gold, borderWidth: 1 });
  centre("SEWSINESS ACADEMY", H - 110, sans, 13, wine);
  centre("Certificate of Completion", H - 170, serifBold, 44, wine);
  centre("This certifies that", H - 225, serif, 16, grey);
  let nameSize = 40; const name = safe(serifBold, c.learnerName);
  while (serifBold.widthOfTextAtSize(name, nameSize) > W - 160 && nameSize > 18) nameSize -= 2;
  centre(c.learnerName, H - 285, serifBold, nameSize);
  page.drawLine({ start: { x: W / 2 - 180, y: H - 298 }, end: { x: W / 2 + 180, y: H - 298 }, thickness: 1, color: gold });
  centre("has completed all lessons and passed every quiz in", H - 335, serif, 16, grey);
  let tSize = 28; const title = safe(serifBold, c.courseTitle);
  while (serifBold.widthOfTextAtSize(title, tSize) > W - 160 && tSize > 14) tSize -= 2;
  centre(c.courseTitle, H - 380, serifBold, tSize, ink);
  const date = c.issuedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  centre(`Issued ${date}`, 120, serif, 14, grey);
  centre(`Certificate no. ${c.code}`, 96, sans, 10, grey);
  centre(`Check this certificate at ${c.verifyUrl}`, 78, sans, 9, grey);
  return doc.save();
}
