import { NextResponse } from "next/server";
import { applyGameLogic, canEndSession, resolveAction } from "@/lib/rules";
import { ai } from "@/lib/ai";
import { GameState, SessionSummary } from "@/types/game";

function getHpTradeSuggestion(state: GameState) {
  if (state.isFinished) return "";

  if (
    state.currentScene === "archive" &&
    !state.flags.evidence_found &&
    state.character.hp > 1
  ) {
    return "Pry open the jammed archive cabinet with your bare hands (-1 HP)";
  }

  if (
    state.currentScene === "clinic_hall" &&
    !state.flags.infirmary_hint &&
    !state.flags.infirmary_unlocked &&
    state.character.hp > 1
  ) {
    return "Push through the broken glass toward the infirmary (-1 HP)";
  }

  if (
    state.currentScene === "infirmary" &&
    !state.flags.quarantine_unlocked &&
    state.character.hp > 1
  ) {
    return "Force open the nurse's desk drawer with your hands (-1 HP)";
  }

  if (
    state.currentScene === "basement" &&
    !state.flags.truth_found &&
    state.character.hp > 1
  ) {
    return "Push through the pain and follow the whispering trail (-1 HP)";
  }

  if (
    state.currentScene === "quarantine_room" &&
    !state.flags.truth_found &&
    state.character.hp > 2
  ) {
    return "Stay in the room and pull the sealed records free (-2 HP)";
  }

  return "";
}

function buildNarrationPrompt(
  state: GameState,
  action: string,
  rollResult: unknown,
  logicNote: string
) {
  const hpTradeSuggestion = getHpTradeSuggestion(state);

  return `
You are the game master of a suspense text RPG. Return JSON only. Do not return markdown. Do not use code fences.
Required JSON format:
{
  "narration": "string",
  "npcReply": "string",
  "suggestedActions": ["string", "string", "string"]
}
Current world: ${state.world}
Current scenario: ${state.scenario}
Current scene: ${state.currentScene}
Game finished: ${state.isFinished ? "yes" : "no"}
Turn count: ${state.turnCount}
Danger: ${state.danger}/${state.maxDanger}
Can end session now: ${canEndSession(state) ? "yes" : "no"}
High-cost option currently available: ${hpTradeSuggestion || "none"}
Character:
- role: ${state.character.role}
- name: ${state.character.name}
- hp: ${state.character.hp}
- observation: ${state.character.observation}
- persuasion: ${state.character.persuasion}
- willpower: ${state.character.willpower}
- inventory: ${state.character.inventory.join(", ") || "none"}
Unlocked flags: ${
    Object.keys(state.flags)
      .filter((key) => state.flags[key])
      .join(", ") || "none"
  }
Recent story log:
${state.log.slice(-6).map((m) => `${m.role}: ${m.text}`).join("\n")}
Player action: ${action}
Dice result: ${rollResult ? JSON.stringify(rollResult) : "none"}
System update: ${logicNote || "none"}
Rules:
- Do not invent dice results
- Do not change character stats
- Follow the dice result if given
- Follow the system update strictly
- If the system update mentions HP loss, reflect it as physical injury, strain, blood, or exhaustion
- Danger should feel real and immediate when it is 2 or higher
- Keep the tone suspenseful and concise
- If the game is finished, make the narration feel like an ending beat
- npcReply can be an empty string if no NPC is speaking
- suggestedActions should contain 3 short action options unless the game is finished
- If a high-cost option is available and the game is not finished, it is acceptable for one suggested action to mention paying HP for progress
- If can end session now is yes and the game is not finished, one suggested action should be about ending the session and compiling a report
`;
}

function buildSummaryPrompt(state: GameState) {
  return `
You are summarizing a finished suspense text RPG session.
Return JSON only. Do not return markdown. Do not use code fences.
Required JSON format:
{
  "title": "string",
  "outcome": "extracted|truth_found|overwhelmed|unfinished",
  "storySummary": "string",
  "keyFindings": ["string", "string", "string"]
}
World: ${state.world}
Scenario: ${state.scenario}
Final scene: ${state.currentScene}
Turn count: ${state.turnCount}
Danger: ${state.danger}/${state.maxDanger}
Character: ${state.character.name} (${state.character.role})
HP at end: ${state.character.hp}
Inventory: ${state.character.inventory.join(", ") || "none"}
Flags: ${
    Object.keys(state.flags)
      .filter((key) => state.flags[key])
      .join(", ") || "none"
  }
Story log:
${state.log.map((m) => `${m.role}: ${m.text}`).join("\n")}
Rules:
- outcome should be truth_found if the truth was uncovered
- outcome should be extracted if the player left early with useful evidence
- outcome should be overwhelmed if danger or physical collapse forced the player out
- storySummary should be around 90 to 140 words
- keyFindings should be concise and concrete
`;
}

function getFallbackSummary(state: GameState): SessionSummary {
  if (state.flags.truth_found) {
    if (state.scenario === "infirmary_case") {
      return {
        title: "The Infirmary Records Opened",
        outcome: "truth_found",
        storySummary:
          "The investigation pushed through the abandoned infirmary wing and reached the quarantine room. There, the player uncovered sealed treatment records proving the disappearances were hidden inside falsified medical paperwork. The evidence turned the old infirmary from a rumor into a documented crime scene, even if the truth had to be pulled out through pain and physical risk.",
        keyFindings: [
          "The infirmary kept concealed treatment records",
          "Student disappearances were hidden in medical paperwork",
          `The session ended at danger ${state.danger}/${state.maxDanger}`,
        ],
      };
    }

    return {
      title: "Truth Recovered",
      outcome: "truth_found",
      storySummary:
        "The investigation reached the basement and uncovered records tying the disappearance to a deliberate cover-up. The player survived long enough to pull the truth into the open and turn a rumor into proof, paying a physical cost to keep the case from vanishing again.",
      keyFindings: [
        "Evidence connected the disappearance to school officials",
        "The basement contained concealed records",
        `The session ended at danger ${state.danger}/${state.maxDanger}`,
      ],
    };
  }

  if (state.flags.overwhelmed || state.flags.hp_depleted) {
    return {
      title: "Forced Withdrawal",
      outcome: "overwhelmed",
      storySummary:
        "The investigation pushed too deep before the building's threats closed in. The player escaped with fragments, but the case remained only partially resolved and the final answer stayed behind locked doors. Physical strain became part of the cost of the search, and the session ended before the full truth could be carried out.",
      keyFindings: [
        "The danger or injury escalated too quickly",
        "Some evidence was found before the retreat",
        `The session ended after ${state.turnCount} turns`,
      ],
    };
  }

  if (state.scenario === "infirmary_case") {
    return {
      title: "Partial Extraction from the Infirmary",
      outcome: "extracted",
      storySummary:
        "The player ended the investigation after securing usable records from the infirmary desk, choosing survival and a credible report over a deeper push into the quarantine room.",
      keyFindings: [
        "The infirmary yielded a medical ledger",
        "The player extracted before the quarantine room was fully explored",
        `Final danger was ${state.danger}/${state.maxDanger}`,
      ],
    };
  }

  return {
    title: "Partial Extraction",
    outcome: "extracted",
    storySummary:
      "The player ended the investigation after securing usable evidence, choosing survival and a workable report over a deeper descent into the basement.",
    keyFindings: [
      "The archive yielded an evidence folder",
      "The player extracted before the case fully collapsed",
      `Final danger was ${state.danger}/${state.maxDanger}`,
    ],
  };
}

async function generateSummary(state: GameState) {
  const completion = await ai.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: "You summarize finished game sessions. Output valid JSON only.",
      },
      {
        role: "user",
        content: buildSummaryPrompt(state),
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.6,
    max_tokens: 500,
  });

  const content = completion.choices[0]?.message?.content ?? "{}";

  try {
    return JSON.parse(content) as SessionSummary;
  } catch {
    return getFallbackSummary(state);
  }
}

export async function POST(req: Request) {
  try {
    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: "Missing DEEPSEEK_API_KEY" },
        { status: 500 }
      );
    }

    const { state, action }: { state: GameState; action: string } = await req.json();

    const rollResult = resolveAction(state.character, action, state.currentScene);
    const logic = applyGameLogic(state, action, rollResult);

    const completion = await ai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are a structured game master for a web-based text RPG. Output valid JSON only.",
        },
        {
          role: "user",
          content: buildNarrationPrompt(
            logic.state,
            action,
            rollResult,
            logic.logicNote
          ),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content ?? "{}";

    let parsed: {
      narration?: string;
      npcReply?: string;
      suggestedActions?: string[];
    } = {};

    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        narration: "The silence thickens, but nothing becomes clear.",
        npcReply: "",
        suggestedActions: [
          "Look around carefully",
          "Call out into the darkness",
          "Take a step forward",
        ],
      };
    }

    const newState: GameState = {
      ...logic.state,
      lastRoll: rollResult ?? undefined,
      log: [
        ...logic.state.log,
        { role: "player", text: action },
        { role: "narrator", text: parsed.narration || "" },
        ...(parsed.npcReply
          ? ([{ role: "npc", text: parsed.npcReply }] as const)
          : []),
      ],
    };

    if (newState.isFinished) {
      newState.summary = await generateSummary(newState);
    }

    const baseSuggestions = newState.isFinished
      ? []
      : parsed.suggestedActions || [];

    const hpTradeSuggestion = getHpTradeSuggestion(newState);
    const canExtractNow = !newState.isFinished && canEndSession(newState);

    const suggestedActions = [
      ...baseSuggestions,
      ...(hpTradeSuggestion ? [hpTradeSuggestion] : []),
      ...(canExtractNow ? ["End session and compile report"] : []),
    ]
      .filter(Boolean)
      .filter((item, index, arr) => arr.indexOf(item) === index)
      .slice(0, 4);

    return NextResponse.json({
      state: newState,
      ui: {
        rollResult,
        suggestedActions,
      },
    });
  } catch (error) {
    console.error("ACTION_ROUTE_ERROR:", error);
    return NextResponse.json(
      { error: "Failed to process game action" },
      { status: 500 }
    );
  }
}
