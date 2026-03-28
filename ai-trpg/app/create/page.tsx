"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Role } from "@/types/game";

export default function CreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function startGame(role: Role) {
    try {
      setLoading(true);
      const res = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to start game");
      const state = await res.json();
      sessionStorage.setItem(`game:${state.sessionId}`, JSON.stringify(state));
      router.push(`/game/${state.sessionId}`);
    } catch (error) {
      console.error(error);
      alert("Failed to start game.");
    } finally {
      setLoading(false);
    }
  }

  const buttonStyle: React.CSSProperties = {
    padding: "20px",
    textAlign: "left",
    border: "1px solid rgba(182, 154, 110, 0.18)",
    borderRadius: "16px",
    background: "rgba(24, 20, 18, 0.92)",
    cursor: "pointer",
    color: "#f2eadb",
  };

  return (
    <main style={{ minHeight: "100vh", padding: "40px", background: "linear-gradient(180deg, #0f0d0c 0%, #171311 45%, #0b0a09 100%)", color: "#f3ecdc" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "32px", marginBottom: "12px" }}>Create a Short Investigation</h1>
        <p style={{ marginBottom: "24px", color: "#c9bea8", lineHeight: 1.7 }}>
          This version is designed to end faster. Failed checks raise danger, and once you secure key evidence, you can extract early and receive an AI case summary.
        </p>

        <div style={{ display: "grid", gap: "16px" }}>
          <button onClick={() => startGame("detective")} disabled={loading} style={buttonStyle}>
            <strong>Detective</strong>
            <div>High observation. Best at finding the shortest route to evidence.</div>
          </button>
          <button onClick={() => startGame("hacker")} disabled={loading} style={buttonStyle}>
            <strong>Hacker</strong>
            <div>Balanced investigation with stronger mental resilience.</div>
          </button>
          <button onClick={() => startGame("priest")} disabled={loading} style={buttonStyle}>
            <strong>Priest</strong>
            <div>Highest willpower. Better odds when the basement turns hostile.</div>
          </button>
        </div>

        {loading && <p style={{ marginTop: "20px", color: "#c9bea8" }}>Starting game...</p>}
      </div>
    </main>
  );
}
