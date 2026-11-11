import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";

export interface PortfolioTask {
  title: string;
  competencyUnitTitle?: string | null;
  score?: number | null;
  maxScore?: number | null;
  feedback?: string | null;
  updatedAt: Date | string;
}

export interface PortfolioSkillLog {
  skill: string;
  status: string;
  date: Date | string;
  note?: string | null;
}

export interface PortfolioCertificate {
  certificateNo: string;
  programName: string;
  durationWeeks: number;
  skillsAchieved: string;
  honors?: string | null;
  issuedAt: Date | string;
  issuedByName?: string | null;
}

export interface PortfolioData {
  shopName: string;
  traineeName: string;
  traineeEmail: string;
  mentorName?: string | null;
  programName?: string | null;
  programLevel?: string | null;
  trainingDurationWeeks?: number | null;
  trainingStartedAt?: Date | string | null;
  completedTasks: PortfolioTask[];
  skillLogs: PortfolioSkillLog[];
  certificate?: PortfolioCertificate | null;
}

const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;

const INK = rgb(0.08, 0.08, 0.1);
const MUTE = rgb(0.4, 0.42, 0.46);
const MAROON = rgb(0.5, 0, 0.125); // matches the app's #832138 accent
const LINE = rgb(0.85, 0.85, 0.86);

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Greedy word-wrap a string to fit maxWidth at the given font/size. */
function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export async function buildPortfolioPdf(data: PortfolioData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${data.traineeName} — Training Portfolio`);
  pdf.setAuthor(data.shopName);

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPageIfNeeded = (needed: number) => {
    if (y - needed < MARGIN) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const drawText = (
    text: string,
    opts: {
      font?: PDFFont;
      size?: number;
      color?: ReturnType<typeof rgb>;
      x?: number;
      gap?: number;
    } = {},
  ) => {
    const font = opts.font ?? regular;
    const size = opts.size ?? 10;
    const x = opts.x ?? MARGIN;
    newPageIfNeeded(size + 4);
    page.drawText(text, { x, y, size, font, color: opts.color ?? INK });
    y -= size + (opts.gap ?? 6);
  };

  const drawWrapped = (
    text: string,
    opts: {
      font?: PDFFont;
      size?: number;
      color?: ReturnType<typeof rgb>;
      x?: number;
      maxWidth?: number;
      lineGap?: number;
    } = {},
  ) => {
    const font = opts.font ?? regular;
    const size = opts.size ?? 9.5;
    const x = opts.x ?? MARGIN;
    const maxWidth = opts.maxWidth ?? CONTENT_W;
    const lines = wrapText(text, font, size, maxWidth);
    for (const line of lines) {
      newPageIfNeeded(size + 3);
      page.drawText(line, { x, y, size, font, color: opts.color ?? INK });
      y -= size + (opts.lineGap ?? 3);
    }
  };

  const drawRule = () => {
    newPageIfNeeded(10);
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 0.75,
      color: LINE,
    });
    y -= 16;
  };

  const drawSectionHeading = (title: string) => {
    newPageIfNeeded(28);
    drawText(title.toUpperCase(), {
      font: bold,
      size: 11,
      color: MAROON,
      gap: 4,
    });
    drawRule();
  };

  // ── Header ──────────────────────────────────────────────
  drawText(data.shopName, { font: bold, size: 18, gap: 2 });
  drawText("Trainee Training Portfolio", {
    font: italic,
    size: 12,
    color: MUTE,
    gap: 14,
  });
  drawRule();

  // ── Trainee profile ─────────────────────────────────────
  drawSectionHeading("Trainee Profile");
  drawText(data.traineeName, { font: bold, size: 13, gap: 3 });
  drawText(data.traineeEmail, { size: 9.5, color: MUTE, gap: 10 });

  const profileRow = (label: string, value: string) => {
    newPageIfNeeded(14);
    page.drawText(label, { x: MARGIN, y, size: 9.5, font: bold, color: INK });
    page.drawText(value, {
      x: MARGIN + 150,
      y,
      size: 9.5,
      font: regular,
      color: INK,
    });
    y -= 15;
  };

  profileRow("Training Program:", data.programName ?? "Not yet enrolled");
  profileRow("Level:", data.programLevel ?? "—");
  profileRow(
    "Duration:",
    data.trainingDurationWeeks ? `${data.trainingDurationWeeks} weeks` : "—",
  );
  profileRow("Started:", formatDate(data.trainingStartedAt));
  profileRow("Mentor:", data.mentorName ?? "—");
  y -= 8;

  // ── Skills log ───────────────────────────────────────────
  drawSectionHeading(`Skills Log (${data.skillLogs.length} entries)`);
  if (data.skillLogs.length === 0) {
    drawText("No skills logged yet.", { color: MUTE, size: 9.5 });
  } else {
    for (const log of data.skillLogs.slice(0, 40)) {
      newPageIfNeeded(16);
      page.drawText(`${formatDate(log.date)}`, {
        x: MARGIN,
        y,
        size: 9,
        font: regular,
        color: MUTE,
      });
      page.drawText(log.skill, {
        x: MARGIN + 70,
        y,
        size: 9.5,
        font: bold,
        color: INK,
      });
      page.drawText(log.status, {
        x: MARGIN + 260,
        y,
        size: 9,
        font: italic,
        color: MAROON,
      });
      y -= 14;
      if (log.note) {
        drawWrapped(log.note, {
          size: 8.5,
          color: MUTE,
          x: MARGIN + 70,
          maxWidth: CONTENT_W - 70,
          lineGap: 2,
        });
      }
    }
  }
  y -= 6;

  // ── Completed tasks ──────────────────────────────────────
  drawSectionHeading(`Completed Work (${data.completedTasks.length})`);
  if (data.completedTasks.length === 0) {
    drawText("No completed tasks yet.", { color: MUTE, size: 9.5 });
  } else {
    for (const task of data.completedTasks) {
      newPageIfNeeded(28);
      page.drawText(task.title, { x: MARGIN, y, size: 10, font: bold });
      const scoreText =
        task.score != null && task.maxScore
          ? `${task.score}/${task.maxScore}`
          : "—";
      page.drawText(scoreText, {
        x: PAGE_W - MARGIN - 50,
        y,
        size: 10,
        font: bold,
        color: MAROON,
      });
      y -= 13;
      const meta = [
        task.competencyUnitTitle ? `Unit: ${task.competencyUnitTitle}` : null,
        `Completed ${formatDate(task.updatedAt)}`,
      ]
        .filter(Boolean)
        .join("  •  ");
      drawText(meta, { size: 8.5, color: MUTE, gap: 3 });
      if (task.feedback) {
        drawWrapped(`"${task.feedback}"`, {
          size: 8.5,
          font: italic,
          color: MUTE,
          lineGap: 2,
        });
      }
      y -= 6;
    }
  }

  // ── Certificate ───────────────────────────────────────────
  if (data.certificate) {
    y -= 6;
    drawSectionHeading("Certificate");
    const c = data.certificate;
    drawText(c.programName, { font: bold, size: 12, gap: 3 });
    profileRow("Certificate No.:", c.certificateNo);
    profileRow("Duration:", `${c.durationWeeks} weeks`);
    profileRow("Issued:", formatDate(c.issuedAt));
    if (c.issuedByName) profileRow("Issued by:", c.issuedByName);
    if (c.honors) profileRow("Honors:", c.honors);
    y -= 4;
    drawText("Skills Achieved:", { font: bold, size: 9.5, gap: 3 });
    drawWrapped(c.skillsAchieved, { size: 9.5 });
  }

  // ── Footer on every page ─────────────────────────────────
  const pages = pdf.getPages();
  pages.forEach((p: PDFPage, i: number) => {
    p.drawText(
      `Generated ${formatDate(new Date())} — ${data.shopName} — Page ${i + 1} of ${pages.length}`,
      { x: MARGIN, y: 24, size: 7.5, font: regular, color: MUTE },
    );
  });

  return pdf.save();
}
