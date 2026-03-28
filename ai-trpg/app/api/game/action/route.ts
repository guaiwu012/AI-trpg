import { NextResponse } from "next/server";
import { applyGameLogic, canEndSession, resolveAction } from "@/lib/rules";
import { ai } from "@/lib/ai";
import { GameState, SessionSummary } from "@/types/game";

function buildNarrationPrompt(
  state: GameState,
  action: string,
  rollResult: unknown,
  logicNote: string
) {
  return `
You are the game master of a suspense text RPG.

Return JSON only.
Do not return markdown.
Do not use code fences.

Required JSON format:
{
  "narration": "string",
  "npcReply": "string",
  "suggestedActions": ["string", "string", "string"]
}

Current world: ${state.world}
Current scene: ${state.currentScene}
Game finished: ${state.isFinished ? "yes" : "no"}
Turn count: ${state.turnCount}
Danger: ${state.danger}/${state.maxDanger}
Can end session now: ${canEndSession(state) ? "yes" : "no"}

Character:
- role: ${state.character.role}
- name: ${state.character.name}
- hp: ${state.character.hp}
- observation: ${state.character.observation}
- persuasion: ${state.character.persuasion}
- willpower: ${state.character.willpower}
- inventory: ${state.character.inventory.join(", ") || "none"}

Unlocked flags:
${Object.keys(state.flags)
  .filter((key) => state.flags[key])
  .join(", ") || "none"}

Recent story log:
${state.log.slice(-6).map((m) => `${m.role}: ${m.text}`).join("\n")}

Player action:
${action}

Dice result:
${rollResult ? JSON.stringify(rollResult) : "none"}

System update:
${logicNote || "none"}

Rules:
- Do not invent dice results
- Do not change character stats
- Follow the dice result if given
- Follow the system update strictly
- Danger should feel real and immediate when it is 2 or higher
- Keep the tone suspenseful and concise
- If the game is finished, make the narration feel like an ending beat
- npcReply can be an empty string if no NPC is speaking
- suggestedActions should contain 3 short action options unless the game is finished
- If can end session now is yes and the game is not finished, one suggested action should be about ending the session and compiling a report
`;
}

function buildSummaryPrompt(state: GameState) {
  return `
You are summarizing a finished suspense text RPG session.
Return JSON only.
Do not return markdown.
Do not use code fences.

Required JSON format:
{
  "title": "string",
  "outcome": "extracted|truth_found|overwhelmed|unfinished",
  "storySummary": "string",
  "keyFindings": ["string", "string", "string"]
}

World: ${state.world}
Final scene: ${state.currentScene}
Turn count: ${state.turnCount}
Danger: ${state.danger}/${state.maxDanger}
Character: ${state.character.name} (${state.character.role})
Inventory: ${state.character.inventory.join(", ") || "none"}
Flags: ${Object.keys(state.flags).filter((key) => state.flags[key]).join(", ") || "none"}

Story log:
${state.log.map((m) => `${m.role}: ${m.text}`).join("\n")}

Rules:
- outcome should be truth_found if the truth was uncovered
- outcome should be extracted if the player left early with useful evidence
- outcome should be overwhelmed if danger forced the player out
- storySummary should be around 90 to 140 words
- keyFindings should be concise and concrete
`;
}

function getFallbackSummary(state: GameState): SessionSummary {
  if (state.flags.truth_found) {
    return {
      title: "Truth Recovered",
      outcome: "truth_found",
      storySummary:
        "The investigation reached the basement and uncovered records tying the disappearance to a deliberate cover-up. The player survived long enough to pull the truth into the open.",
      keyFindings: [
        "Evidence connected the disappearance to school officials",
        "The basement contained concealed records",
        `The session ended at danger ${state.danger}/${state.maxDanger}`,
      ],
    };
  }

  if (state.flags.overwhelmed) {
    return {
      title: "Forced Withdrawal",
      outcome: "overwhelmed",
      storySummary:
        "The investigation pushed too deep before the building's threats closed in. The player escaped with fragments, but the case remained only partially resolved.",
      keyFindings: [
        "The danger escalated too quickly",
        "Some evidence was found before the retreat",
        `The session ended after ${state.turnCount} turns`,
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
      return NextResponse.json({ error: "Missing DEEPSEEK_API_KEY" }, { status: 500 });
    }

    const { state, action }: { state: GameState; action: string } = await req.json();

    const rollResult = resolveAction(state.character, action, state.currentScene);
    const logic = applyGameLogic(state, action, rollResult);

    const completion = await ai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "You are a structured game master for a web-based text RPG. Output valid JSON only.",
        },
        {
          role: "user",
          content: buildNarrationPrompt(logic.state, action, rollResult, logic.logicNote),
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
        ...(parsed.npcReply ? [{ role: "npc" as const, text: parsed.npcReply }] : []),
      ],
    };

    if (newState.isFinished) {
      newState.summary = await generateSummary(newState);
    }

    const baseSuggestions = newState.isFinished ? [] : parsed.suggestedActions || [];
    const canExtractNow = !newState.isFinished && canEndSession(newState);
    const suggestedActions = canExtractNow
      ? [...new Set([...baseSuggestions, "End session and compile report"])].slice(0, 4)
      : baseSuggestions;

    return NextResponse.json({
      state: newState,
      ui: {
        rollResult,
        suggestedActions,
      },
    });
  } catch (error) {
    console.error("ACTION_ROUTE_ERROR:", error);
    return NextResponse.json({ error: "Failed to process game action" }, { status: 500 });
  }
}
