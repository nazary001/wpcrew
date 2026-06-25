import { ImageResponse } from "next/og";

export const dynamic = "force-static";

/** Square 512×512 brand mark used by the web manifest and Organization JSON-LD. */
export async function GET() {
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
          backgroundColor: "#1a1614",
          borderRadius: "0px",
        }}
      >
        <div
          style={{
            fontSize: "200px",
            fontWeight: 700,
            color: "#fbf4ea",
            fontFamily: "Arial, sans-serif",
          }}
        >
          WP
        </div>
        <div
          style={{
            marginTop: "24px",
            width: "280px",
            height: "36px",
            borderRadius: "0px",
            backgroundColor: "#e8441f",
          }}
        />
      </div>
    ),
    { width: 512, height: 512 },
  );
}
