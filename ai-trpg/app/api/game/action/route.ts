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

function getSceneSuggestions(state: GameState) {
  if (state.scenario === "basement_case") {
    switch (state.currentScene) {
      case "gate":
        return [
          "Inspect the side entrance",
          "Check what route the map implies",
          "Try to get inside",
        ];
      case "hallway":
        return [
          "Search the corridor for archive signs",
          "Ask who used the archive at night",
          "Follow the marked door deeper inside",
        ];
      case "archive":
        if (!state.flags.evidence_folder_found) {
          return [
            "Search the cabinets for the missing file",
            "Open the damaged personnel folders",
            "Inspect access notes near the elevator",
          ];
        }
        if (!state.flags.basement_transfer_route_found) {
          return [
            "Cross-check the archive pages for transfer patterns",
            "Trace how records connect to the service lift",
            "Look for the route that links infirmary and basement",
          ];
        }
        return [
          "Descend to the basement",
          "Leave now with the archive evidence",
          "Review the transfer route one more time",
        ];
      case "basement": {
        const suggestions: string[] = [];
        if (!state.flags.transfer_manifest_found) {
          suggestions.push("Inspect the freight manifest");
        }
        if (!state.flags.restraint_protocol_found) {
          suggestions.push("Search for restraint procedures");
        }
        if (!state.flags.partner_contract_found) {
          suggestions.push("Look for a partner contract");
        }
        if (!state.flags.parent_letter_found) {
          suggestions.push("Search for a family complaint letter");
        }
        if (!state.flags.ethics_memo_found) {
          suggestions.push("Look for an internal ethics or reputation memo");
        }
        if (basementClueCount(state) >= 3) {
          suggestions.push("Compare the basement records and reconstruct the full chain");
        }
        suggestions.push("Leave with the evidence");
        return suggestions.slice(0, 4);
      }
      default:
        return [
          "Look around carefully",
          "Keep moving forward",
          "Call out into the darkness",
        ];
    }
  }

  switch (state.currentScene) {
    case "courtyard":
      return [
        "Inspect the boarded window",
        "Check the clinic floor plan",
        "Push through the service entrance",
      ];
    case "clinic_hall":
      return [
        "Search the corridor for the infirmary door",
        "Ask about the night shift",
        "Move toward the marked infirmary room",
      ];
    case "infirmary":
      if (!state.flags.night_shift_log_found) {
        return [
          "Search the nurse's desk",
          "Read the medical records",
          "Look for the quarantine keycard",
        ];
      }
      if (!state.flags.infirmary_transfer_route_found) {
        return [
          "Cross-check the ward map and the ledger",
          "Trace how the infirmary prepared students for transfer",
          "Look for hidden movement routes",
        ];
      }
      return [
        "Go to the quarantine room",
        "Leave now with the medical evidence",
        "Review the transfer pattern before moving deeper",
      ];
    case "quarantine_room": {
      const suggestions: string[] = [];
      if (!state.flags.night_transfer_schedule_found) {
        suggestions.push("Look for a night transfer schedule");
      }
      if (!state.flags.sedation_protocol_found) {
        suggestions.push("Search for sedation instructions");
      }
      if (!state.flags.training_manual_found) {
        suggestions.push("Look for a staff training manual");
      }
      if (!state.flags.dosage_variance_found) {
        suggestions.push("Compare sealed dosage sheets");
      }
      if (!state.flags.incident_photo_found) {
        suggestions.push("Search for incident photos or hidden visual records");
      }
      if (infirmaryClueCount(state) >= 3) {
        suggestions.push("Compare the records and expose the full ward program");
      }
      suggestions.push("Escape with the records you have");
      return suggestions.slice(0, 4);
    }
    default:
      return [
        "Look around carefully",
        "Keep moving forward",
        "Call out into the darkness",
      ];
  }
}

function getScenarioLore(state: GameState) {
  if (state.scenario === "infirmary_case") {
    return `
Core hidden truth for Infirmary Night Shift:
- Students with panic attacks, self-harm signs, disciplinary labels, or reputational risk were reclassified as observation or quarantine cases.
- They were sedated, isolated, removed from public logs, and transferred before dawn to partner wards or off-book supervision.
- The hidden program was framed as resilience optimization, crisis control, and staff training, but in practice it became behavior control and coercive experimentation.
- The horror comes from rigid training, staffing pressure, liability fear, silence, and a culture that treated strict control as professionalism.
- If the truth is uncovered, explain cause, process, and result clearly:
  cause = institutional pressure, strict training, risk management logic;
  process = reclassification, sedation, isolation, transfer;
  result = students disappeared into a punitive medical system.
`;
  }

  return `
Core hidden truth for Basement Case File:
- Students marked unstable, disruptive, politically inconvenient, or reputationally risky were quietly relabeled in disciplinary paperwork.
- They were routed through infirmary observation, sedated when necessary, then moved by service elevator and after-hours transport to a private behavior lab.
- The hidden program measured obedience, stress tolerance, emotional suppression, and institutional compliance while being justified as safety, order, and campus stability.
- The adults involved rationalized the system through ranking pressure, school image, administrative fear, and the belief that discipline could solve instability.
- If the truth is uncovered, explain cause, process, and result clearly:
  cause = performance pressure, administrative fear, reputation management;
  process = file manipulation, sedation, hidden transfer, basement routing;
  result = students disappeared into a coercive behavior-control program.
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
- Do not invent dice results
- Do not change character stats
- Follow the dice result if given
- Follow the system update strictly
- If the system update says progress was made, make that progress obvious in the narration
- Build story logic with cause, process, and consequence
- Before the final truth is uncovered, reveal only what the current evidence and scene can support
- When the player already has partial evidence, let further exploration produce new corroborating details rather than repeating the same clue
- If the game is finished, give a clear ending beat, not a vague fade-out
- npcReply can be an empty string if no NPC is speaking
- suggestedActions should contain 3 short action options unless the game is finished
- If can end session now is yes and the game is not finished, one suggested action can be about ending the session and compiling a report
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
- outcome should be truth_found if the truth was uncovered
- outcome should be extracted if the player left early with useful evidence
- outcome should be overwhelmed if danger forced the player out or the final push failed without enough evidence
- storySummary should be around 140 to 220 words
- storySummary must include concrete cause, process, and result
- If supported by the story log, explain how students were transferred
- If supported by the story log, explain what the hidden program was doing
- If supported by the story log, include at least two corroborating details, not just one main reveal
- End with 1 to 2 sentences of reflection about a real institutional problem the story points toward
- keyFindings should be concise, concrete, and specific
`;
}

function getFallbackSummary(state: GameState): SessionSummary {
  if (state.flags.truth_found) {
    if (state.scenario === "infirmary_case") {
      return {
        title: "The Ward Was Not for Healing",
        outcome: "truth_found",
        storySummary:
          "The investigation reached the quarantine room and uncovered the full logic of the infirmary system. Students marked as panicked, noncompliant, self-harming, or reputationally risky were first logged as ordinary cases, then reclassified into restricted observation. Night schedules, dosage sheets, staff manuals, and incident records show they were sedated, isolated, and transferred before dawn into partner wards under off-book supervision. The so-called resilience program was less about treatment than about compliance, silence, and administrative risk control. What makes the case disturbing is not only the cruelty, but how ordinary it became inside a culture of rigid training, understaffing, and fear of liability. The ending points toward a real question: when institutions treat control as professionalism, how quickly can care become a tool of harm?",
        keyFindings: [
          "Students were reclassified, sedated, and transferred before dawn",
          "The ward ran a compliance-focused resilience program",
          "Staff pressure and institutional fear helped normalize abuse",
        ],
      };
    }

    return {
      title: "The Basement Took the Disappeared",
      outcome: "truth_found",
      storySummary:
        "The investigation uncovered a hidden disciplinary pipeline beneath the school. Students marked unstable, defiant, or dangerous to the school's reputation were quietly rewritten in the files, routed through infirmary observation, and transferred by service elevator into a private behavior lab. Freight manifests, restraint packets, partner contracts, family complaints, and internal memos show that the program measured obedience, stress tolerance, and emotional suppression while being framed as safety and institutional order. The horror lies not only in the transport itself, but in how procedure made it appear lawful. Rankings, school image, and fear of disorder became excuses for reducing students to manageable cases. The case raises a broader issue that feels uncomfortably real: how often do systems call violence necessary once it can be filed, scored, and justified as protection?",
        keyFindings: [
          "Files were altered before students disappeared",
          "A basement transfer route linked infirmary intake to private detention",
          "The hidden program studied obedience under institutional pressure",
        ],
      };
    }

  if (state.flags.overwhelmed || state.flags.hp_depleted) {
    if (state.scenario === "infirmary_case") {
      return {
        title: "Fragments from the Night Shift",
        outcome: "overwhelmed",
        storySummary:
          "The player did not get every sealed record out of the infirmary wing, but the surviving evidence still sketches the system's shape. Public charts and hidden logs did not match. Students were logged one way for display and another way for transfer. Night schedules, dosage discrepancies, or training material suggest the quarantine process mixed sedation, restraint, and selective disappearance under medical language. Even without the final proof, the ward no longer reads like a place of treatment. It reads like a machine built under training pressure and administrative fear, where overwork and obedience turned care into confinement.",
        keyFindings: [
          "Public case logs and hidden records did not match",
          "The infirmary used controlled night transfers",
          "The full protocol was not recovered before collapse",
        ],
      };
    }

    return {
      title: "The Paper Trail Broke Underground",
      outcome: "overwhelmed",
      storySummary:
        "The player was forced out before every basement record could be secured, but the pattern is still visible. Disciplinary files were rewritten, students were routed away from public oversight, and the basement served as the quiet hinge between school administration and off-book transfer. Even partial supporting records suggest disappearance here was procedural rather than accidental. That is the unsettling part: the system did not need open chaos to harm people. It needed paperwork, pressure, and adults willing to treat reputation as more urgent than care.",
        keyFindings: [
          "Disciplinary paperwork was part of the concealment",
          "The basement connected the school to hidden transfers",
          "The final proof remained sealed when the retreat began",
        ],
      };
    }

  if (state.scenario === "infirmary_case") {
    return {
      title: "The Ledger Left the Ward",
      outcome: "extracted",
      storySummary:
        "The player left the infirmary wing with enough evidence to reconstruct a partial truth. The ledger and supporting records show that students did not simply vanish after treatment. They were reclassified, isolated, and prepared for transfer through a restricted medical route. Even without opening every sealed file, the story already points to a system where administrative risk, rigid training, and the demand for orderly care fused into coercive practice. The case remains unfinished, but it leaves behind a difficult real-world question: when care workers are pressured to prioritize control, what forms of quiet violence become thinkable?",
      keyFindings: [
        "The ledger proved hidden reclassification of students",
        "Night-shift procedures prepared selected cases for transfer",
        "The ward's violence was systemic rather than accidental",
      ],
    };
  }

  return {
    title: "The Folder Came Up from the Archive",
    outcome: "extracted",
    storySummary:
      "The player withdrew with enough evidence to show that the disappearance was not random. The archive folder and transfer materials suggest a managed route from school discipline to basement handling, with records altered before students left public view. The full program remained partially hidden, but the pattern is already clear: institutional fear and performance pressure were turned into procedure, and procedure became cover for harm. The case does not end with total proof, yet it still leaves a sharp question behind: what kinds of abuse become normal once a system learns to call them necessary for order?",
    keyFindings: [
      "Archive files documented a hidden transfer pipeline",
      "Students were administratively erased before movement",
      "The school used procedure to normalize coercion",
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
      return NextResponse.json(
        { error: "Missing DEEPSEEK_API_KEY" },
        { status: 500 }
      );
    }

    const { state, action, phase = "resolve", rollResult }: ActionRequest = await req.json();

    if (phase === "preview") {
      const check = analyzeAction(action, state.currentScene);

      if (!check.requiresRoll || !check.skill) {
        return NextResponse.json({
          requiresRoll: false,
        });
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

    const finalRollResult =
      rollResult ??
      resolveAction(state.character, action, state.currentScene);

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
          content: buildNarrationPrompt(
            logic.state,
            action,
            finalRollResult,
            logic.logicNote
          ),
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
        narration: "The silence thickens, but the route ahead becomes morally clearer as the case takes shape.",
        npcReply: "",
        suggestedActions: getSceneSuggestions(logic.state),
      };
    }

    const rollSystemMessage = buildRollSystemMessage(
      action,
      logic.state,
      finalRollResult
    );

    const newState: GameState = {
      ...logic.state,
      lastRoll: finalRollResult ?? undefined,
      log: [
        ...logic.state.log,
        { role: "player", text: action },
        ...(rollSystemMessage ? [rollSystemMessage] : []),
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
    return NextResponse.json(
      { error: "Failed to process game action" },
      { status: 500 }
    );
  }
}
