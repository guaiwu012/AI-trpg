"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DiceResult, GameState } from "@/types/game";
import { getStoryImageConfig } from "@/lib/storyImages";

type PendingCheck = {
  action: string;
  skill: "observation" | "persuasion" | "willpower";
  reason: string;
  modifier: number;
  expression: string;
  rollResult: DiceResult;
};

type ProgressInfo = {
  percent: number;
  label: string;
  detail: string;
  eta: string;
};

type DieTilt = {
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  y: number;
  scale: number;
};

type StoryImageEntry = {
  key: string;
  insertAfter: number;
  src: string;
  alt: string;
  fileName: string;
};

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

const initialDieTilt: DieTilt = {
  rotateX: -10,
  rotateY: 12,
  rotateZ: -6,
  y: 0,
  scale: 1,
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
  const inventory = Array.isArray(raw.character?.inventory) ? [...raw.character.inventory] : [];

  const reconcile: Record<string, string> = {
    quarantine_unlocked: "Treatment Keycard",
    basement_unlocked: "Service Passcard",
    evidence_folder_found: "Lucas Dossier",
    night_shift_log_found: "Treatment Ledger",
    transfer_manifest_found: "Lucas Route Fragment",
    restraint_protocol_found: "Underground Restraint Protocol",
    partner_contract_found: "Helix Cooperation Contract",
    parent_letter_found: "Parent Complaint Letter",
    ethics_memo_found: "Cleanup and Fire Memo",
    night_transfer_schedule_found: "Nina Night Log",
    sedation_protocol_found: "Hormone Dosing Protocol",
    training_manual_found: "Ethan Directive Manual",
    dosage_variance_found: "Stability Rating Sheet",
    incident_photo_found: "Sample Photo",
    lucas_map_completed: "Completed Lucas Map",
    nina_mark_sequence_found: "Nina Mark Sequence",
    memory_trigger_found: "Recovered Memory Fragment",
    release_record_found: "Release Approval File",
    escape_log_found: "Escape Incident Log",
  };

  for (const [flag, item] of Object.entries(reconcile)) {
    if (raw.flags?.[flag] && !inventory.includes(item)) {
      inventory.push(item);
    }
  }

  return {
    ...raw,
    gameMode: raw.gameMode || "short",
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

function getSceneLabel(state: GameState) {
  const labels: Record<string, string> = {
    gate: "Ruined Main Entrance",
    hallway: "Burned School Corridor",
    archive: "Archive of Erased Students",
    basement: "Underground Treatment Core",
    courtyard: "Wellness Courtyard",
    clinic_hall: "Outer Treatment Hall",
    infirmary: "Student Wellness Center",
    quarantine_room: "Hidden Sample Wing",
  };
  return labels[state.currentScene] || state.currentScene;
}

function getObjective(state: GameState) {
  if (state.scenario === "basement_case") {
    switch (state.currentScene) {
      case "gate":
        return state.gameMode === "long"
          ? "Confirm the explorer trace and establish your first route clue before committing to the school interior."
          : "Find the first usable trace left by the explorer team, Nina, or Lucas.";
      case "hallway":
        return state.gameMode === "long"
          ? "Follow the erased-school clues and stabilize the returning memory before opening the archive route."
          : "Follow the erased-school clues until the archive route opens.";
      case "archive":
        return state.gameMode === "long"
          ? "Secure Lucas's dossier, reconstruct the transfer route, and complete his hidden map before descending."
          : "Secure Lucas's dossier, then reconstruct how the hidden descent worked.";
      case "basement":
        return state.gameMode === "long"
          ? "Collect deeper corroboration, then recover both the release file and escape log before forcing the final reveal."
          : "Collect corroborating proof of the underground experiment before forcing the final reveal.";
      default:
        return "Keep pressing deeper into the case.";
    }
  }

  switch (state.currentScene) {
    case "courtyard":
      return state.gameMode === "long"
        ? "Confirm the explorer trace and Nina's entry mark before committing to the treatment wing."
        : "Find the hidden way into Student Wellness Center and identify Nina's marks.";
    case "clinic_hall":
      return state.gameMode === "long"
        ? "Read the altered hall, steady the memory pressure, and open the path to the treatment rooms."
        : "Work out how the treatment wing separated ordinary care from hidden processing.";
    case "infirmary":
      return state.gameMode === "long"
        ? "Secure the ledger, trace the route deeper inside, and reconstruct Nina's full mark sequence."
        : "Secure the treatment ledger, then trace how students were pushed deeper inside.";
    case "quarantine_room":
      return state.gameMode === "long"
        ? "Collect deeper corroboration, then recover both the release file and escape log before exposing the full system."
        : "Collect corroborating proof of the Helix program before exposing the full system.";
    default:
      return "Keep pressing deeper into the case.";
  }
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
  const isLong = state.gameMode === "long";
  let progress = 0;

  if (state.scenario === "basement_case") {
    const corroborationCount = [
      "transfer_manifest_found",
      "restraint_protocol_found",
      "partner_contract_found",
      "parent_letter_found",
      "ethics_memo_found",
    ].filter((flag) => state.flags[flag]).length;

    if (state.flags.found_gate_clue) progress = Math.max(progress, 8);
    if (state.flags.archive_hint || state.flags.archive_unlocked) progress = Math.max(progress, 16);
    if (state.flags.memory_trigger_found) progress = Math.max(progress, 24);
    if (state.flags.evidence_folder_found) progress = Math.max(progress, isLong ? 32 : 38);
    if (state.flags.basement_transfer_route_found) progress = Math.max(progress, isLong ? 42 : 52);
    if (state.flags.lucas_map_completed) progress = Math.max(progress, 56);
    if (corroborationCount >= 1) progress = Math.max(progress, isLong ? 62 : 64);
    if (corroborationCount >= 2) progress = Math.max(progress, isLong ? 68 : 74);
    if (corroborationCount >= 3) progress = Math.max(progress, isLong ? 74 : 84);
    if (corroborationCount >= 4) progress = Math.max(progress, 82);
    if (corroborationCount >= 5) progress = Math.max(progress, 88);
    if (state.flags.release_record_found) progress = Math.max(progress, 92);
    if (state.flags.escape_log_found) progress = Math.max(progress, 96);
    if (state.flags.basement_experiment_found) progress = Math.max(progress, 98);
  } else {
    const corroborationCount = [
      "night_transfer_schedule_found",
      "sedation_protocol_found",
      "training_manual_found",
      "dosage_variance_found",
      "incident_photo_found",
    ].filter((flag) => state.flags[flag]).length;

    if (state.flags.found_courtyard_clue) progress = Math.max(progress, 8);
    if (state.flags.infirmary_hint || state.flags.infirmary_unlocked) progress = Math.max(progress, 16);
    if (state.flags.memory_trigger_found) progress = Math.max(progress, 24);
    if (state.flags.night_shift_log_found) progress = Math.max(progress, isLong ? 32 : 38);
    if (state.flags.infirmary_transfer_route_found) progress = Math.max(progress, isLong ? 42 : 52);
    if (state.flags.nina_mark_sequence_found) progress = Math.max(progress, 56);
    if (corroborationCount >= 1) progress = Math.max(progress, isLong ? 62 : 64);
    if (corroborationCount >= 2) progress = Math.max(progress, isLong ? 68 : 74);
    if (corroborationCount >= 3) progress = Math.max(progress, isLong ? 74 : 84);
    if (corroborationCount >= 4) progress = Math.max(progress, 82);
    if (corroborationCount >= 5) progress = Math.max(progress, 88);
    if (state.flags.release_record_found) progress = Math.max(progress, 92);
    if (state.flags.escape_log_found) progress = Math.max(progress, 96);
    if (state.flags.infirmary_experiment_found) progress = Math.max(progress, 98);
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
      : progress >= 96
      ? "Identity reveal imminent"
      : progress >= 82
      ? "Corroborating the buried truth"
      : progress >= 56
      ? "Hidden route established"
      : progress >= 32
      ? "Core evidence found"
      : progress >= 16
      ? "Following Lucas and Nina"
      : "Just started";

  const detail =
    progress >= 100
      ? "This run has reached an ending."
      : progress >= 82
      ? isLong
        ? "You already understand the broad system. The last stretch is about identity evidence and final corroboration."
        : "You already understand the broad shape of St. Alden's system. One more push should expose the final link."
      : progress >= 56
      ? "You now understand how the school, Wellness Center, and underground core connected."
      : progress >= 32
      ? "You have hard evidence, but not yet the full Helix chain or your place inside it."
      : progress >= 16
      ? "You have found where the hidden route opens, but not yet how the full system functioned."
      : "You are still at the beginning of the investigation.";

  const eta =
    progress >= 100
      ? "Finished"
      : isLong
      ? progress >= 96
        ? "About 1-2 more actions"
        : progress >= 82
        ? "About 4-6 more actions"
        : progress >= 56
        ? "About 8-12 more actions"
        : progress >= 32
        ? "About 12-16 more actions"
        : "About 18-24 more actions"
      : progress >= 96
      ? "About 1-2 more actions"
      : progress >= 82
      ? "About 3-5 more actions"
      : progress >= 56
      ? "About 5-8 more actions"
      : progress >= 32
      ? "About 7-10 more actions"
      : "About 12-16 more actions";

  return { percent: progress, label, detail, eta };
}

function getOutcomeLabel(outcome?: DiceResult["outcome"]) {
  switch (outcome) {
    case "great_success":
      return "Great success";
    case "success":
      return "Success";
    case "fail":
    default:
      return "Fail";
  }
}

function formatFlagLabel(flag: string) {
  const labelMap: Record<string, string> = {
    found_gate_clue: "Entrance clue found",
    found_courtyard_clue: "Courtyard clue found",
    archive_hint: "Archive location confirmed",
    archive_unlocked: "Treatment-system lead obtained",
    basement_unlocked: "Service access unlocked",
    evidence_found: "Core evidence secured",
    evidence_folder_found: "Lucas dossier secured",
    truth_found: "Truth uncovered",
    overwhelmed: "Forced withdrawal",
    extracted_alive: "Escaped alive",
    escaped_with_evidence: "Escaped with evidence",
    infirmary_hint: "Wellness Center clue found",
    infirmary_unlocked: "Nina audio lead found",
    quarantine_unlocked: "Treatment core access unlocked",
    night_shift_log_found: "Treatment ledger secured",
    hp_depleted: "Collapsed from injury",
    basement_transfer_route_found: "Hidden descent reconstructed",
    basement_experiment_found: "Underground experiment exposed",
    infirmary_transfer_route_found: "Treatment route reconstructed",
    infirmary_experiment_found: "Wellness Center experiment exposed",
    systemic_pressure_found: "Institutional cover-up identified",
    identity_revealed: "Player identity revealed",
    ethan_contact: "Ethan recognized the player",
    transfer_manifest_found: "Lucas route fragment recovered",
    restraint_protocol_found: "Underground restraint protocol recovered",
    partner_contract_found: "Helix contract recovered",
    parent_letter_found: "Parent complaint letter recovered",
    ethics_memo_found: "Fire cleanup memo recovered",
    night_transfer_schedule_found: "Nina night log recovered",
    sedation_protocol_found: "Hormone protocol recovered",
    training_manual_found: "Ethan directive manual recovered",
    dosage_variance_found: "Stability rating sheet recovered",
    incident_photo_found: "Sample photo recovered",
    explorer_video_found: "Explorer footage confirmed",
    memory_trigger_found: "Recovered memory fragment",
    lucas_map_completed: "Lucas map completed",
    nina_mark_sequence_found: "Nina mark sequence completed",
    release_record_found: "Release file recovered",
    escape_log_found: "Escape log recovered",
  };

  return labelMap[flag] || flag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [state, setState] = useState<GameState | null>(null);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [pendingCheck, setPendingCheck] = useState<PendingCheck | null>(null);
  const [rolling, setRolling] = useState(false);
  const [displayRollValue, setDisplayRollValue] = useState<number | null>(null);
  const [dieTilt, setDieTilt] = useState<DieTilt>(initialDieTilt);
  const [dieGlow, setDieGlow] = useState(false);
  const [imageTimeline, setImageTimeline] = useState<StoryImageEntry[]>([]);
  const [trackedImageKey, setTrackedImageKey] = useState<string | null>(null);

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
        setImageTimeline(Array.isArray(parsed.imageTimeline) ? parsed.imageTimeline : []);
        setTrackedImageKey(typeof parsed.trackedImageKey === "string" ? parsed.trackedImageKey : null);
      } catch {
        setSuggestions([]);
        setImageTimeline([]);
        setTrackedImageKey(null);
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
    sessionStorage.setItem(
      `game-ui:${sessionId}`,
      JSON.stringify({ suggestions, imageTimeline, trackedImageKey })
    );
  }, [sessionId, suggestions, imageTimeline, trackedImageKey]);

  async function finalizeAction(actionText: string, rollResult?: DiceResult) {
    if (!state || state.isFinished) return;

    try {
      setSending(true);
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
      setSending(false);
      setPendingCheck(null);
      setRolling(false);
      setDisplayRollValue(null);
      setDieTilt(initialDieTilt);
      setDieGlow(false);
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
      setDieTilt(initialDieTilt);
      setDieGlow(false);
    } catch (error) {
      console.error(error);
      alert("Failed to process action.");
    }
  }

  function rollPendingCheck() {
    if (!pendingCheck || rolling || sending) return;

    setRolling(true);
    setDieGlow(false);
    let ticks = 0;

    const interval = window.setInterval(() => {
      setDisplayRollValue(Math.floor(Math.random() * 20) + 1);
      setDieTilt({
        rotateX: -18 + Math.random() * 36,
        rotateY: -22 + Math.random() * 44,
        rotateZ: -30 + Math.random() * 60,
        y: -6 + Math.random() * 12,
        scale: 0.94 + Math.random() * 0.24,
      });
      ticks += 1;

      if (ticks >= 18) {
        window.clearInterval(interval);
        setDisplayRollValue(pendingCheck.rollResult.raw);
        setDieTilt({
          rotateX: -8,
          rotateY: 10,
          rotateZ: 0,
          y: -2,
          scale: 1.08,
        });
        setDieGlow(true);
        window.setTimeout(() => setDieGlow(false), 520);
        window.setTimeout(() => {
          finalizeAction(pendingCheck.action, pendingCheck.rollResult);
        }, 900);
      }
    }, 70);
  }

  const lastRoll = useMemo(() => state?.lastRoll, [state]);
  const unlockedFlags = useMemo(
    () => Object.keys(state?.flags || {}).filter((key) => state?.flags[key]),
    [state]
  );
  const canEndNow = Boolean(state && canEndRun(state));
  const progressInfo = useMemo(() => (state ? getProgressInfo(state) : null), [state]);
  const storyImage = useMemo(() => (state ? getStoryImageConfig(state) : null), [state]);

  useEffect(() => {
    if (!hasCheckedStorage || !state || !storyImage) return;

    const nextKey = storyImage.fileName;
    if (trackedImageKey === nextKey && imageTimeline.length > 0) return;

    const insertAfter = Math.max(state.log.length - 1, 0);
    setImageTimeline((prev) => {
      const alreadyExists = prev.some((entry) => entry.key === nextKey && entry.insertAfter === insertAfter);
      if (alreadyExists) return prev;

      return [
        ...prev,
        {
          key: nextKey,
          insertAfter,
          src: storyImage.src,
          alt: storyImage.alt,
          fileName: storyImage.fileName,
        },
      ];
    });
    setTrackedImageKey(nextKey);
  }, [hasCheckedStorage, state, storyImage, trackedImageKey, imageTimeline.length]);

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
      <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "28px 20px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.8fr) minmax(320px, 0.9fr)", gap: "18px" }}>
          <section style={{ ...panelStyle, padding: "22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
              <div>
                <div style={{ letterSpacing: "0.16em", textTransform: "uppercase", color: "#b9a27b", fontSize: "0.86rem" }}>
                  {state.world}
                </div>
                <h1 style={{ margin: "10px 0 8px", fontSize: "2rem", color: "#f5ebd6" }}>
                  {state.character.name}
                </h1>
                <div style={{ color: "#d4c6b1", lineHeight: 1.7 }}>
                  {state.character.role} · {state.scenario === "basement_case" ? "Main Campus Route" : "Wellness Center Route"} · {state.gameMode === "long" ? "Long Mode" : "Short Mode"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push("/create")}
                style={{
                  padding: "10px 14px",
                  borderRadius: "999px",
                  border: "1px solid rgba(182, 154, 110, 0.24)",
                  background: "rgba(15, 12, 11, 0.84)",
                  color: "#f0e7d7",
                  cursor: "pointer",
                  height: "fit-content",
                }}
              >
                New run
              </button>
            </div>

            <div
              style={{
                marginTop: "18px",
                padding: "16px",
                borderRadius: "16px",
                border: "1px solid rgba(182, 154, 110, 0.14)",
                background: "rgba(15, 12, 11, 0.7)",
              }}
            >
              <div style={{ fontWeight: 700, color: "#f3ecdc", marginBottom: "6px" }}>{getSceneLabel(state)}</div>
              <div style={{ color: "#d4c6b1", lineHeight: 1.7 }}>{getObjective(state)}</div>
            </div>

            <div style={{ marginTop: "18px", display: "grid", gap: "12px" }}>
              {state.log.map((message, index) => {
                const imagesHere = imageTimeline.filter((entry) => entry.insertAfter === index);

                return (
                  <div key={`log-block-${index}`} style={{ display: "contents" }}>
                    <div
                      key={`${message.role}-${index}`}
                      style={{
                        padding: "14px 16px",
                        borderRadius: "16px",
                        border: "1px solid rgba(182, 154, 110, 0.14)",
                        background:
                          message.role === "player"
                            ? "rgba(45, 34, 24, 0.96)"
                            : message.role === "system"
                            ? "rgba(31, 28, 24, 0.96)"
                            : "rgba(18, 15, 14, 0.96)",
                      }}
                    >
                      <div
                        style={{
                          marginBottom: "6px",
                          fontSize: "0.8rem",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: message.role === "player" ? "#d8ba86" : "#b9a27b",
                        }}
                      >
                        {message.role}
                      </div>
                      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, color: "#efe6d7" }}>
                        {message.text}
                      </div>
                    </div>

                    {imagesHere.map((entry) => (
                      <section key={`${entry.key}-${entry.insertAfter}`} style={{ ...panelStyle, overflow: "hidden" }}>
                        <div style={{ position: "relative", aspectRatio: "16 / 9", background: "#14100d" }}>
                          <img
                            src={entry.src}
                            alt={entry.alt}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        </div>
                      </section>
                    ))}
                  </div>
                );
              })}
            </div>

            <section style={{ ...panelStyle, padding: "20px", marginTop: "18px" }}>
              <div style={{ color: "#b9a27b", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                Action
              </div>
              <div style={{ marginTop: "8px", color: "#d4c6b1", lineHeight: 1.7 }}>
                Enter what your character does next. Or you can choose from suggested actions after the first response.
              </div>

              {lastRoll && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "12px 14px",
                    borderRadius: "14px",
                    background: "rgba(15, 12, 11, 0.82)",
                    color: "#efe5d5",
                    lineHeight: 1.7,
                  }}
                >
                  Last roll: {lastRoll.raw} {lastRoll.modifier >= 0 ? "+" : "-"} {Math.abs(lastRoll.modifier)} = {lastRoll.total} → {lastRoll.outcome}
                </div>
              )}

              {pendingCheck ? (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "14px",
                    borderRadius: "18px",
                    background: "rgba(15, 12, 11, 0.82)",
                    border: "1px solid rgba(214, 181, 128, 0.16)",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(210px, 240px) minmax(0, 1fr)", gap: "16px", alignItems: "center" }}>
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: "18px",
                        background: "radial-gradient(circle at top, rgba(214,181,128,0.18), rgba(15,12,11,0) 48%), rgba(12, 10, 9, 0.92)",
                        border: "1px solid rgba(214, 181, 128, 0.12)",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          height: "176px",
                          display: "grid",
                          placeItems: "center",
                          borderRadius: "18px",
                          overflow: "hidden",
                          background: "linear-gradient(180deg, rgba(30,24,20,0.94) 0%, rgba(13,11,10,0.96) 100%)",
                          boxShadow: dieGlow
                            ? "0 0 0 1px rgba(230, 206, 162, 0.24) inset, 0 0 30px rgba(214, 181, 128, 0.26)"
                            : "0 0 0 1px rgba(230, 206, 162, 0.08) inset",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            inset: "18px",
                            borderRadius: "16px",
                            border: "1px solid rgba(214, 181, 128, 0.12)",
                            opacity: rolling ? 0.9 : 0.5,
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            width: rolling ? "180px" : "120px",
                            height: "180px",
                            borderRadius: "999px",
                            filter: "blur(18px)",
                            background: dieGlow
                              ? "rgba(214, 181, 128, 0.30)"
                              : "rgba(214, 181, 128, 0.10)",
                            transform: `translateY(${dieTilt.y * 1.6}px)`,
                            transition: rolling ? "all 70ms linear" : "all 240ms ease",
                          }}
                        />
                        <div
                          style={{
                            width: "104px",
                            height: "104px",
                            borderRadius: "24px",
                            display: "grid",
                            placeItems: "center",
                            color: "#f7efde",
                            fontSize: "2.7rem",
                            fontWeight: 800,
                            letterSpacing: "0.04em",
                            border: "1px solid rgba(243, 223, 189, 0.26)",
                            background: rolling
                              ? "linear-gradient(180deg, rgba(108,80,48,0.94) 0%, rgba(51,36,24,0.96) 100%)"
                              : "linear-gradient(180deg, rgba(77,56,35,0.98) 0%, rgba(33,24,18,0.98) 100%)",
                            boxShadow: dieGlow
                              ? "0 0 0 1px rgba(255,255,255,0.06) inset, 0 18px 40px rgba(0,0,0,0.36), 0 0 28px rgba(214,181,128,0.24)"
                              : "0 0 0 1px rgba(255,255,255,0.04) inset, 0 18px 40px rgba(0,0,0,0.34)",
                            transform: `perspective(900px) rotateX(${dieTilt.rotateX}deg) rotateY(${dieTilt.rotateY}deg) rotateZ(${dieTilt.rotateZ}deg) translateY(${dieTilt.y}px) scale(${dieTilt.scale})`,
                            transition: rolling
                              ? "transform 70ms linear, box-shadow 70ms linear, background 70ms linear"
                              : "transform 260ms ease, box-shadow 260ms ease, background 260ms ease",
                          }}
                        >
                          {displayRollValue ?? "?"}
                        </div>
                        <div
                          style={{
                            position: "absolute",
                            bottom: "14px",
                            left: 0,
                            right: 0,
                            textAlign: "center",
                            color: "#cdbb9d",
                            fontSize: "0.86rem",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                          }}
                        >
                          {rolling ? "Dice tumbling" : displayRollValue == null ? "Awaiting roll" : getOutcomeLabel(pendingCheck.rollResult.outcome)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div style={{ color: "#f5ebd6", fontWeight: 700, fontSize: "1.04rem" }}>Check ready: {pendingCheck.skill}</div>
                      <div style={{ marginTop: "6px", color: "#d4c6b1", lineHeight: 1.7 }}>{pendingCheck.reason}</div>
                      <div style={{ marginTop: "6px", color: "#d4c6b1" }}>{pendingCheck.expression}</div>
                      <div
                        style={{
                          marginTop: "12px",
                          padding: "10px 12px",
                          borderRadius: "12px",
                          background: "rgba(255,255,255,0.03)",
                          color: "#efe5d5",
                          lineHeight: 1.7,
                        }}
                      >
                        {rolling
                          ? "The die is tumbling. Let the result settle before the action resolves."
                          : displayRollValue == null
                          ? "Press roll check to animate the die and resolve the action."
                          : `Final roll: ${pendingCheck.rollResult.raw} ${pendingCheck.rollResult.modifier >= 0 ? "+" : "-"} ${Math.abs(pendingCheck.rollResult.modifier)} = ${pendingCheck.rollResult.total} → ${getOutcomeLabel(pendingCheck.rollResult.outcome)}`}
                      </div>
                      <button
                        type="button"
                        onClick={rollPendingCheck}
                        disabled={rolling || sending}
                        style={{
                          marginTop: "12px",
                          padding: "12px 18px",
                          borderRadius: "999px",
                          border: "1px solid rgba(214, 181, 128, 0.35)",
                          background: "linear-gradient(180deg, #4a3826 0%, #2d2118 100%)",
                          color: "#f5ebd6",
                          cursor: "pointer",
                        }}
                      >
                        {rolling ? "Rolling..." : "Roll check"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gap: "8px", marginTop: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => requestAction(suggestion)}
                        disabled={sending || rolling || state.isFinished}
                        style={{
                          textAlign: "left",
                          padding: "11px 12px",
                          borderRadius: "12px",
                          border: "1px solid rgba(182, 154, 110, 0.14)",
                          background: "rgba(15, 12, 11, 0.82)",
                          color: "#efe5d5",
                          cursor: "pointer",
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Describe your action..."
                    disabled={sending || rolling || state.isFinished}
                    style={{
                      width: "100%",
                      minHeight: "110px",
                      marginTop: "12px",
                      padding: "14px 16px",
                      borderRadius: "14px",
                      border: "1px solid rgba(182, 154, 110, 0.18)",
                      background: "rgba(15, 12, 11, 0.95)",
                      color: "#f0e7d7",
                      outline: "none",
                      resize: "vertical",
                    }}
                  />

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
                    <button
                      type="button"
                      onClick={() => requestAction()}
                      disabled={sending || rolling || state.isFinished}
                      style={{
                        padding: "13px 18px",
                        borderRadius: "14px",
                        border: "1px solid rgba(182, 154, 110, 0.28)",
                        background: "linear-gradient(180deg, rgba(72, 57, 40, 1) 0%, rgba(38, 29, 21, 1) 100%)",
                        color: "#f5ebd6",
                        cursor: "pointer",
                        minWidth: "110px",
                      }}
                    >
                      {sending ? "Sending..." : "Send"}
                    </button>

                    {canEndNow && !state.isFinished && (
                      <button
                        type="button"
                        onClick={() => requestAction("End session and compile report")}
                        disabled={sending || rolling}
                        style={{
                          padding: "13px 18px",
                          borderRadius: "14px",
                          border: "1px solid rgba(182, 154, 110, 0.28)",
                          background: "rgba(15, 12, 11, 0.84)",
                          color: "#f5ebd6",
                          cursor: "pointer",
                        }}
                      >
                        End session now
                      </button>
                    )}
                  </div>
                </>
              )}
            </section>

            {state.isFinished && state.summary && (
              <div
                style={{
                  marginTop: "18px",
                  padding: "18px",
                  borderRadius: "18px",
                  border: "1px solid rgba(214, 181, 128, 0.22)",
                  background: "rgba(15, 12, 11, 0.84)",
                }}
              >
                <div style={{ color: "#b9a27b", letterSpacing: "0.12em", textTransform: "uppercase", fontSize: "0.8rem" }}>
                  Session Report
                </div>
                <h2 style={{ margin: "10px 0 12px", color: "#f5ebd6" }}>{state.summary.title}</h2>
                <p style={{ lineHeight: 1.8, color: "#e6dccb" }}>{state.summary.storySummary}</p>
                <ul style={{ marginTop: "12px", paddingLeft: "18px", color: "#e0d4c0", lineHeight: 1.8 }}>
                  {state.summary.keyFindings.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <aside
            style={{
              display: "grid",
              gap: "18px",
              alignContent: "start",
              alignSelf: "start",
              position: "sticky",
              top: "20px",
              maxHeight: "calc(100vh - 40px)",
              overflowY: "auto",
              paddingRight: "4px",
            }}
          >
            <section style={{ ...panelStyle, padding: "18px" }}>
              <div style={{ display: "grid", gap: "10px" }}>
                <div>
                  <div style={{ color: "#b9a27b", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                    Progress
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginTop: "8px", color: "#f5ebd6" }}>
                    <strong>{progressInfo?.label}</strong>
                    <span>{progressInfo?.percent}%</span>
                  </div>
                  <div style={{ marginTop: "10px", height: "10px", borderRadius: "999px", background: "rgba(255,255,255,0.08)" }}>
                    <div
                      style={{
                        width: `${progressInfo?.percent || 0}%`,
                        height: "100%",
                        borderRadius: "999px",
                        background: "linear-gradient(90deg, rgba(214,181,128,0.8), rgba(120,89,52,0.9))",
                      }}
                    />
                  </div>
                  <div style={{ marginTop: "10px", color: "#d4c6b1", lineHeight: 1.7 }}>{progressInfo?.detail}</div>
                  <div style={{ marginTop: "8px", color: "#c3b49e" }}>Estimated remaining: {progressInfo?.eta}</div>
                </div>

                <div>
                  <div style={{ color: "#b9a27b", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                    Danger
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginTop: "8px", color: "#f5ebd6" }}>
                    <strong>{safeDanger}</strong>
                    <span>{safeDanger}/{safeMaxDanger}</span>
                  </div>
                  <div style={{ marginTop: "10px", height: "10px", borderRadius: "999px", background: "rgba(255,255,255,0.08)" }}>
                    <div
                      style={{
                        width: `${dangerPercent}%`,
                        height: "100%",
                        borderRadius: "999px",
                        background: "linear-gradient(90deg, rgba(168,78,55,0.88), rgba(112,30,18,0.96))",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
                  <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(15, 12, 11, 0.82)" }}>
                    <div style={{ color: "#b9a27b", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.12em" }}>HP</div>
                    <div style={{ marginTop: "6px", fontSize: "1.35rem", color: "#f5ebd6" }}>{state.character.hp}</div>
                  </div>
                  <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(15, 12, 11, 0.82)" }}>
                    <div style={{ color: "#b9a27b", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.12em" }}>Turns</div>
                    <div style={{ marginTop: "6px", fontSize: "1.35rem", color: "#f5ebd6" }}>{state.turnCount}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" }}>
                  <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(15, 12, 11, 0.82)" }}>
                    <div style={{ color: "#b9a27b", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.12em" }}>Observation</div>
                    <div style={{ marginTop: "6px", fontSize: "1.15rem", color: "#f5ebd6" }}>+{state.character.observation}</div>
                  </div>
                  <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(15, 12, 11, 0.82)" }}>
                    <div style={{ color: "#b9a27b", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.12em" }}>Persuasion</div>
                    <div style={{ marginTop: "6px", fontSize: "1.15rem", color: "#f5ebd6" }}>+{state.character.persuasion}</div>
                  </div>
                  <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(15, 12, 11, 0.82)" }}>
                    <div style={{ color: "#b9a27b", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.12em" }}>Willpower</div>
                    <div style={{ marginTop: "6px", fontSize: "1.15rem", color: "#f5ebd6" }}>+{state.character.willpower}</div>
                  </div>
                </div>
              </div>
            </section>

            <section style={{ ...panelStyle, padding: "18px" }}>
              <div style={{ color: "#b9a27b", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                Dice flow
              </div>
              <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "14px",
                    background: "rgba(15, 12, 11, 0.82)",
                    color: "#e9decc",
                    lineHeight: 1.7,
                  }}
                >
                  <div style={{ color: "#b9a27b", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "6px" }}>
                    Skill bases
                  </div>
                  Observation +{state.character.observation} · Persuasion +{state.character.persuasion} · Willpower +{state.character.willpower}
                </div>

                {pendingCheck ? (
                  <div
                    style={{
                      padding: "12px",
                      borderRadius: "14px",
                      background: "rgba(15, 12, 11, 0.82)",
                      color: "#efe5d5",
                      lineHeight: 1.7,
                    }}
                  >
                    <div style={{ color: "#b9a27b", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "6px" }}>
                      Current check
                    </div>
                    <div><strong>{pendingCheck.skill}</strong> · {pendingCheck.reason}</div>
                    <div style={{ marginTop: "6px", color: "#d7c8b2" }}>Formula: {pendingCheck.expression}</div>
                    <div style={{ marginTop: "6px", color: "#c3b49e" }}>This resolves after the visible dice animation.</div>
                  </div>
                ) : lastRoll ? (
                  <div
                    style={{
                      padding: "12px",
                      borderRadius: "14px",
                      background: "rgba(15, 12, 11, 0.82)",
                      color: "#efe5d5",
                      lineHeight: 1.7,
                    }}
                  >
                    <div style={{ color: "#b9a27b", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "6px" }}>
                      Latest result
                    </div>
                    <div>Formula: {lastRoll.expression}</div>
                    <div>Roll: {lastRoll.raw}</div>
                    <div>Modifier: {lastRoll.modifier >= 0 ? "+" : "-"}{Math.abs(lastRoll.modifier)}</div>
                    <div>Total: {lastRoll.total}</div>
                    <div>Outcome: {getOutcomeLabel(lastRoll.outcome)}</div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "12px",
                      borderRadius: "14px",
                      background: "rgba(15, 12, 11, 0.82)",
                      color: "#d4c6b1",
                      lineHeight: 1.7,
                    }}
                  >
                    No roll yet. When a check is triggered, the formula and result will stay here.
                  </div>
                )}
              </div>
            </section>

            <section style={{ ...panelStyle, padding: "18px" }}>
              <div style={{ color: "#b9a27b", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                Inventory
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
                {state.character.inventory.length ? (
                  state.character.inventory.map((item) => (
                    <span
                      key={item}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "999px",
                        background: "rgba(15, 12, 11, 0.86)",
                        border: "1px solid rgba(182, 154, 110, 0.16)",
                        color: "#efe5d5",
                        fontSize: "0.92rem",
                      }}
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <div style={{ color: "#d4c6b1", marginTop: "10px" }}>No items yet.</div>
                )}
              </div>
            </section>

            <section style={{ ...panelStyle, padding: "18px" }}>
              <div style={{ color: "#b9a27b", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                Unlocked findings
              </div>
              <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
                {unlockedFlags.length ? (
                  unlockedFlags.map((flag) => (
                    <div
                      key={flag}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "12px",
                        background: "rgba(15, 12, 11, 0.82)",
                        color: "#efe5d5",
                      }}
                    >
                      {formatFlagLabel(flag)}
                    </div>
                  ))
                ) : (
                  <div style={{ color: "#d4c6b1" }}>No major findings yet.</div>
                )}
              </div>
            </section>

          </aside>
        </div>
      </div>
    </main>
  );
}
