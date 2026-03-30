"use client";

import { CSSProperties, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "detective" | "hacker" | "priest";
type ScenarioId = "basement_case" | "infirmary_case";

const shellStyle: CSSProperties = {
  minHeight: "100vh",
  color: "#e6e0d3",
  background:
    "radial-gradient(circle at top, rgba(91,79,61,0.18), transparent 32%), linear-gradient(180deg, #0f0d0c 0%, #171311 45%, #0b0a09 100%)",
};

const panelStyle: CSSProperties = {
  border: "1px solid rgba(182, 154, 110, 0.18)",
  borderRadius: "22px",
  background: "rgba(24, 20, 18, 0.92)",
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.45)",
  backdropFilter: "blur(10px)",
};

const roles: {
  id: Role;
  title: string;
  tagline: string;
  desc: string;
  stats: string;
}[] = [
  {
    id: "detective",
    title: "Detective",
    tagline: "Reads scenes and hidden intent well.",
    desc: "Best for players who want strong observation and steady investigation. A safer choice for uncovering hidden evidence.",
    stats: "High Observation / Balanced Persuasion / Solid Willpower",
  },
  {
    id: "hacker",
    title: "Hacker",
    tagline: "Finds angles fast and improvises under pressure.",
    desc: "Best for players who want a more aggressive style. Good at forcing progress and slipping through weak points in the system.",
    stats: "Balanced Observation / Higher Persuasion / Moderate Willpower",
  },
  {
    id: "priest",
    title: "Priest",
    tagline: "Endures stress and holds onto the truth.",
    desc: "Best for players who expect mental pressure and final-room tension. Stronger when the case becomes psychologically dangerous.",
    stats: "Balanced Observation / Lower Persuasion / High Willpower",
  },
];

const scenarios: {
  id: ScenarioId;
  title: string;
  desc: string;
}[] = [
  {
    id: "basement_case",
    title: "Basement Case File",
    desc: "A disappearance linked to sealed archive records and a basement the school does not want opened.",
  },
  {
    id: "infirmary_case",
    title: "Infirmary Night Shift",
    desc: "A quiet medical wing, missing student files, and a quarantine room that should have stayed locked.",
  },
];

const dangerOptions = [
  {
    value: 5,
    label: "5",
    desc: "Shorter, harsher run. Fewer mistakes allowed.",
  },
  {
    value: 10,
    label: "10",
    desc: "Standard pacing. Best default for a 20-30 minute run.",
  },
  {
    value: 15,
    label: "15",
    desc: "Longer and more forgiving. More room to explore.",
  },
];

export default function CreatePage() {
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<Role>("detective");
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId>("basement_case");
  const [maxDanger, setMaxDanger] = useState(10);
  const [loading, setLoading] = useState(false);

  async function startGame() {
  try {
    sessionStorage.clear()
    setLoading(true);

    const res = await fetch("/api/game/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: selectedRole,
        scenario: selectedScenario,
        maxDanger,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("START_ROUTE_ERROR_PAYLOAD:", data);
      throw new Error(data?.error || "Failed to start game");
    }

    // 兼容不同后端返回格式
    const returnedState =
      data?.state ??
      data?.gameState ??
      (data?.sessionId ? data : null);

    const sessionId =
      returnedState?.sessionId ??
      data?.sessionId;

    if (!returnedState || !sessionId) {
      console.error("Unexpected /api/game/start payload:", data);
      throw new Error("Missing session ID");
    }

    const normalizedState = {
      ...returnedState,
      sessionId,
    };

    sessionStorage.setItem(
      `game:${sessionId}`,
      JSON.stringify(normalizedState)
    );

    sessionStorage.setItem(
      `game-ui:${sessionId}`,
      JSON.stringify({
        suggestions: data?.ui?.suggestedActions || [],
      })
    );

    router.push(`/game/${sessionId}`);
  } catch (error) {
    console.error(error);
    alert("Failed to start game.");
  } finally {
    setLoading(false);
  }
}

  return (
    <main style={shellStyle}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "34px 24px 56px" }}>
        <div style={{ display: "grid", gap: "22px" }}>
          <section style={{ ...panelStyle, padding: "28px" }}>
            <p
              style={{
                margin: "0 0 10px",
                color: "#b69a6e",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontSize: "12px",
              }}
            >
              Interactive Suspense TRPG
            </p>
            <h1 style={{ margin: "0 0 12px", fontSize: "36px", color: "#f3ecdc" }}>
              Start a New Case
            </h1>
            <p style={{ margin: 0, color: "#d8cfbf", lineHeight: 1.8, maxWidth: "920px" }}>
              This is a short text-based TRPG. You describe what your character does, the system
              decides whether the action needs a check, and the story advances based on your choices,
              your dice result, and the pressure building around you.
            </p>
          </section>

          <section style={{ ...panelStyle, padding: "24px 28px" }}>
            <h2 style={{ margin: "0 0 14px", color: "#f3ecdc" }}>How the game works</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
              }}
            >
              <div
                style={{
                  borderRadius: "18px",
                  border: "1px solid rgba(182, 154, 110, 0.12)",
                  background: "rgba(18, 14, 12, 0.92)",
                  padding: "16px",
                }}
              >
                <strong style={{ color: "#f1e7d2" }}>What is this?</strong>
                <p style={{ margin: "10px 0 0", color: "#d8cfbf", lineHeight: 1.7 }}>
                  A TRPG is a role-playing game driven by your decisions. You are not choosing from a
                  fixed script. You type actions, test ideas, and push the case forward your own way.
                </p>
              </div>

              <div
                style={{
                  borderRadius: "18px",
                  border: "1px solid rgba(182, 154, 110, 0.12)",
                  background: "rgba(18, 14, 12, 0.92)",
                  padding: "16px",
                }}
              >
                <strong style={{ color: "#f1e7d2" }}>Why roll dice?</strong>
                <p style={{ margin: "10px 0 0", color: "#d8cfbf", lineHeight: 1.7 }}>
                  Dice are used when the outcome is uncertain. Risky searches, persuasion, and mental
                  resistance become checks. A good roll pushes the story your way. A bad roll raises
                  danger or forces a rougher path.
                </p>
              </div>

              <div
                style={{
                  borderRadius: "18px",
                  border: "1px solid rgba(182, 154, 110, 0.12)",
                  background: "rgba(18, 14, 12, 0.92)",
                  padding: "16px",
                }}
              >
                <strong style={{ color: "#f1e7d2" }}>Why choose a role?</strong>
                <p style={{ margin: "10px 0 0", color: "#d8cfbf", lineHeight: 1.7 }}>
                  Your role changes your skill modifiers. Different roles are better at noticing clues,
                  persuading others, or staying calm under pressure, so they change how safe and how
                  direct your path through the case feels.
                </p>
              </div>

              <div
                style={{
                  borderRadius: "18px",
                  border: "1px solid rgba(182, 154, 110, 0.12)",
                  background: "rgba(18, 14, 12, 0.92)",
                  padding: "16px",
                }}
              >
                <strong style={{ color: "#f1e7d2" }}>How do runs end?</strong>
                <p style={{ margin: "10px 0 0", color: "#d8cfbf", lineHeight: 1.7 }}>
                  You can uncover the full truth, escape with partial evidence, or get forced out by
                  danger or injury. A normal run should take about 20 to 30 minutes.
                </p>
              </div>
            </div>
          </section>

          <section style={{ ...panelStyle, padding: "24px 28px" }}>
            <h2 style={{ margin: "0 0 16px", color: "#f3ecdc" }}>Choose your role</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "14px",
              }}
            >
              {roles.map((role) => {
                const active = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    style={{
                      textAlign: "left",
                      padding: "18px",
                      borderRadius: "18px",
                      border: active
                        ? "1px solid rgba(214, 188, 144, 0.5)"
                        : "1px solid rgba(182, 154, 110, 0.14)",
                      background: active
                        ? "linear-gradient(180deg, rgba(68, 54, 38, 0.98) 0%, rgba(31, 24, 19, 0.98) 100%)"
                        : "rgba(18, 14, 12, 0.92)",
                      color: "#f3ecdc",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                      <strong>{role.title}</strong>
                      {active && <span style={{ color: "#d6bc90" }}>Selected</span>}
                    </div>
                    <p style={{ margin: "10px 0 8px", color: "#e3d6c0" }}>{role.tagline}</p>
                    <p style={{ margin: "0 0 10px", color: "#d0c4b1", lineHeight: 1.7 }}>
                      {role.desc}
                    </p>
                    <p style={{ margin: 0, color: "#b69a6e", fontSize: "13px" }}>{role.stats}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section style={{ ...panelStyle, padding: "24px 28px" }}>
            <h2 style={{ margin: "0 0 16px", color: "#f3ecdc" }}>Choose a case</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "14px",
              }}
            >
              {scenarios.map((scenario) => {
                const active = selectedScenario === scenario.id;
                return (
                  <button
                    key={scenario.id}
                    onClick={() => setSelectedScenario(scenario.id)}
                    style={{
                      textAlign: "left",
                      padding: "18px",
                      borderRadius: "18px",
                      border: active
                        ? "1px solid rgba(214, 188, 144, 0.5)"
                        : "1px solid rgba(182, 154, 110, 0.14)",
                      background: active
                        ? "linear-gradient(180deg, rgba(68, 54, 38, 0.98) 0%, rgba(31, 24, 19, 0.98) 100%)"
                        : "rgba(18, 14, 12, 0.92)",
                      color: "#f3ecdc",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                      <strong>{scenario.title}</strong>
                      {active && <span style={{ color: "#d6bc90" }}>Selected</span>}
                    </div>
                    <p style={{ margin: "10px 0 0", color: "#d0c4b1", lineHeight: 1.7 }}>
                      {scenario.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section style={{ ...panelStyle, padding: "24px 28px" }}>
            <h2 style={{ margin: "0 0 16px", color: "#f3ecdc" }}>Choose danger level</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
              }}
            >
              {dangerOptions.map((option) => {
                const active = maxDanger === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setMaxDanger(option.value)}
                    style={{
                      textAlign: "left",
                      padding: "18px",
                      borderRadius: "18px",
                      border: active
                        ? "1px solid rgba(214, 188, 144, 0.5)"
                        : "1px solid rgba(182, 154, 110, 0.14)",
                      background: active
                        ? "linear-gradient(180deg, rgba(68, 54, 38, 0.98) 0%, rgba(31, 24, 19, 0.98) 100%)"
                        : "rgba(18, 14, 12, 0.92)",
                      color: "#f3ecdc",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                      <strong>Danger {option.label}</strong>
                      {active && <span style={{ color: "#d6bc90" }}>Selected</span>}
                    </div>
                    <p style={{ margin: "10px 0 0", color: "#d0c4b1", lineHeight: 1.7 }}>
                      {option.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section
            style={{
              ...panelStyle,
              padding: "24px 28px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ margin: "0 0 8px", color: "#f3ecdc" }}>Ready to begin</h2>
              <p style={{ margin: 0, color: "#d0c4b1", lineHeight: 1.7 }}>
                Selected: <strong>{roles.find((r) => r.id === selectedRole)?.title}</strong> /{" "}
                <strong>{scenarios.find((s) => s.id === selectedScenario)?.title}</strong> / Danger{" "}
                <strong>{maxDanger}</strong>
              </p>
            </div>

            <button
              onClick={startGame}
              disabled={loading}
              style={{
                padding: "14px 22px",
                borderRadius: "999px",
                border: "1px solid rgba(182, 154, 110, 0.35)",
                background: "linear-gradient(180deg, #4a3826 0%, #2d2118 100%)",
                color: "#f5ebd6",
                cursor: loading ? "default" : "pointer",
                minWidth: "180px",
                fontSize: "15px",
              }}
            >
              {loading ? "Preparing case..." : "Start Investigation"}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
