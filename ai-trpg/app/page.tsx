import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", padding: "40px", background: "linear-gradient(180deg, #0f0d0c 0%, #171311 45%, #0b0a09 100%)", color: "#f3ecdc" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "36px", marginBottom: "12px" }}>AI TRPG Demo</h1>
        <p style={{ marginBottom: "24px", color: "#c9bea8", lineHeight: 1.7 }}>
          A suspense text RPG with AI narration, risk escalation, early extraction, and an AI-generated session report at the end.
        </p>
        <Link href="/create" style={{ display: "inline-block", padding: "12px 18px", border: "1px solid rgba(182, 154, 110, 0.35)", borderRadius: "999px", textDecoration: "none", color: "#f3ecdc" }}>
          Start New Investigation
        </Link>
      </div>
    </main>
  );
}
