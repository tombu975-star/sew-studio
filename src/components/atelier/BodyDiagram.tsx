"use client";

import { cn } from "@/lib/utils";

/**
 * Line-art body-measurement diagram, drawn in the style of the standard
 * tailoring reference chart: a thin outlined figure with dashed guide lines
 * across shoulder / chest / waist / hip, and end-to-end arrows for body
 * height and inseam. Two variants (female / male) so the diagram matches
 * the garment being measured for, the way a spec sheet would.
 */
export function BodyDiagram({
  variant = "female",
  className,
}: {
  variant?: "female" | "male";
  className?: string;
}) {
  const ink = "#53433E";
  const line = "#94A3B8";
  const arrow = "#64748B";

  return (
    <svg
      viewBox="0 0 220 420"
      role="img"
      aria-label={`${variant === "female" ? "Women's" : "Men's"} body diagram showing where shoulder, chest, waist, hip, body height and inseam are measured`}
      className={cn("w-full h-auto", className)}
    >
      <g fill="none" stroke={ink} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        {variant === "female" ? (
          <>
            {/* head */}
            <circle cx="128" cy="26" r="15" />
            {/* neck */}
            <path d="M122 40 L122 48 M134 40 L134 48" />
            {/* shoulders + arms + torso + legs */}
            <path d="M122 48 C104 50 90 56 86 66 C83 74 88 84 90 92 C93 104 97 118 97 132 C97 150 88 162 87 178 C86 196 92 210 94 230 C96 250 100 280 101 310" />
            <path d="M134 48 C152 50 166 56 170 66 C173 74 168 84 166 92 C163 104 159 118 159 132 C159 150 168 162 169 178 C170 196 164 210 162 230 C160 250 156 280 155 310" />
            {/* arms */}
            <path d="M86 66 C76 78 70 100 68 122 C67 132 73 136 76 128 C80 110 86 92 92 80" />
            <path d="M170 66 C180 78 186 100 188 122 C189 132 183 136 180 128 C176 110 170 92 164 80" />
            {/* waist nip lines (side) */}
            <path d="M92 132 C90 144 89 156 90 168" strokeDasharray="0" />
            <path d="M164 132 C166 144 167 156 166 168" />
            {/* legs to ankle */}
            <path d="M101 310 C99 336 98 360 100 388 M155 310 C157 336 158 360 156 388" />
            {/* feet */}
            <path d="M100 388 L92 396 L108 396 Z M156 388 L148 396 L164 396 Z" />
          </>
        ) : (
          <>
            <circle cx="128" cy="26" r="15" />
            <path d="M122 40 L122 48 M134 40 L134 48" />
            {/* broader shoulders, straighter torso */}
            <path d="M122 48 C98 50 78 56 72 68 C68 78 74 88 77 96 C81 108 85 122 85 136 C85 156 82 170 82 184 C82 204 86 218 88 238 C90 258 96 286 98 312" />
            <path d="M134 48 C158 50 178 56 184 68 C188 78 182 88 179 96 C175 108 171 122 171 136 C171 156 174 170 174 184 C174 204 170 218 168 238 C166 258 160 286 158 312" />
            <path d="M72 68 C58 82 50 106 47 128 C46 138 53 142 56 134 C61 114 68 94 76 82" />
            <path d="M184 68 C198 82 206 106 209 128 C210 138 203 142 200 134 C195 114 188 94 180 82" />
            <path d="M98 312 C96 338 96 362 99 390 M158 312 C160 338 160 362 157 390" />
            <path d="M99 390 L91 398 L109 398 Z M157 390 L149 398 L165 398 Z" />
          </>
        )}
      </g>

      {/* ── guide lines ── */}
      <GuideLine y={70} x1={64} x2={192} label="SHOULDER" line={line} ink={ink} />
      <GuideLine y={104} x1={68} x2={188} label="CHEST" line={line} ink={ink} />
      <GuideLine y={148} x1={70} x2={186} label="WAIST" line={line} ink={ink} />
      <GuideLine y={188} x1={66} x2={190} label="HIP" line={line} ink={ink} />

      {/* body height arrow, far left */}
      <g stroke={arrow} strokeWidth="1.2">
        <line x1="18" y1="12" x2="18" y2="396" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
      </g>
      <text x="10" y="204" fontSize="9" fill={arrow} fontWeight="600" letterSpacing="0.5"
        transform="rotate(-90 10 204)" textAnchor="middle">
        BODY HEIGHT
      </text>

      {/* inseam arrow, centre-bottom */}
      <g stroke={arrow} strokeWidth="1.2">
        <line x1="128" y1="196" x2="128" y2="392" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
      </g>
      <text x="128" y="410" fontSize="9" fill={arrow} fontWeight="600" letterSpacing="0.5" textAnchor="middle">
        INSEAM
      </text>

      <defs>
        <marker id="arrowStart" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M4 0 L7 7 L1 7 Z" fill={arrow} />
        </marker>
        <marker id="arrowEnd" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M4 0 L7 7 L1 7 Z" fill={arrow} />
        </marker>
      </defs>
    </svg>
  );
}

function GuideLine({
  y,
  x1,
  x2,
  label,
  line,
  ink,
}: {
  y: number;
  x1: number;
  x2: number;
  label: string;
  line: string;
  ink: string;
}) {
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={line} strokeWidth="1" strokeDasharray="3 2.5" />
      <text x={(x1 + x2) / 2} y={y - 5} fontSize="9" fontWeight="600" letterSpacing="0.4" fill={ink} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}
