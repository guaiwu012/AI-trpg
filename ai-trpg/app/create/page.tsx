"use client";

import { CSSProperties, useState } from "react";
import { useRouter } from "next/navigation";
import { Role, ScenarioId } from "@/types/game";

const roles: {
  value: Role;
  title: string;
  description: string;
}[] = [
  {
    value: "detective",
    title: "Detective",
    description: "High observation. Best at finding the fastest path to evidence.",
  },
  {
    value: "hacker",
    title: "Hacker",
    description: "Balanced investigation with better control under pressure.",
  },
  {
    value: "priest",
    title: "Priest",
    description: "Highest willpower. More stable in the deepest danger zones.",
  },
];

const scenarios: {
  value: ScenarioId;
  title: string;
  description: string;
}[] = [
  {
    value: "basement_case",
    title: "Basement Case File",
    description:
      "The classic route. Break into the school, search the archive, and decide whether to descend.",
  },
  {
    value: "infirmary_case",
    title: "Infirmary Night Shift",
    description:
      "A second route. Enter the abandoned infirmary and trace a hidden medical cover-up.",
  },
];

const dangerOptions = [5, 10, 15] as const;

export default function CreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>("detective");
  const [selectedScenario, setSelectedScenario] =
    useState<ScenarioId>("basement_case");
  const [selectedDanger, setSelectedDanger] = useState<5 | 10 | 15>(10);

  async function startGame() {
    try {
      setLoading(true);

      const res = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRole,
          scenario: selectedScenario,
          maxDanger: selectedDanger,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to start game");
      }

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

  const shellStyle: CSSProperties = {
    minHeight: "100vh",
    padding: "56px 24px",
    color: "#e6e0d3",
    background:
      "radial-gradient(circle at top, rgba(91,79,61,0.18), transparent 32%), linear-gradient(180deg, #0f0d0c 0%, #171311 45%, #0b0a09 100%)",
  };

  const panelStyle: CSSProperties = {
    maxWidth: "980px",
    margin: "0 auto",
    border: "1px solid rgba(182, 154, 110, 0.18)",
    borderRadius: "24px",
    background: "rgba(24, 20, 18, 0.92)",
    boxShadow: "0 24px 60px rgba(0, 0, 0, 0.45)",
    padding: "28px",
  };

  const cardStyle: CSSProperties = {
    padding: "18px",
    textAlign: "left",
    border: "1px solid rgba(182, 154, 110, 0.18)",
    borderRadius: "16px",
    background: "rgba(18, 15, 14, 0.94)",
    cursor: "pointer",
    color: "#f2eadb",
  };

  return (
    <main style={shellStyle}>
      <div style={panelStyle}>
        <p
          style={{
            margin: 0,
            fontSize: "12px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#bda583",
          }}
        >
          Short Session Setup
        </p>
        <h1 style={{ marginTop: "10px", marginBottom: "12px", fontSize: "34px" }}>
          Create a Short Investigation
        </h1>
        <p style={{ marginTop: 0, color: "#cfc4b1", lineHeight: 1.7 }}>
          Choose a role, choose a scenario, then set the danger cap to 5, 10, or
          15 before entering the run.
        </p>

        <section style={{ marginTop: "28px" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "14px" }}>Role</h2>
          <div
            style={{
              display: "grid",
              gap: "14px",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {roles.map((role) => {
              const active = selectedRole === role.value;
              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSelectedRole(role.value)}
                  style={{
                    ...cardStyle,
                    border: active
                      ? "1px solid rgba(214, 181, 128, 0.58)"
                      : cardStyle.border,
                    background: active
                      ? "linear-gradient(180deg, rgba(61, 47, 33, 0.98) 0%, rgba(26, 21, 18, 0.98) 100%)"
                      : cardStyle.background,
                  }}
                >
                  <div style={{ fontSize: "18px", fontWeight: 700 }}>{role.title}</div>
                  <p style={{ marginBottom: 0, color: "#d3c6b0", lineHeight: 1.6 }}>
                    {role.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section style={{ marginTop: "28px" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "14px" }}>Scenario</h2>
          <div
            style={{
              display: "grid",
              gap: "14px",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            {scenarios.map((scenario) => {
              const active = selectedScenario === scenario.value;
              return (
                <button
                  key={scenario.value}
                  type="button"
                  onClick={() => setSelectedScenario(scenario.value)}
                  style={{
                    ...cardStyle,
                    border: active
                      ? "1px solid rgba(214, 181, 128, 0.58)"
                      : cardStyle.border,
                    background: active
                      ? "linear-gradient(180deg, rgba(61, 47, 33, 0.98) 0%, rgba(26, 21, 18, 0.98) 100%)"
                      : cardStyle.background,
                  }}
                >
                  <div style={{ fontSize: "18px", fontWeight: 700 }}>
                    {scenario.title}
                  </div>
                  <p style={{ marginBottom: 0, color: "#d3c6b0", lineHeight: 1.6 }}>
                    {scenario.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section style={{ marginTop: "28px" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "14px" }}>Danger Cap</h2>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {dangerOptions.map((value) => {
              const active = selectedDanger === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedDanger(value)}
                  style={{
                    padding: "12px 18px",
                    borderRadius: "999px",
                    border: active
                      ? "1px solid rgba(214, 181, 128, 0.58)"
                      : "1px solid rgba(182, 154, 110, 0.22)",
                    background: active
                      ? "linear-gradient(180deg, rgba(74, 56, 38, 1) 0%, rgba(45, 33, 24, 1) 100%)"
                      : "rgba(18, 15, 14, 0.94)",
                    color: "#f4ebd9",
                    cursor: "pointer",
                    minWidth: "76px",
                  }}
                >
                  {value}
                </button>
              );
            })}
          </div>
          <p style={{ marginTop: "12px", color: "#bfae95", lineHeight: 1.6 }}>
            Lower danger means shorter tolerance for mistakes. Higher danger gives
            the player more room before the run collapses.
          </p>
        </section>

        <div
          style={{
            marginTop: "34px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={startGame}
            disabled={loading}
            style={{
              padding: "14px 22px",
              borderRadius: "999px",
              border: "1px solid rgba(182, 154, 110, 0.35)",
              background:
                "linear-gradient(180deg, rgba(74, 56, 38, 1) 0%, rgba(45, 33, 24, 1) 100%)",
              color: "#f5ebd6",
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.72 : 1,
            }}
          >
            {loading ? "Starting..." : "Start game"}
          </button>

          <span style={{ color: "#baa88b" }}>
            {selectedScenario === "basement_case"
              ? "Selected: Basement route"
              : "Selected: Infirmary route"}
            {` · Danger ${selectedDanger}`}
          </span>
        </div>
      </div>
    </main>
  );
}
