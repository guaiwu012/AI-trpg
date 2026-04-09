import { NextResponse } from "next/server";
import {
  analyzeAction,
  applyGameLogic,
  canEndSession,
  resolveAction,
} from "@/lib/rules";
import { ai } from "@/lib/ai";
import { DiceResult, GameState, SessionSummary } from "@/types/game";

type ActionRequest = {
  state: GameState;
  action: string;
  phase?: "preview" | "resolve";
  rollResult?: DiceResult | null;
};

function basementClueCount(state: GameState) {
  return [
    "transfer_manifest_found",
    "restraint_protocol_found",
    "partner_contract_found",
    "parent_letter_found",
    "ethics_memo_found",
  ].filter((flag) => state.flags[flag]).length;
}

function infirmaryClueCount(state: GameState) {
  return [
    "night_transfer_schedule_found",
    "sedation_protocol_found",
    "training_manual_found",
    "dosage_variance_found",
    "incident_photo_found",
  ].filter((flag) => state.flags[flag]).length;
}

function isLongMode(state: GameState) {
  return state.gameMode === "long";
}

function getSceneSuggestions(state: GameState) {
  if (state.scenario === "basement_case") {
    switch (state.currentScene) {
      case "gate":
        return isLongMode(state)
          ? [
              "Inspect the explorer phone footage near the gate",
              "Study the burned entrance for Nina's mark",
              "Push inside the ruined school",
            ]
          : [
              "Inspect the explorer traces near the gate",
              "Study the burned entrance for Nina's mark",
              "Push inside the ruined school",
            ];
      case "hallway": {
        const suggestions = [
          "Search the corridor for Lucas's clue",
          "Check the altered class photos",
        ];
        if (isLongMode(state) && !state.flags.memory_trigger_found) {
          suggestions.push("Steady yourself and test the familiar memory");
        } else {
          suggestions.push("Move toward the archive");
        }
        return suggestions;
      }
      case "archive": {
        if (!state.flags.evidence_folder_found) {
          return [
            "Search the sealed drawers",
            "Inspect erased student files",
            "Look for Lucas's hidden route note",
          ];
        }
        if (!state.flags.basement_transfer_route_found) {
          return [
            "Compare the archive files and service map",
            "Trace the route into Student Wellness Center",
            "Look for the hidden wall behind the records",
          ];
        }
        if (isLongMode(state) && !state.flags.lucas_map_completed) {
          return [
            "Reassemble Lucas's map fragments",
            "Compare the erased names and route marks",
            "Look for the final 'Not treatment' note",
          ];
        }
        return [
          "Descend into the underground core",
          "Leave now with Lucas's dossier",
          "Review the transfer route one more time",
        ];
      }
      case "basement": {
        const suggestions: string[] = [];
        if (!state.flags.transfer_manifest_found) {
          suggestions.push("Look for Lucas's underground route fragment");
        }
        if (!state.flags.restraint_protocol_found) {
          suggestions.push("Search the treatment restraint protocol");
        }
        if (!state.flags.partner_contract_found) {
          suggestions.push("Look for the Helix contract");
        }
        if (!state.flags.parent_letter_found) {
          suggestions.push("Search for a parent's unanswered letter");
        }
        if (!state.flags.ethics_memo_found) {
          suggestions.push("Look for the fire cleanup memo");
        }
        if (isLongMode(state) && !state.flags.release_record_found) {
          suggestions.push("Look for the release approval file");
        }
        if (isLongMode(state) && state.flags.release_record_found && !state.flags.escape_log_found) {
          suggestions.push("Search Ethan's escape incident log");
        }
        if (
          basementClueCount(state) >= (isLongMode(state) ? 4 : 3) &&
          (!isLongMode(state) || (state.flags.release_record_found && state.flags.escape_log_found))
        ) {
          suggestions.push("Compare the files and check your release record");
        }
        suggestions.push("Leave with the evidence");
        return suggestions.slice(0, 4);
      }
      default:
        return ["Look around carefully", "Keep moving forward", "Call into the dark"];
    }
  }

  switch (state.currentScene) {
    case "courtyard":
      return isLongMode(state)
        ? [
            "Inspect the broken window and explorer footage",
            "Look for Nina's carved sign",
            "Enter the treatment wing",
          ]
        : [
            "Inspect the broken window and rope marks",
            "Look for Nina's carved sign",
            "Enter the treatment wing",
          ];
    case "clinic_hall": {
      const suggestions = [
        "Search the hall for altered room signs",
        "Listen for Nina's recording",
      ];
      if (isLongMode(state) && !state.flags.memory_trigger_found) {
        suggestions.push("Steady yourself and follow the familiar smell");
      } else {
        suggestions.push("Move toward the treatment rooms");
      }
      return suggestions;
    }
    case "infirmary":
      if (!state.flags.night_shift_log_found) {
        return [
          "Search the locked desk",
          "Read the treatment paperwork",
          "Look for the deeper-room keycard",
        ];
      }
      if (!state.flags.infirmary_transfer_route_found) {
        return [
          "Compare the ledger and room numbers",
          "Trace the route deeper inside",
          "Look for the hidden underground access",
        ];
      }
      if (isLongMode(state) && !state.flags.nina_mark_sequence_found) {
        return [
          "Reconstruct Nina's repeated marks",
          "Compare doorframe notches and chart edges",
          "Look for the full hidden sequence",
        ];
      }
      return [
        "Go to the hidden treatment core",
        "Leave now with Nina's ledger",
        "Review the route before moving deeper",
      ];
    case "quarantine_room": {
      const suggestions: string[] = [];
      if (!state.flags.night_transfer_schedule_found) {
        suggestions.push("Look for Nina's night log");
      }
      if (!state.flags.sedation_protocol_found) {
        suggestions.push("Search for the hormone dosing protocol");
      }
      if (!state.flags.training_manual_found) {
        suggestions.push("Look for Ethan's directive manual");
      }
      if (!state.flags.dosage_variance_found) {
        suggestions.push("Compare the stability rating sheets");
      }
      if (!state.flags.incident_photo_found) {
        suggestions.push("Search for the old sample photo");
      }
      if (isLongMode(state) && !state.flags.release_record_found) {
        suggestions.push("Look for the release approval file");
      }
      if (isLongMode(state) && state.flags.release_record_found && !state.flags.escape_log_found) {
        suggestions.push("Search Ethan's escape incident log");
      }
      if (
        infirmaryClueCount(state) >= (isLongMode(state) ? 4 : 3) &&
        (!isLongMode(state) || (state.flags.release_record_found && state.flags.escape_log_found))
      ) {
        suggestions.push("Compare the sample sheets and check the release record");
      }
      suggestions.push("Escape with the records you have");
      return suggestions.slice(0, 4);
    }
    default:
      return ["Look around carefully", "Keep moving forward", "Call into the dark"];
  }
}

function getScenarioLore(state: GameState) {
  if (state.scenario === "infirmary_case") {
    return `
Core hidden truth for the Wellness Center route:
- Student Wellness Center was presented as emotional support and recovery space, but in practice it filtered students into a hidden Helix hormone experiment.
- Nina noticed that students kept entering deeper rooms and never returning, so she left marks, repeated numbers, and frightened notes for anyone who might come later.
- Ethan ran the system through treatment language, isolation, and authority overrides.
- The player is not only an investigator. The player was once one of the rare successful samples marked for release and continued observation.
- Current pacing mode: ${state.gameMode}.
- In long mode, route reconstruction, memory pressure, and identity evidence should arrive in separate beats rather than collapsing into one reveal.
- If the truth is uncovered, explain cause, process, and result clearly:
  cause = institutional ambition, control, Helix partnership, fear of exposure;
  process = treatment intake, hormone intervention, sample scoring, record erasure, fire cleanup;
  result = missing students were turned into experimental data, and the player returns as living proof.
`;
  }

  return `
Core hidden truth for the main campus route:
- Students disappeared only after their names, files, and class evidence had already been altered in the school system.
- Lucas discovered the archive route, the hidden wall, and the underground treatment core before the fire, and left fragments behind.
- St. Alden worked with Helix Juvenile Development Institute to run an illegal hormone experiment on students, keeping successful samples and disposing of failures.
- Ethan believed one successful sample died during escape, but that subject is the player.
- Current pacing mode: ${state.gameMode}.
- In long mode, route reconstruction, memory pressure, and identity evidence should arrive in separate beats rather than collapsing into one reveal.
- If the truth is uncovered, explain cause, process, and result clearly:
  cause = institutional greed, sample research, reputational fear, and planned concealment;
  process = file rewriting, treatment transfer, underground testing, evidence purge, fire cleanup;
  result = the missing-student case becomes an erased experiment, and the player becomes the strongest surviving evidence.
`;
}

function buildNarrationPrompt(
  state: GameState,
  action: string,
  rollResult: DiceResult | null,
  logicNote: string
) {
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
Current mode: ${state.gameMode}
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
Unlocked flags: ${
    Object.keys(state.flags)
      .filter((key) => state.flags[key])
      .join(", ") || "none"
  }
Recent story log:
${state.log.slice(-8).map((m) => `${m.role}: ${m.text}`).join("\n")}
Player action: ${action}
Dice result: ${rollResult ? JSON.stringify(rollResult) : "none"}
System update: ${logicNote || "none"}

Scenario lore and thematic frame:
${getScenarioLore(state)}

Rules:
- Do not invent dice results.
- Do not change character stats.
- Follow the dice result if given.
- Follow the system update strictly.
- Make the place feel like a burned school and hidden treatment complex, not a generic haunted house.
- Use Lucas, Nina, Ethan, Student Wellness Center, and Helix only when the current evidence supports it.
- Before the final reveal, imply the player's familiarity through atmosphere and fragmentary memory, not through full exposition.
- If the final truth is uncovered, clearly state that the player was one of the rare successful samples.
- Build story logic with cause, process, and consequence.
- In long mode, do not compress multiple major evidence beats into one action. Let route reconstruction, corroboration, and identity evidence arrive separately.
- npcReply can be an empty string if no one is speaking.
- suggestedActions should contain 3 short action options unless the game is finished.
- If can end session now is yes and the game is not finished, one suggested action can be about ending the session and compiling a report.
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
Mode: ${state.gameMode}
Final scene: ${state.currentScene}
Turn count: ${state.turnCount}
Danger: ${state.danger}/${state.maxDanger}
Character: ${state.character.name} (${state.character.role})
Inventory: ${state.character.inventory.join(", ") || "none"}
Flags: ${
    Object.keys(state.flags)
      .filter((key) => state.flags[key])
      .join(", ") || "none"
  }
Story log:
${state.log.map((m) => `${m.role}: ${m.text}`).join("\n")}
Scenario lore and thematic frame:
${getScenarioLore(state)}
Rules:
- outcome should be truth_found if the truth was uncovered.
- outcome should be extracted if the player left early with useful evidence.
- outcome should be overwhelmed if danger forced the player out or the final push failed without enough proof.
- storySummary should be around 140 to 220 words.
- storySummary must include concrete cause, process, and result.
- If supported by the log, explain how St. Alden and Helix worked together.
- If supported by the log, include Nina or Lucas as corroborating witnesses.
- If supported by the log, explicitly mention that the player was one of the rare successful samples.
- End with 1 to 2 sentences of reflection about institutional abuse, datafication, or memory erasure.
- keyFindings should be concise, concrete, and specific.
`;
}

function getFallbackSummary(state: GameState): SessionSummary {
  if (state.flags.truth_found) {
    return {
      title: "The School Remembered You Back",
      outcome: "truth_found",
      storySummary:
        "The investigation proved that St. Alden Residential Academy was not only covering up missing students. It was working with Helix Juvenile Development Institute to run an illegal hormone experiment under the language of treatment and student support. Lucas's route fragments, Nina's hidden notes, and the surviving treatment records show a clear process: students were selected, dosed, evaluated for stability, and then either preserved as successful samples or erased as failures. The fire served as a final purge of evidence rather than a simple tragedy. The deepest records reveal the most personal truth of all: the player was once one of the rare successful samples marked for release and long-term observation, and Ethan believed that subject died during escape. What returns to the school is not just an investigator but living proof that the system worked and failed at once. The case points to a broader problem beyond horror fiction: institutions can hide extraordinary violence inside paperwork, treatment language, and controlled memory.",
      keyFindings: [
        "St. Alden and Helix used students as hormone experiment samples",
        "Lucas and Nina left independent traces that corroborated the cover-up",
        "The player was identified as a surviving successful sample",
      ],
    };
  }

  if (state.flags.overwhelmed || state.flags.hp_depleted) {
    return {
      title: "Fragments Beneath St. Alden",
      outcome: "overwhelmed",
      storySummary:
        "The player did not leave St. Alden with the full final chain, but the surviving evidence still sketches the structure of the crime. Erased student files, treatment records, and underground sample traces show that the school was hiding something much larger than a few unexplained disappearances. Lucas had already begun mapping the hidden route, and Nina had already started leaving warnings that students entered deeper rooms and failed to return. Even without the final terminal or release record, the pattern is visible: treatment language was used to sort, control, and erase students in cooperation with Helix. The school fire now reads less like isolated disaster and more like a coordinated cleanup. The unfinished ending still leaves a sharp institutional question behind: once a system learns to call abuse therapy and erasure administration, how much proof is required before anyone believes the missing were deliberately made to vanish?",
      keyFindings: [
        "Student records were altered before or after disappearance",
        "Independent traces from Lucas and Nina point to the same hidden system",
        "The final proof remained sealed when the run collapsed",
      ],
    };
  }

  return {
    title: "Evidence Carried Out of the Fire",
    outcome: "extracted",
    storySummary:
      "The player withdrew from St. Alden before forcing the final reveal, but not empty-handed. The recovered dossier or ledger shows that the missing-student case was structured rather than random: names were revised, treatment routes were hidden, and deeper access depended on keycards, marks, and after-hours handling. Lucas and Nina's traces make the same point from different edges of the system. One was a student who kept noticing that the numbers no longer matched reality. The other was a frightened insider who could not say everything aloud but still tried to leave a path. The final shape of the Helix experiment remains partially buried, yet the evidence already suggests the fire served the purpose of concealment as much as destruction. The ending points toward a real institutional danger: once vulnerable people become data points inside a protected system, the line between care, control, and disposal can collapse with terrifying ease.",
    keyFindings: [
      "The school concealed a structured route behind missing students",
      "Lucas and Nina independently documented the same hidden pattern",
      "The fire appears tied to evidence destruction, not only catastrophe",
    ],
  };
}

function buildRollSystemMessage(action: string, state: GameState, rollResult: DiceResult | null) {
  if (!rollResult) return null;

  const check = analyzeAction(action, state.currentScene);
  const skillLabel = check.skill
    ? check.skill.charAt(0).toUpperCase() + check.skill.slice(1)
    : "Check";

  return {
    role: "system" as const,
    text: `Check triggered: ${skillLabel}. ${rollResult.raw}${rollResult.modifier >= 0 ? ` + ${rollResult.modifier}` : ` - ${Math.abs(rollResult.modifier)}`} = ${rollResult.total} → ${rollResult.outcome}.`,
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
    temperature: 0.65,
    max_tokens: 800,
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

    const { state, action, phase = "resolve", rollResult }: ActionRequest = await req.json();

    if (phase === "preview") {
      const check = analyzeAction(action, state.currentScene);

      if (!check.requiresRoll || !check.skill) {
        return NextResponse.json({ requiresRoll: false });
      }

      const previewRoll = resolveAction(state.character, action, state.currentScene);

      return NextResponse.json({
        requiresRoll: true,
        check: {
          skill: check.skill,
          reason: check.reason || `${check.skill} check`,
          modifier: state.character[check.skill],
          expression:
            previewRoll?.expression ||
            `1d20 ${state.character[check.skill] >= 0 ? "+" : "-"} ${Math.abs(state.character[check.skill])}`,
        },
        rollResult: previewRoll,
      });
    }

    const finalRollResult = rollResult ?? resolveAction(state.character, action, state.currentScene);
    const logic = applyGameLogic(state, action, finalRollResult);

    const completion = await ai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are a structured game master for a web-based text RPG. Output valid JSON only.",
        },
        {
          role: "user",
          content: buildNarrationPrompt(logic.state, action, finalRollResult, logic.logicNote),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.82,
      max_tokens: 700,
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
        narration:
          "The school yields another fragment, and the shape of the case becomes harder to deny.",
        npcReply: "",
        suggestedActions: getSceneSuggestions(logic.state),
      };
    }

    const rollSystemMessage = buildRollSystemMessage(action, logic.state, finalRollResult);

    const newState: GameState = {
      ...logic.state,
      lastRoll: finalRollResult ?? undefined,
      log: [
        ...logic.state.log,
        { role: "player", text: action },
        ...(rollSystemMessage ? [rollSystemMessage] : []),
        { role: "narrator", text: parsed.narration || "" },
        ...(parsed.npcReply ? ([{ role: "npc", text: parsed.npcReply }] as const) : []),
      ],
    };

    if (newState.isFinished) {
      newState.summary = await generateSummary(newState);
    }

    const baseSuggestions = newState.isFinished ? [] : parsed.suggestedActions || [];
    const sceneSuggestions = newState.isFinished ? [] : getSceneSuggestions(newState);
    const canExtractNow = !newState.isFinished && canEndSession(newState);

    const suggestedActions = [
      ...baseSuggestions,
      ...sceneSuggestions,
      ...(canExtractNow ? ["End session and compile report"] : []),
    ]
      .filter(Boolean)
      .filter((item, index, arr) => arr.indexOf(item) === index)
      .slice(0, 4);

    return NextResponse.json({
      state: newState,
      ui: {
        rollResult: finalRollResult,
        suggestedActions,
      },
    });
  } catch (error) {
    console.error("ACTION_ROUTE_ERROR:", error);
    return NextResponse.json({ error: "Failed to process game action" }, { status: 500 });
  }
}
