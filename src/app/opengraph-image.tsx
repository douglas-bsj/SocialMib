import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Mib Social — Gerencie todas as suas redes sociais";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #09090b 0%, #1e0a3c 50%, #09090b 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(124,58,237,0.35) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              background: "#7c3aed",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 40px rgba(124,58,237,0.6)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span style={{ fontSize: 38, fontWeight: 800, color: "white", letterSpacing: "-1px" }}>
            Mib Social
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            textAlign: "center",
            lineHeight: 1.1,
            letterSpacing: "-2px",
            maxWidth: 900,
            color: "white",
          }}
        >
          Todas as suas redes em{" "}
          <span style={{ color: "#a78bfa" }}>um só lugar</span>
        </div>

        {/* Sub */}
        <div
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.5)",
            marginTop: 20,
            textAlign: "center",
            maxWidth: 700,
          }}
        >
          Agende, analise e responda para 10+ plataformas
        </div>

        {/* Platform icons */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 44,
          }}
        >
          {["𝕏", "📸", "f", "in", "♪", "▶", "🦋", "@"].map((icon, i) => (
            <div
              key={i}
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                color: "white",
              }}
            >
              {icon}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
