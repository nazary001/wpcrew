import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/config";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
          backgroundColor: "#1a1614",
          color: "#fbf4ea",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: "72px", fontWeight: 700 }}>
          <span>WP&nbsp;</span>
          <span style={{ color: "#ff8a5c" }}>Crew</span>
        </div>
        <div
          style={{
            marginTop: "36px",
            width: "420px",
            height: "10px",
            borderRadius: "0px",
            backgroundColor: "#e8441f",
          }}
        />
        <div
          style={{
            marginTop: "36px",
            fontSize: "34px",
            color: "#d8cbb8",
            maxWidth: "920px",
          }}
        >
          {SITE_TAGLINE}
        </div>
      </div>
    ),
    size,
  );
}
