import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { GameState, Role, ScenarioId, SceneId } from "@/types/game";

type StartRequestBody = {
  role?: Role;
  scenario?: ScenarioId;
  maxDanger?: number;
};

function createCharacter(role: Role) {
  if (role === "detective") {
    return {
      role,
      name: "Investigator",
      hp: 10,
      observation: 3,
      persuasion: 1,
      willpower: 2,
      inventory: ["Flashlight", "Old Key"],
    };
  }

  if (role === "hacker") {
    return {
      role,
      name: "Hacker",
      hp: 9,
      observation: 2,
      persuasion: 1,
      willpower: 3,
      inventory: ["Phone Light", "Signal Scrambler"],
    };
  }

  return {
    role,
    name: "Priest",
    hp: 11,
    observation: 1,
    persuasion: 2,
    willpower: 4,
    inventory: ["Cross", "Prayer Book"],
  };
}

const scenarioConfig: Record<
  ScenarioId,
  {
    world: string;
    startScene: SceneId;
    intro: string;
  }
> = {
  basement_case: {
    world: "Basement Case File",
    startScene: "gate",
    intro:
      "Rain needles the abandoned school building. A message from an unknown sender claims the missing student's file was moved to the basement tonight.",
  },
  infirmary_case: {
    world: "Infirmary Night Shift",
    startScene: "courtyard",
    intro:
      "The old school infirmary should have been sealed years ago. Tonight, a voice note claims the nurse on duty kept records that explain why several students vanished from the attendance list.",
  },
};

function sanitizeRole(role?: Role): Role {
  if (role === "detective" || role === "hacker" || role === "priest") {
    return role;
  }
  return "detective";
}

function sanitizeScenario(scenario?: ScenarioId): ScenarioId {
  if (scenario === "basement_case" || scenario === "infirmary_case") {
    return scenario;
  }
  return "basement_case";
}

function sanitizeMaxDanger(value?: number) {
  return value === 5 || value === 10 || value === 15 ? value : 10;
}

export async function POST(req: Request) {
  const body = (await req.json()) as StartRequestBody;

  const role = sanitizeRole(body.role);
  const scenario = sanitizeScenario(body.scenario);
  const maxDanger = sanitizeMaxDanger(body.maxDanger);
  const config = scenarioConfig[scenario];

  const state: GameState = {
    sessionId: randomUUID(),
    world: config.world,
    scenario,
    currentScene: config.startScene,
    character: createCharacter(role),
    flags: {},
    log: [
      {
        role: "narrator",
        text: config.intro,
      },
    ],
    isFinished: false,
    turnCount: 0,
    danger: 0,
    maxDanger,
  };

  return NextResponse.json(state);
}
