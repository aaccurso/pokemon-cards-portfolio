import { ImageResponse } from "next/og";

export const alt = "Pokédex 151 full-art — Japanese Pokémon TCG wishlist tracker";
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
          background:
            "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #1a3a2e 100%)",
          color: "#e0e0e0",
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
          Pokédex 151 full-art
        </div>
        <div
          style={{
            fontSize: 34,
            color: "#8892a4",
            marginTop: 20,
            display: "flex",
            textAlign: "center",
          }}
        >
          Japanese Pokémon TCG wishlist tracker
        </div>
      </div>
    ),
    { ...size }
  );
}
