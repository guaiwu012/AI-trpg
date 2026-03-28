"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameState } from "@/types/game";

type SceneId = GameState["currentScene"];

const objectiveMap: Record<SceneId, string> = {
  gate: "Find a way into the building before the trail goes cold.",
  hallway: "Search the interior and locate the archive room.",
  archive: "Secure the evidence before the danger spikes.",
  basement: "Decide whether to uncover the truth or escape alive.",
  courtyard: "Cross the courtyard and reach the clinic wing.",
  clinic_hall: "Search the clinic hall and look for signs of the night shift.",
  infirmary: "Search the infirmary and identify what happened during the night shift.",
  quarantine_room: "Enter the final room and decide how far to push the truth.",
};

const sceneLabelMap: Record<SceneId, string> = {
  gate: "Outer Gate",
  hallway: "Dark Hallway",
  archive: "Archive Room",
  basement: "Basement Level",
  courtyard: "Courtyard",
  clinic_hall: "Clinic Hall",
  infirmary: "Infirmary",
  quarantine_room: "Quarantine Room",
};

function formatFlagLabel(flag: string) {
  const labelMap: Record<string, string> = {
    found_gate_clue: "Gate clue found",
    archive_hint: "Archive location confirmed",
    archive_unlocked: "Caretaker hint obtained",
    basement_unlocked: "Basement access unlocked",
    evidence_folder_found: "Evidence folder secured",
    truth_found: "Truth uncovered",
    overwhelmed: "Forced withdrawal",
    extracted_alive: "Escaped with evidence",
    hidden_room_reached: "Hidden room reached",
    infirmary_hint: "Infirmary clue found",
    night_shift_log_found: "Night shift log secured",
  };

  return labelMap[flag] || flag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getObjective(scene: SceneId) {
  return objectiveMap[scene];
}

function getSceneLabel(scene: SceneId) {
  return sceneLabelMap[scene];
}

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

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [state, setState] = useState<GameState | null>(null);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const saved = sessionStorage.getItem(`game:${sessionId}`);
    const savedUi = sessionStorage.getItem(`game-ui:${sessionId}`);

    if (saved) setState(JSON.parse(saved));
    if (savedUi) {
      try {
        const parsed = JSON.parse(savedUi);
        setSuggestions(parsed.suggestions || []);
      } catch {
        setSuggestions([]);
      }
    }

    setHasCheckedStorage(true);
  }, [sessionId]);

  useEffect(() => {
    if (state) {
      sessionStorage.setItem(`game:${state.sessionId}`, JSON.stringify(state));
    }
  }, [state]);

  useEffect(() => {
    sessionStorage.setItem(`game-ui:${sessionId}`, JSON.stringify({ suggestions }));
  }, [sessionId, suggestions]);

  async function sendAction(actionText?: string) {
    if (!state || state.isFinished) return;
    const finalAction = (actionText ?? input).trim();
    if (!finalAction) return;

    try {
      setLoading(true);
      const res = await fetch("/api/game/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, action: finalAction }),
      });

      if (!res.ok) throw new Error("Failed to process action");
      const data = await res.json();
      setState(data.state);
      setSuggestions(data.ui?.suggestedActions || []);
      setInput("");
    } catch (error) {
      console.error(error);
      alert("Failed to process action.");
    } finally {
      setLoading(false);
    }
  }

  const lastRoll = useMemo(() => state?.lastRoll, [state]);
  const unlockedFlags = useMemo(
    () => Object.keys(state?.flags || {}).filter((key) => state?.flags[key]),
    [state]
  );

  const canEndNow = Boolean(
    state &&
      (
        state.flags.evidence_folder_found ||
        state.flags.truth_found ||
        state.flags.night_shift_log_found ||
        state.currentScene === "basement" ||
        state.currentScene === "quarantine_room"
      )
  );

  if (!hasCheckedStorage) {
    return (
      <main style={{ ...shellStyle, padding: "48px 24px" }}>
        <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
          <div style={{ ...panelStyle, padding: "28px" }}>
            <p style={{ margin: 0, color: "#c9bea8" }}>Loading game...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!state) {
    return (
      <main style={{ ...shellStyle, padding: "56px 24px" }}>
        <div style={{ maxWidth: "920px", margin: "0 auto" }}>
          <div style={{ ...panelStyle, padding: "32px" }}>
            <h1 style={{ margin: "0 0 12px", fontSize: "34px", color: "#f3ecdc" }}>
              No saved session found
            </h1>
            <button
              onClick={() => router.push("/create")}
              style={{
                padding: "12px 18px",
                borderRadius: "999px",
                border: "1px solid rgba(182, 154, 110, 0.35)",
                background: "linear-gradient(180deg, #3c3023 0%, #241b15 100%)",
                color: "#f5ebd6",
                cursor: "pointer",
              }}
            >
              Start a new game
            </button>
          </div>
        </div>
      </main>
    );
  }

  const dangerPercent = Math.max(0, Math.min(100, (state.danger / state.maxDanger) * 100));

  return (
    <main style={shellStyle}>
      <div style={{ maxWidth: "1260px", margin: "0 auto", padding: "28px 24px 56px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.8fr) minmax(300px, 0.95fr)",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <section style={{ ...panelStyle, padding: "26px" }}>
            <div
              style={{
                marginBottom: "22px",
                paddingBottom: "18px",
                borderBottom: "1px solid rgba(182, 154, 110, 0.12)",
              }}
            >
              <p
                style={{
                  margin: "0 0 10px",
                  color: "#b69a6e",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  fontSize: "12px",
                }}
              >
                Short Session / Live Investigation
              </p>
              <h1 style={{ margin: "0 0 10px", fontSize: "34px", color: "#f3ecdc" }}>{state.world}</h1>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <span
                  style={{
                    padding: "7px 12px",
                    borderRadius: "999px",
                    border: "1px solid rgba(182, 154, 110, 0.18)",
                    background: "rgba(77, 61, 42, 0.2)",
                    color: "#e7dcc4",
                    fontSize: "13px",
                  }}
                >
                  Scene: {getSceneLabel(state.currentScene)}
                </span>
                <span
                  style={{
                    padding: "7px 12px",
                    borderRadius: "999px",
                    border: "1px solid rgba(159, 74, 74, 0.18)",
                    background: "rgba(95, 30, 30, 0.18)",
                    color: "#e7c9c5",
                    fontSize: "13px",
                  }}
                >
                  {state.isFinished ? "Session Ended" : `Turn ${state.turnCount}`}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
              {state.log.map((msg, index) => {
                const messageStyle: CSSProperties =
                  msg.role === "player"
                    ? {
                        background:
                          "linear-gradient(180deg, rgba(44, 58, 76, 0.85) 0%, rgba(31, 40, 52, 0.9) 100%)",
                        border: "1px solid rgba(96, 134, 178, 0.24)",
                      }
                    : msg.role === "npc"
                    ? {
                        background:
                          "linear-gradient(180deg, rgba(63, 46, 63, 0.86) 0%, rgba(42, 31, 42, 0.9) 100%)",
                        border: "1px solid rgba(163, 122, 174, 0.2)",
                      }
                    : {
                        background:
                          "linear-gradient(180deg, rgba(40, 33, 28, 0.88) 0%, rgba(23, 19, 17, 0.92) 100%)",
                        border: "1px solid rgba(182, 154, 110, 0.14)",
                      };

                return (
                  <div
                    key={index}
                    style={{
                      ...messageStyle,
                      borderRadius: "16px",
                      padding: "16px 18px",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        fontSize: "12px",
                        color:
                          msg.role === "player"
                            ? "#a8c7ec"
                            : msg.role === "npc"
                            ? "#d7b5dc"
                            : "#cfb788",
                      }}
                    >
                      {msg.role}
                    </strong>
                    <span style={{ color: "#ece3d4", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{msg.text}</span>
                  </div>
                );
              })}
            </div>

            {state.isFinished ? (
              <div
                style={{
                  marginBottom: "20px",
                  padding: "18px 18px 20px",
                  borderRadius: "18px",
                  background:
                    "linear-gradient(180deg, rgba(58, 45, 34, 0.94) 0%, rgba(30, 22, 17, 0.96) 100%)",
                  border: "1px solid rgba(182, 154, 110, 0.2)",
                }}
              >
                <strong style={{ color: "#f3ead8" }}>Session summary</strong>
                {state.summary ? (
                  <div style={{ marginTop: "12px", color: "#c9bea8", lineHeight: 1.7 }}>
                    <h3 style={{ margin: "0 0 8px", color: "#f3ecdc" }}>{state.summary.title}</h3>
                    <p style={{ margin: "0 0 10px" }}>{state.summary.storySummary}</p>
                    <ul style={{ margin: 0, paddingLeft: "18px" }}>
                      {state.summary.keyFindings.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p style={{ margin: "10px 0 0", color: "#c9bea8" }}>No summary available.</p>
                )}
                <button
                  onClick={() => router.push("/create")}
                  style={{
                    marginTop: "14px",
                    padding: "11px 16px",
                    borderRadius: "999px",
                    border: "1px solid rgba(182, 154, 110, 0.35)",
                    background: "linear-gradient(180deg, #3c3023 0%, #241b15 100%)",
                    color: "#f5ebd6",
                    cursor: "pointer",
                  }}
                >
                  Start a new game
                </button>
              </div>
            ) : (
              <>
                {canEndNow && (
                  <div
                    style={{
                      marginBottom: "16px",
                      padding: "14px 16px",
                      borderRadius: "16px",
                      background: "rgba(53, 41, 24, 0.65)",
                      border: "1px solid rgba(182, 154, 110, 0.2)",
                    }}
                  >
                    <p style={{ margin: "0 0 10px", color: "#f0e1c2", lineHeight: 1.7 }}>
                      You have enough evidence to stop here. You can keep pushing, or end the session now and receive an AI case summary.
                    </p>
                    <button
                      onClick={() => sendAction("End session and compile report")}
                      disabled={loading}
                      style={{
                        padding: "11px 16px",
                        borderRadius: "999px",
                        border: "1px solid rgba(182, 154, 110, 0.35)",
                        background: "linear-gradient(180deg, #4a3826 0%, #2d2118 100%)",
                        color: "#f5ebd6",
                        cursor: "pointer",
                      }}
                    >
                      End session now
                    </button>
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "12px",
                    marginBottom: suggestions.length > 0 ? "18px" : 0,
                  }}
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Describe your action..."
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "1px solid rgba(182, 154, 110, 0.18)",
                      borderRadius: "14px",
                      background: "rgba(15, 12, 11, 0.95)",
                      color: "#f0e7d7",
                      outline: "none",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !loading) sendAction();
                    }}
                  />
                  <button
                    onClick={() => sendAction()}
                    disabled={loading}
                    style={{
                      padding: "14px 18px",
                      borderRadius: "14px",
                      border: "1px solid rgba(182, 154, 110, 0.28)",
                      background:
                        "linear-gradient(180deg, rgba(72, 57, 40, 1) 0%, rgba(38, 29, 21, 1) 100%)",
                      color: "#f5ebd6",
                      cursor: "pointer",
                      minWidth: "88px",
                    }}
                  >
                    {loading ? "..." : "Send"}
                  </button>
                </div>

                {suggestions.length > 0 && (
                  <div>
                    <p
                      style={{
                        margin: "0 0 10px",
                        color: "#b69a6e",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        fontSize: "12px",
                      }}
                    >
                      AI Suggested Actions
                    </p>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {suggestions.map((item, index) => (
                        <button
                          key={`${item}-${index}`}
                          onClick={() => sendAction(item)}
                          disabled={loading}
                          style={{
                            padding: "10px 14px",
                            borderRadius: "999px",
                            border: "1px solid rgba(182, 154, 110, 0.18)",
                            background:
                              "linear-gradient(180deg, rgba(47, 39, 32, 0.95) 0%, rgba(24, 20, 18, 0.98) 100%)",
                            color: "#eadfc8",
                            cursor: "pointer",
                          }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          <div
            style={{
              position: "sticky",
              top: "24px",
              alignSelf: "start",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <section style={{ ...panelStyle, padding: "18px 20px" }}>
              <p
                style={{
                  margin: "0 0 8px",
                  color: "#b69a6e",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontSize: "12px",
                }}
              >
                Current Objective
              </p>
              <p style={{ margin: 0, color: "#ece3d4", lineHeight: 1.7 }}>{getObjective(state.currentScene)}</p>
            </section>

            <aside style={{ ...panelStyle, padding: "22px" }}>
              <p
                style={{
                  margin: "0 0 10px",
                  color: "#b69a6e",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontSize: "12px",
                }}
              >
                Status Panel
              </p>
              <h2 style={{ margin: "0 0 16px", color: "#f3ecdc" }}>Current State</h2>

              <div
                style={{
                  marginBottom: "16px",
                  padding: "14px 16px",
                  borderRadius: "16px",
                  background: "rgba(18, 14, 12, 0.92)",
                  border: "1px solid rgba(182, 154, 110, 0.12)",
                }}
              >
                <p style={{ margin: "0 0 8px", color: "#ece3d4" }}>
                  <strong style={{ color: "#f1e7d2" }}>Danger:</strong> {state.danger}/{state.maxDanger}
                </p>
                <div
                  style={{
                    height: "10px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.06)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${dangerPercent}%`,
                      height: "100%",
                      background:
                        dangerPercent < 50
                          ? "linear-gradient(90deg, #69573a 0%, #9b7a46 100%)"
                          : "linear-gradient(90deg, #7b3f35 0%, #b64c43 100%)",
                    }}
                  />
                </div>
                <p style={{ margin: "10px 0 0", color: "#c9bea8", lineHeight: 1.6 }}>
                  Failed checks raise danger. At max danger, the run ends immediately.
                </p>
              </div>

              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "16px",
                  background: "rgba(18, 14, 12, 0.92)",
                  border: "1px solid rgba(182, 154, 110, 0.12)",
                }}
              >
                <p style={{ margin: "0 0 8px", color: "#ece3d4" }}>
                  <strong style={{ color: "#f1e7d2" }}>Name:</strong> {state.character.name}
                </p>
                <p style={{ margin: "0 0 8px", color: "#ece3d4" }}>
                  <strong style={{ color: "#f1e7d2" }}>Role:</strong> {state.character.role}
                </p>
                <p style={{ margin: "0 0 8px", color: "#ece3d4" }}>
                  <strong style={{ color: "#f1e7d2" }}>HP:</strong> {state.character.hp}
                </p>
                <p style={{ margin: "0 0 8px", color: "#ece3d4" }}>
                  <strong style={{ color: "#f1e7d2" }}>Observation:</strong> {state.character.observation}
                </p>
                <p style={{ margin: "0 0 8px", color: "#ece3d4" }}>
                  <strong style={{ color: "#f1e7d2" }}>Persuasion:</strong> {state.character.persuasion}
                </p>
                <p style={{ margin: 0, color: "#ece3d4" }}>
                  <strong style={{ color: "#f1e7d2" }}>Willpower:</strong> {state.character.willpower}
                </p>
              </div>

              <div style={{ marginTop: "18px" }}>
                <h3 style={{ margin: "0 0 10px", color: "#eadfc8" }}>Inventory</h3>
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: "16px",
                    background: "rgba(18, 14, 12, 0.92)",
                    border: "1px solid rgba(182, 154, 110, 0.12)",
                  }}
                >
                  <ul style={{ paddingLeft: "18px", margin: 0, color: "#d9ceba", lineHeight: 1.8 }}>
                    {state.character.inventory.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div style={{ marginTop: "18px" }}>
                <h3 style={{ margin: "0 0 10px", color: "#eadfc8" }}>Unlocked Clues</h3>
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: "16px",
                    background: "rgba(18, 14, 12, 0.92)",
                    border: "1px solid rgba(182, 154, 110, 0.12)",
                  }}
                >
                  {unlockedFlags.length > 0 ? (
                    <ul style={{ paddingLeft: "18px", margin: 0, color: "#d9ceba", lineHeight: 1.8 }}>
                      {unlockedFlags.map((key) => (
                        <li key={key}>{formatFlagLabel(key)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ margin: 0, color: "#c0b4a2" }}>No major clues yet.</p>
                  )}
                </div>
              </div>

              <div style={{ marginTop: "18px" }}>
                <h3 style={{ margin: "0 0 10px", color: "#eadfc8" }}>Last Roll</h3>
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: "16px",
                    background: "rgba(18, 14, 12, 0.92)",
                    border: "1px solid rgba(182, 154, 110, 0.12)",
                  }}
                >
                  {lastRoll ? (
                    <div style={{ color: "#d9ceba", lineHeight: 1.8 }}>
                      <p style={{ margin: 0 }}>
                        <strong>Expression:</strong> {lastRoll.expression}
                      </p>
                      <p style={{ margin: 0 }}>
                        <strong>Raw:</strong> {lastRoll.raw}
                      </p>
                      <p style={{ margin: 0 }}>
                        <strong>Total:</strong> {lastRoll.total}
                      </p>
                      <p style={{ margin: 0 }}>
                        <strong>Outcome:</strong> {lastRoll.outcome}
                      </p>
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: "#c0b4a2" }}>No dice roll yet.</p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
