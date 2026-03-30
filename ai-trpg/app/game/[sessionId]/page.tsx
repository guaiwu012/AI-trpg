"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DiceResult, GameState } from "@/types/game";

type SceneId = GameState["currentScene"];

type ProgressInfo = {
  percent: number;
  label: string;
  detail: string;
  eta: string;
};

type PendingCheck = {
  action: string;
  skill: "observation" | "persuasion" | "willpower";
  reason: string;
  modifier: number;
  expression: string;
  rollResult: DiceResult;
};

const objectiveMap: Record<SceneId, string> = {
  gate: "Find the first trace of how students were taken off the visible route.",
  hallway: "Locate the archive corridor and learn who controlled records at night.",
  archive: "Secure the first hard evidence, then reconstruct how the transfer route worked.",
  basement: "Collect corroborating proof of the basement program before forcing the final reveal.",
  courtyard: "Find the hidden way into the infirmary wing and why it was used after hours.",
  clinic_hall: "Identify the infirmary route and how night-shift handling differed from day records.",
  infirmary: "Secure the ledger, then work out how the ward prepared students for transfer.",
  quarantine_room: "Collect corroborating proof of the night-shift program before exposing the full system.",
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeGameState(raw: GameState | null | undefined): GameState | null {
  if (!raw) return null;

  const safeMaxDanger =
    Number.isFinite(Number(raw.maxDanger)) && Number(raw.maxDanger) > 0
      ? Number(raw.maxDanger)
      : 10;

  const safeDanger = clamp(Number(raw.danger) || 0, 0, safeMaxDanger);
  const safeHp = Math.max(0, Number(raw.character?.hp) || 0);

  const inventory = Array.isArray(raw.character?.inventory)
    ? [...raw.character.inventory]
    : [];

  const reconcile: Record<string, string> = {
    quarantine_unlocked: "Quarantine Keycard",
    basement_unlocked: "Basement Passcard",
    evidence_folder_found: "Evidence Folder",
    night_shift_log_found: "Medical Ledger",
    transfer_manifest_found: "Transfer Manifest",
    restraint_protocol_found: "Restraint Protocol",
    partner_contract_found: "Partner Contract",
    parent_letter_found: "Parent Letter",
    ethics_memo_found: "Ethics Memo",
    night_transfer_schedule_found: "Night Transfer Schedule",
    sedation_protocol_found: "Sedation Protocol",
    training_manual_found: "Training Manual",
    dosage_variance_found: "Dosage Variance Sheet",
    incident_photo_found: "Incident Photo",
  };

  for (const [flag, item] of Object.entries(reconcile)) {
    if (raw.flags?.[flag] && !inventory.includes(item)) {
      inventory.push(item);
    }
  }

  return {
    ...raw,
    danger: safeDanger,
    maxDanger: safeMaxDanger,
    flags: raw.flags || {},
    log: Array.isArray(raw.log) ? raw.log : [],
    character: {
      ...raw.character,
      hp: safeHp,
      inventory,
    },
  };
}

function formatFlagLabel(flag: string) {
  const labelMap: Record<string, string> = {
    found_gate_clue: "Gate clue found",
    found_courtyard_clue: "Courtyard clue found",
    archive_hint: "Archive location confirmed",
    archive_unlocked: "Archive lead obtained",
    basement_unlocked: "Basement access unlocked",
    evidence_found: "Evidence secured",
    evidence_folder_found: "Evidence folder secured",
    truth_found: "Truth uncovered",
    overwhelmed: "Forced withdrawal",
    extracted_alive: "Escaped alive",
    escaped_with_evidence: "Escaped with evidence",
    infirmary_hint: "Infirmary clue found",
    infirmary_unlocked: "Infirmary desk lead found",
    quarantine_unlocked: "Quarantine access unlocked",
    night_shift_log_found: "Night shift log secured",
    hp_depleted: "Collapsed from injury",
    basement_transfer_route_found: "Archive transfer route reconstructed",
    basement_experiment_found: "Basement program identified",
    infirmary_transfer_route_found: "Ward transfer route reconstructed",
    infirmary_experiment_found: "Ward program identified",
    systemic_pressure_found: "Institutional motive identified",
    transfer_manifest_found: "Transfer manifest recovered",
    restraint_protocol_found: "Restraint protocol recovered",
    partner_contract_found: "Partner contract recovered",
    parent_letter_found: "Parent complaint letter recovered",
    ethics_memo_found: "Ethics and reputation memo recovered",
    night_transfer_schedule_found: "Night transfer schedule recovered",
    sedation_protocol_found: "Sedation protocol recovered",
    training_manual_found: "Training manual recovered",
    dosage_variance_found: "Dosage variance sheet recovered",
    incident_photo_found: "Incident photo recovered",
  };

  return labelMap[flag] || flag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getObjective(scene: SceneId) {
  return objectiveMap[scene];
}

function getSceneLabel(scene: SceneId) {
  return sceneLabelMap[scene];
}

function canEndRun(state: GameState) {
  return Boolean(
    state.flags.evidence_found ||
      state.flags.evidence_folder_found ||
      state.flags.night_shift_log_found ||
      state.flags.truth_found ||
      state.flags.escaped_with_evidence ||
      state.currentScene === "basement" ||
      state.currentScene === "quarantine_room"
  );
}

function getProgressInfo(state: GameState): ProgressInfo {
  let progress = 0;

  if (state.scenario === "basement_case") {
    const corroborationCount = [
      "transfer_manifest_found",
      "restraint_protocol_found",
      "partner_contract_found",
      "parent_letter_found",
      "ethics_memo_found",
    ].filter((flag) => state.flags[flag]).length;

    if (state.flags.found_gate_clue) progress = Math.max(progress, 10);
    if (state.flags.archive_hint || state.flags.archive_unlocked) progress = Math.max(progress, 20);
    if (state.flags.evidence_folder_found) progress = Math.max(progress, 35);
    if (state.flags.basement_transfer_route_found) progress = Math.max(progress, 50);

    if (corroborationCount >= 1) progress = Math.max(progress, 60);
    if (corroborationCount >= 2) progress = Math.max(progress, 70);
    if (corroborationCount >= 3) progress = Math.max(progress, 80);
    if (corroborationCount >= 4) progress = Math.max(progress, 88);
    if (corroborationCount >= 5) progress = Math.max(progress, 92);

    if (state.flags.basement_experiment_found) progress = Math.max(progress, 95);
  } else {
    const corroborationCount = [
      "night_transfer_schedule_found",
      "sedation_protocol_found",
      "training_manual_found",
      "dosage_variance_found",
      "incident_photo_found",
    ].filter((flag) => state.flags[flag]).length;

    if (state.flags.found_courtyard_clue) progress = Math.max(progress, 10);
    if (state.flags.infirmary_hint || state.flags.infirmary_unlocked) progress = Math.max(progress, 20);
    if (state.flags.night_shift_log_found) progress = Math.max(progress, 35);
    if (state.flags.infirmary_transfer_route_found) progress = Math.max(progress, 50);

    if (corroborationCount >= 1) progress = Math.max(progress, 60);
    if (corroborationCount >= 2) progress = Math.max(progress, 70);
    if (corroborationCount >= 3) progress = Math.max(progress, 80);
    if (corroborationCount >= 4) progress = Math.max(progress, 88);
    if (corroborationCount >= 5) progress = Math.max(progress, 92);

    if (state.flags.infirmary_experiment_found) progress = Math.max(progress, 95);
  }

  if (
    state.flags.truth_found ||
    state.flags.escaped_with_evidence ||
    state.flags.extracted_alive ||
    state.flags.overwhelmed ||
    state.flags.hp_depleted ||
    state.isFinished
  ) {
    progress = 100;
  }

  const label =
    progress >= 100
      ? "Case closed"
      : progress >= 95
      ? "Full chain reconstructed"
      : progress >= 80
      ? "Corroborating the truth"
      : progress >= 50
      ? "Transfer route established"
      : progress >= 35
      ? "Core evidence found"
      : progress >= 20
      ? "Following the route"
      : progress >= 10
      ? "Opening investigation"
      : "Just started";

  const detail =
    progress >= 100
      ? "This run has reached an ending."
      : progress >= 80
      ? "You already know the case structure. Keep digging for corroborating proof before forcing the final reveal."
      : progress >= 50
      ? "You now understand the transfer chain. Further exploration should reveal motive, method, and institutional pressure."
      : progress >= 35
      ? "You have the first hard evidence, but not yet the full route or system behind it."
      : progress >= 20
      ? "You have found where the case opens up, but not yet how the hidden route really works."
      : progress >= 10
      ? "You have found the first sign that something hidden is operating here."
      : "You are still at the beginning of the investigation.";

  const eta =
    progress >= 100
      ? "Finished"
      : progress >= 95
      ? "About 1-2 more actions"
      : progress >= 80
      ? "About 3-5 more actions"
      : progress >= 50
      ? "About 5-8 more actions"
      : progress >= 35
      ? "About 7-10 more actions"
      : progress >= 20
      ? "About 9-12 more actions"
      : "About 12-16 more actions";

  return { percent: progress, label, detail, eta };
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
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [pendingPlayerAction, setPendingPlayerAction] = useState("");
  const [pendingCheck, setPendingCheck] = useState<PendingCheck | null>(null);
  const [rolling, setRolling] = useState(false);
  const [displayRollValue, setDisplayRollValue] = useState<number | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(`game:${sessionId}`);
    const savedUi = sessionStorage.getItem(`game-ui:${sessionId}`);

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as GameState;
        const normalized = normalizeGameState(parsed);
        setState(normalized);
        if (normalized) {
          sessionStorage.setItem(`game:${sessionId}`, JSON.stringify(normalized));
        }
      } catch {
        setState(null);
      }
    }

    if (savedUi) {
      try {
        const parsed = JSON.parse(savedUi);
        setSuggestions(Array.isArray(parsed.suggestions) ? parsed.suggestions : []);
      } catch {
        setSuggestions([]);
      }
    }

    setHasCheckedStorage(true);
  }, [sessionId]);

  useEffect(() => {
    if (state) {
      const normalized = normalizeGameState(state);
      if (normalized) {
        sessionStorage.setItem(`game:${normalized.sessionId}`, JSON.stringify(normalized));
      }
    }
  }, [state]);

  useEffect(() => {
    sessionStorage.setItem(`game-ui:${sessionId}`, JSON.stringify({ suggestions }));
  }, [sessionId, suggestions]);

  async function finalizeAction(actionText: string, rollResult?: DiceResult) {
    if (!state || state.isFinished) return;

    try {
      setSending(true);
      setPendingPlayerAction(actionText);

      const res = await fetch("/api/game/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          action: actionText,
          phase: "resolve",
          rollResult: rollResult ?? null,
        }),
      });

      if (!res.ok) throw new Error("Failed to process action");
      const data = await res.json();

      const normalizedState = normalizeGameState(data.state);
      setState(normalizedState);
      setSuggestions(Array.isArray(data.ui?.suggestedActions) ? data.ui.suggestedActions : []);
      setInput("");
    } catch (error) {
      console.error(error);
      alert("Failed to process action.");
    } finally {
      setPendingPlayerAction("");
      setSending(false);
      setPendingCheck(null);
      setRolling(false);
      setDisplayRollValue(null);
    }
  }

  async function requestAction(actionText?: string) {
    if (!state || state.isFinished || sending || rolling || pendingCheck) return;
    const finalAction = (actionText ?? input).trim();
    if (!finalAction) return;

    try {
      const res = await fetch("/api/game/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          action: finalAction,
          phase: "preview",
        }),
      });

      if (!res.ok) throw new Error("Failed to preview action");
      const data = await res.json();

      if (!data?.requiresRoll) {
        await finalizeAction(finalAction);
        return;
      }

      setPendingCheck({
        action: finalAction,
        skill: data.check.skill,
        reason: data.check.reason,
        modifier: data.check.modifier,
        expression: data.check.expression,
        rollResult: data.rollResult,
      });
      setDisplayRollValue(null);
    } catch (error) {
      console.error(error);
      alert("Failed to process action.");
    }
  }

  async function rollPendingCheck() {
    if (!pendingCheck || rolling || sending) return;

    setRolling(true);
    let ticks = 0;

    const interval = window.setInterval(() => {
      setDisplayRollValue(Math.floor(Math.random() * 20) + 1);
      ticks += 1;

      if (ticks >= 14) {
        window.clearInterval(interval);
        setDisplayRollValue(pendingCheck.rollResult.raw);
        window.setTimeout(() => {
          finalizeAction(pendingCheck.action, pendingCheck.rollResult);
        }, 450);
      }
    }, 85);
  }

  const lastRoll = useMemo(() => state?.lastRoll, [state]);
  const unlockedFlags = useMemo(
    () => Object.keys(state?.flags || {}).filter((key) => state?.flags[key]),
    [state]
  );

  const canEndNow = Boolean(state && canEndRun(state));
  const progressInfo = useMemo(() => (state ? getProgressInfo(state) : null), [state]);

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

  const safeMaxDanger = Math.max(1, Number(state.maxDanger) || 10);
  const safeDanger = clamp(Number(state.danger) || 0, 0, safeMaxDanger);
  const dangerPercent = Math.round((safeDanger / safeMaxDanger) * 100);

  return (
    <main style={shellStyle}>
      <style jsx>{`
        @keyframes thinkingPulse {
          0% { opacity: 0.28; transform: translateY(0); }
          25% { opacity: 1; transform: translateY(-2px); }
          50% { opacity: 0.5; transform: translateY(0); }
          100% { opacity: 0.28; transform: translateY(0); }
        }
        @keyframes diceShake {
          0% { transform: rotate(0deg) scale(1); }
          20% { transform: rotate(-12deg) scale(1.04); }
          40% { transform: rotate(10deg) scale(0.98); }
          60% { transform: rotate(-8deg) scale(1.03); }
          80% { transform: rotate(6deg) scale(0.99); }
          100% { transform: rotate(0deg) scale(1); }
        }
        @keyframes messageFade {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .thinking-dots {
          display: inline-flex;
          gap: 6px;
          align-items: center;
        }
        .thinking-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #d6bc90;
          animation: thinkingPulse 1.1s infinite ease-in-out;
        }
        .thinking-dot:nth-child(2) { animation-delay: 0.18s; }
        .thinking-dot:nth-child(3) { animation-delay: 0.36s; }
        .message-enter { animation: messageFade 0.18s ease-out; }
        .dice-box {
          width: 76px;
          height: 76px;
          border-radius: 18px;
          border: 1px solid rgba(182, 154, 110, 0.2);
          background: linear-gradient(180deg, rgba(52, 41, 31, 0.98) 0%, rgba(23, 18, 15, 0.98) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f4e8d2;
          font-size: 30px;
          font-weight: 700;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }
        .dice-rolling {
          animation: diceShake 0.45s infinite ease-in-out;
        }
      `}</style>

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
                {progressInfo && (
                  <span
                    style={{
                      padding: "7px 12px",
                      borderRadius: "999px",
                      border: "1px solid rgba(118, 157, 121, 0.22)",
                      background: "rgba(41, 64, 42, 0.22)",
                      color: "#d8e8d1",
                      fontSize: "13px",
                    }}
                  >
                    Progress: {progressInfo.percent}%
                  </span>
                )}
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
                    className="message-enter"
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

              {pendingCheck && (
                <div
                  className="message-enter"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(40, 33, 28, 0.88) 0%, rgba(23, 19, 17, 0.92) 100%)",
                    border: "1px solid rgba(182, 154, 110, 0.14)",
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
                      color: "#cfb788",
                    }}
                  >
                    system
                  </strong>

                  <div style={{ color: "#ece3d4", lineHeight: 1.75 }}>
                    <p style={{ margin: "0 0 10px" }}>
                      Check triggered. This action requires a <strong>{pendingCheck.skill}</strong> roll to decide the outcome.
                    </p>
                    <p style={{ margin: "0 0 14px", color: "#d8cfbf" }}>
                      {pendingCheck.reason} · {pendingCheck.expression}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div className={`dice-box ${rolling ? "dice-rolling" : ""}`}>
                        {displayRollValue ?? "d20"}
                      </div>

                      <div style={{ minWidth: "250px" }}>
                        {rolling ? (
                          <>
                            <p style={{ margin: "0 0 8px" }}>Rolling the die...</p>
                            <p style={{ margin: 0, color: "#c9bea8" }}>
                              The result will be applied automatically after the animation.
                            </p>
                          </>
                        ) : sending ? (
                          <>
                            <p style={{ margin: "0 0 8px" }}>
                              Roll locked: <strong>{pendingCheck.rollResult.raw}</strong>
                              {pendingCheck.modifier >= 0
                                ? ` + ${pendingCheck.modifier}`
                                : ` - ${Math.abs(pendingCheck.modifier)}`} ={" "}
                              <strong>{pendingCheck.rollResult.total}</strong>
                            </p>
                            <p
                              style={{
                                margin: 0,
                                color: "#c9bea8",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                              }}
                            >
                              Applying roll result and generating narration
                              <span className="thinking-dots" aria-hidden="true">
                                <span className="thinking-dot" />
                                <span className="thinking-dot" />
                                <span className="thinking-dot" />
                              </span>
                            </p>
                          </>
                        ) : (
                          <>
                            <p style={{ margin: "0 0 8px" }}>
                              Click the die to roll. The game will then resolve the action using that result.
                            </p>
                            <button
                              onClick={rollPendingCheck}
                              disabled={rolling || sending}
                              style={{
                                padding: "11px 16px",
                                borderRadius: "999px",
                                border: "1px solid rgba(182, 154, 110, 0.35)",
                                background: "linear-gradient(180deg, #4a3826 0%, #2d2118 100%)",
                                color: "#f5ebd6",
                                cursor: "pointer",
                              }}
                            >
                              Roll d20
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {sending && pendingPlayerAction && (
                <>
                  <div
                    className="message-enter"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(44, 58, 76, 0.85) 0%, rgba(31, 40, 52, 0.9) 100%)",
                      border: "1px solid rgba(96, 134, 178, 0.24)",
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
                        color: "#a8c7ec",
                      }}
                    >
                      player
                    </strong>
                    <span style={{ color: "#ece3d4", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                      {pendingPlayerAction}
                    </span>
                  </div>

                  {!pendingCheck && (
                    <div
                      className="message-enter"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(40, 33, 28, 0.88) 0%, rgba(23, 19, 17, 0.92) 100%)",
                        border: "1px solid rgba(182, 154, 110, 0.14)",
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
                          color: "#cfb788",
                        }}
                      >
                        narrator
                      </strong>

                      <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#ece3d4" }}>
                        <span>Message sent. The GM is preparing the next beat</span>
                        <span className="thinking-dots" aria-hidden="true">
                          <span className="thinking-dot" />
                          <span className="thinking-dot" />
                          <span className="thinking-dot" />
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
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
                      You already have enough evidence to stop here. You can end the session now, or keep digging for corroborating proof and a fuller final reveal.
                    </p>
                    <button
                      onClick={() => requestAction("End session and compile report")}
                      disabled={sending || rolling || Boolean(pendingCheck)}
                      style={{
                        padding: "11px 16px",
                        borderRadius: "999px",
                        border: "1px solid rgba(182, 154, 110, 0.35)",
                        background: "linear-gradient(180deg, #4a3826 0%, #2d2118 100%)",
                        color: "#f5ebd6",
                        cursor: sending || rolling || pendingCheck ? "default" : "pointer",
                      }}
                    >
                      End session now
                    </button>
                  </div>
                )}

                {(sending || rolling) && !pendingCheck && (
                  <div
                    style={{
                      marginBottom: "14px",
                      padding: "12px 14px",
                      borderRadius: "14px",
                      border: "1px solid rgba(182, 154, 110, 0.14)",
                      background: "rgba(29, 23, 19, 0.92)",
                      color: "#d8cfbf",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <span>Your action has been sent. Please wait for the next reply.</span>
                    <span className="thinking-dots" aria-hidden="true">
                      <span className="thinking-dot" />
                      <span className="thinking-dot" />
                      <span className="thinking-dot" />
                    </span>
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
                    disabled={sending || rolling || Boolean(pendingCheck)}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "1px solid rgba(182, 154, 110, 0.18)",
                      borderRadius: "14px",
                      background: "rgba(15, 12, 11, 0.95)",
                      color: "#f0e7d7",
                      outline: "none",
                      opacity: sending || rolling || pendingCheck ? 0.7 : 1,
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !sending && !rolling && !pendingCheck) {
                        requestAction();
                      }
                    }}
                  />
                  <button
                    onClick={() => requestAction()}
                    disabled={sending || rolling || Boolean(pendingCheck)}
                    style={{
                      padding: "14px 18px",
                      borderRadius: "14px",
                      border: "1px solid rgba(182, 154, 110, 0.28)",
                      background:
                        "linear-gradient(180deg, rgba(72, 57, 40, 1) 0%, rgba(38, 29, 21, 1) 100%)",
                      color: "#f5ebd6",
                      cursor: sending || rolling || pendingCheck ? "default" : "pointer",
                      minWidth: "110px",
                    }}
                  >
                    {pendingCheck ? "Check Ready" : rolling ? "Rolling..." : sending ? "Sending..." : "Send"}
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
                          onClick={() => requestAction(item)}
                          disabled={sending || rolling || Boolean(pendingCheck)}
                          style={{
                            padding: "10px 14px",
                            borderRadius: "999px",
                            border: "1px solid rgba(182, 154, 110, 0.18)",
                            background:
                              "linear-gradient(180deg, rgba(47, 39, 32, 0.95) 0%, rgba(24, 20, 18, 0.98) 100%)",
                            color: "#eadfc8",
                            cursor: sending || rolling || pendingCheck ? "default" : "pointer",
                            opacity: sending || rolling || pendingCheck ? 0.6 : 1,
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
            {progressInfo && (
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
                  Case Progress
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "10px",
                  }}
                >
                  <strong style={{ color: "#f3ecdc", fontSize: "20px" }}>{progressInfo.percent}%</strong>
                  <span style={{ color: "#d7c8ad", fontSize: "13px" }}>{progressInfo.label}</span>
                </div>
                <div
                  style={{
                    height: "10px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.06)",
                    overflow: "hidden",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      width: `${progressInfo.percent}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #5c734c 0%, #9bb57a 100%)",
                    }}
                  />
                </div>
                <p style={{ margin: "0 0 8px", color: "#ece3d4", lineHeight: 1.7 }}>
                  {progressInfo.detail}
                </p>
                <p style={{ margin: 0, color: "#c9bea8", fontSize: "13px" }}>
                  Expected run length: 12-18 actions. Remaining: {progressInfo.eta}
                </p>
              </section>
            )}

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
                  <strong style={{ color: "#f1e7d2" }}>Danger:</strong> {safeDanger}/{safeMaxDanger} ({dangerPercent}%)
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
                  This bar is normalized from the current saved state, so old sessions with invalid danger values are clamped automatically.
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
                        <strong>Modifier:</strong> {lastRoll.modifier >= 0 ? `+${lastRoll.modifier}` : lastRoll.modifier}
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
