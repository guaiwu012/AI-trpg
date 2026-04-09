"use client";

import { CSSProperties, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GameMode, Role, ScenarioId } from "@/types/game";

const roles: { value: Role; title: string; description: string }[] = [
  {
    value: "detective",
    title: "Detective",
    description:
      "Highest observation. Better at spotting erased records, explorer traces, and hidden route clues.",
  },
  {
    value: "hacker",
    title: "Hacker",
    description:
      "Balanced investigator. Better at reading terminals, damaged systems, and facility logic under pressure.",
  },
  {
    value: "priest",
    title: "Priest",
    description:
      "Highest willpower. More stable when facing memory shocks, Ethan’s voice, and the deepest treatment zones.",
  },
];

const scenarios: { value: ScenarioId; title: string; description: string }[] = [
  {
    value: "basement_case",
    title: "Main Campus Route",
    description:
      "Enter through the ruined school entrance, follow Lucas’s hidden traces, and descend from the archive into the underground core.",
  },
  {
    value: "infirmary_case",
    title: "Wellness Center Route",
    description:
      "Approach from the outer treatment wing, follow Nina’s marks, and uncover what Student Wellness Center was really built for.",
  },
];

const modeOptions: {
  value: GameMode;
  title: string;
  description: string;
  recommendedDanger: 5 | 10 | 15;
}[] = [
  {
    value: "short",
    title: "Short Mode",
    description:
      "Keeps the current faster structure. Good for a brisk run with fewer mandatory corroboration beats.",
    recommendedDanger: 10,
  },
  {
    value: "long",
    title: "Long Mode",
    description:
      "Adds extra route reconstruction, memory-trigger beats, and identity files so the case plays closer to 20–30 minutes.",
    recommendedDanger: 15,
  },
];

const dangerOptions = [5, 10, 15] as const;

const shellStyle: CSSProperties = {
  minHeight: "100vh",
  padding: "56px 24px",
  color: "#e6e0d3",
  background:
    "radial-gradient(circle at top, rgba(91,79,61,0.18), transparent 32%), linear-gradient(180deg, #0f0d0c 0%, #171311 45%, #0b0a09 100%)",
};

const panelStyle: CSSProperties = {
  maxWidth: "1040px",
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

export default function CreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>("detective");
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId>("basement_case");
  const [selectedMode, setSelectedMode] = useState<GameMode>("short");
  const [selectedDanger, setSelectedDanger] = useState<5 | 10 | 15>(10);
  const [name, setName] = useState("");

  const selectedModeMeta = useMemo(
    () => modeOptions.find((item) => item.value === selectedMode) || modeOptions[0],
    [selectedMode]
  );

  async function startGame() {
    try {
      setLoading(true);
      const res = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRole,
          scenario: selectedScenario,
          gameMode: selectedMode,
          maxDanger: selectedDanger,
          name,
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

  return (
    <main style={shellStyle}>
      <section style={panelStyle}>
        <p style={{ letterSpacing: "0.2em", textTransform: "uppercase", color: "#b9a27b" }}>
          Investigation Setup
        </p>
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", margin: "10px 0 16px" }}>
          Enter St. Alden
        </h1>
        <p style={{ lineHeight: 1.8, color: "#d8cfbf", maxWidth: "820px" }}>
          A ruined boarding school. Missing students. A hidden underground treatment ward. Choose how
          you enter the case, how long the run should be, and how much danger the investigation can absorb
          before it collapses.
        </p>

        <div style={{ marginTop: "28px" }}>
          <label style={{ display: "block", fontWeight: 700, marginBottom: "10px" }}>Name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Leave blank to use your role title"
            style={{
              width: "100%",
              maxWidth: "420px",
              padding: "14px 16px",
              borderRadius: "14px",
              border: "1px solid rgba(182, 154, 110, 0.2)",
              background: "rgba(18, 15, 14, 0.94)",
              color: "#f2eadb",
              outline: "none",
            }}
          />
        </div>

        <div style={{ marginTop: "30px" }}>
          <h2 style={{ marginBottom: "14px" }}>Role</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
            {roles.map((role) => {
              const active = selectedRole === role.value;
              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSelectedRole(role.value)}
                  style={{
                    ...cardStyle,
                    border: active ? "1px solid rgba(214, 181, 128, 0.58)" : cardStyle.border,
                    background: active
                      ? "linear-gradient(180deg, rgba(61, 47, 33, 0.98) 0%, rgba(26, 21, 18, 0.98) 100%)"
                      : cardStyle.background,
                  }}
                >
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>{role.title}</div>
                  <div style={{ lineHeight: 1.7, color: "#d8cfbf" }}>{role.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: "30px" }}>
          <h2 style={{ marginBottom: "14px" }}>Entry Route</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
            {scenarios.map((scenario) => {
              const active = selectedScenario === scenario.value;
              return (
                <button
                  key={scenario.value}
                  type="button"
                  onClick={() => setSelectedScenario(scenario.value)}
                  style={{
                    ...cardStyle,
                    minHeight: "146px",
                    border: active ? "1px solid rgba(214, 181, 128, 0.58)" : cardStyle.border,
                    background: active
                      ? "linear-gradient(180deg, rgba(61, 47, 33, 0.98) 0%, rgba(26, 21, 18, 0.98) 100%)"
                      : cardStyle.background,
                  }}
                >
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>{scenario.title}</div>
                  <div style={{ lineHeight: 1.7, color: "#d8cfbf" }}>{scenario.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: "30px" }}>
          <h2 style={{ marginBottom: "14px" }}>Run Length</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>
            {modeOptions.map((mode) => {
              const active = selectedMode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => {
                    setSelectedMode(mode.value);
                    setSelectedDanger(mode.recommendedDanger);
                  }}
                  style={{
                    ...cardStyle,
                    minHeight: "150px",
                    border: active ? "1px solid rgba(214, 181, 128, 0.58)" : cardStyle.border,
                    background: active
                      ? "linear-gradient(180deg, rgba(61, 47, 33, 0.98) 0%, rgba(26, 21, 18, 0.98) 100%)"
                      : cardStyle.background,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "8px" }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{mode.title}</div>
                    <div style={{ color: "#cdb48a", fontSize: "0.95rem" }}>Danger {mode.recommendedDanger}</div>
                  </div>
                  <div style={{ lineHeight: 1.7, color: "#d8cfbf" }}>{mode.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: "30px" }}>
          <h2 style={{ marginBottom: "14px" }}>Danger Cap</h2>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
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
          <p style={{ marginTop: "12px", color: "#cfc3b0", lineHeight: 1.7 }}>
            Lower danger makes the run harsher and shorter. Higher danger gives you more room before the
            school closes in. {selectedModeMeta.title} currently recommends danger {selectedModeMeta.recommendedDanger}.
          </p>
        </div>

        <div
          style={{
            marginTop: "30px",
            padding: "18px",
            borderRadius: "18px",
            border: "1px solid rgba(182, 154, 110, 0.16)",
            background: "rgba(15, 12, 11, 0.78)",
            lineHeight: 1.8,
            color: "#d8cfbf",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "8px", color: "#f3ecdc" }}>Current setup</div>
          <div>
            {roles.find((item) => item.value === selectedRole)?.title} · {scenarios.find((item) => item.value === selectedScenario)?.title} · {selectedModeMeta.title} · Danger {selectedDanger}
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginTop: "32px" }}>
          <button
            type="button"
            onClick={startGame}
            disabled={loading}
            style={{
              padding: "13px 22px",
              borderRadius: "999px",
              border: "1px solid rgba(214, 181, 128, 0.35)",
              background: "linear-gradient(180deg, #4a3826 0%, #2d2118 100%)",
              color: "#f5ebd6",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {loading ? "Starting..." : "Start game"}
          </button>
        </div>
      </section>
    </main>
  );
}
