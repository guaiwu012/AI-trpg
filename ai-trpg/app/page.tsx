import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "56px 24px",
        color: "#e6e0d3",
        background:
          "radial-gradient(circle at top, rgba(91,79,61,0.18), transparent 32%), linear-gradient(180deg, #0f0d0c 0%, #171311 45%, #0b0a09 100%)",
      }}
    >
      <section
        style={{
          maxWidth: "980px",
          margin: "0 auto",
          border: "1px solid rgba(182, 154, 110, 0.18)",
          borderRadius: "24px",
          background: "rgba(24, 20, 18, 0.92)",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.45)",
          padding: "32px",
        }}
      >
        <p style={{ letterSpacing: "0.2em", textTransform: "uppercase", color: "#b9a27b" }}>
          AI TRPG 
        </p>
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)", margin: "12px 0 18px" }}>
          St. Alden Residential Academy
        </h1>
        <p style={{ fontSize: "1.05rem", lineHeight: 1.8, color: "#d8cfbf", maxWidth: "760px" }}>
          Years after a fire destroyed this boarding school, an explorer team found a hidden underground
          treatment area and reopened the missing-student case. Enter as a detective, hacker, or priest.
          Follow Lucas and Nina’s traces. Expose Ethan and Helix’s illegal hormone experiment. Then learn
          why the campus feels familiar before you even step inside.
        </p>

        <div
          style={{
            marginTop: "26px",
            padding: "18px",
            borderRadius: "18px",
            border: "1px solid rgba(182, 154, 110, 0.16)",
            background: "rgba(15, 12, 11, 0.78)",
            maxWidth: "820px",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "8px", color: "#f3ecdc" }}>Two run lengths</div>
          <div style={{ lineHeight: 1.8, color: "#d8cfbf" }}>
            Short mode keeps the current faster structure. Long mode adds extra route reconstruction,
            memory-trigger beats, and identity evidence so the story plays closer to a 20–30 minute run.
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "28px" }}>
          <Link
            href="/create"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "13px 20px",
              borderRadius: "999px",
              border: "1px solid rgba(214, 181, 128, 0.35)",
              background: "linear-gradient(180deg, #4a3826 0%, #2d2118 100%)",
              color: "#f5ebd6",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Start New Investigation
          </Link>
        </div>
      </section>
    </main>
  );
}
