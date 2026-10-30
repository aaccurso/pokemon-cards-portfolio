import { ImageResponse } from "next/og";
import { binders } from "@/lib/data";
import { SITE_TITLE, ogAlt } from "@/lib/binders";

export const alt = ogAlt(binders);
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  // Pokéball geometry (in px) — explicit numbers because next/og's satori
  // renderer does not support CSS calc().
  const ball = 180;
  const bandH = 24;
  const centerCircle = 64;
  const bandTop = ball / 2 - bandH / 2;
  const centerLeft = ball / 2 - centerCircle / 2;
  const bottomTop = ball / 2 + bandH / 2;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          // Same ground and surface as --bg / --surface in app/globals.css.
          background: "linear-gradient(135deg, #141416 0%, #1d1d21 100%)",
          color: "#f2f2f2",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: ball,
            height: ball,
            borderRadius: "50%",
            border: "8px solid #1a1a1a",
            position: "relative",
            overflow: "hidden",
            marginBottom: 40,
            display: "flex",
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ flex: 1, background: "#e94b3c", display: "flex" }} />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: bandTop,
              height: bandH,
              background: "#1a1a1a",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              top: bottomTop,
              background: "#f5f5f5",
              display: "flex",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: centerLeft,
              top: centerLeft,
              width: centerCircle,
              height: centerCircle,
              borderRadius: "50%",
              background: "#f5f5f5",
              border: "6px solid #1a1a1a",
              display: "flex",
            }}
          />
        </div>

        <div
          style={{
            fontSize: 82,
            fontWeight: 800,
            color: "#f8d030",
            letterSpacing: "-0.02em",
            display: "flex",
          }}
        >
          {SITE_TITLE}
        </div>
        {/* One pill per binder, derived from data/binders.json. Satori needs
            display: flex on every box and no calc(), so sizes are plain px. */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 14,
            marginTop: 28,
            maxWidth: 1100,
          }}
        >
          {binders.map((b) => (
            <div
              key={b.id}
              style={{
                display: "flex",
                fontSize: 25,
                color: "#9a9aa3",
                padding: "8px 20px",
                borderRadius: 999,
                border: "2px solid #2a2a30",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              {b.name}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
