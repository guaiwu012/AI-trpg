import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { GameMode, GameState, Role, ScenarioId, SceneId } from "@/types/game";

type StartRequestBody = {
  role?: Role;
  scenario?: ScenarioId;
  gameMode?: GameMode;
  maxDanger?: number;
  name?: string;
};

function sanitizeName(name?: string) {
  const cleaned = (name || "").trim().replace(/\s+/g, " ");
  return cleaned.slice(0, 24);
}

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

function sanitizeGameMode(gameMode?: GameMode): GameMode {
  return gameMode === "long" ? "long" : "short";
}

function sanitizeMaxDanger(gameMode: GameMode, value?: number) {
  if (value === 5 || value === 10 || value === 15) {
    return value;
  }
  return gameMode === "long" ? 15 : 10;
}

function createCharacter(role: Role, name?: string) {
  if (role === "detective") {
    return {
      role,
      name: name || "Detective",
      hp: 10,
      observation: 3,
      persuasion: 1,
      willpower: 2,
      inventory: ["Flashlight", "Case Notebook"],
    };
  }

  if (role === "hacker") {
    return {
      role,
      name: name || "Hacker",
      hp: 9,
      observation: 2,
      persuasion: 1,
      willpower: 3,
      inventory: ["Phone Light", "Signal Interceptor"],
    };
  }

  return {
    role,
    name: name || "Priest",
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
    intro: Record<GameMode, string>;
  }
> = {
  basement_case: {
    world: "St. Alden Residential Academy",
    startScene: "gate",
    intro: {
      short:
        "Years after the St. Alden fire, an explorer team uploaded footage of a hidden underground treatment room. Their video shows a damaged Student Wellness Center sign, restraint beds, and the Helix logo. You arrive at the ruined main entrance because one thing in the footage feels impossible to ignore: this place already feels familiar.",
      long:
        "Years after the St. Alden fire, an explorer team uploaded longer footage from a hidden underground treatment room. Alongside the damaged Student Wellness Center sign and Helix logo, there are freeze-frames of altered class photos, route markings, and one corridor that makes your pulse spike before you even know why. You arrive at the ruined main entrance knowing this will not be a quick sweep. To get the truth out, you will need to rebuild the hidden route step by step.",
    },
  },
  infirmary_case: {
    world: "St. Alden Residential Academy",
    startScene: "courtyard",
    intro: {
      short:
        "The reopened St. Alden case has led you to the outer edge of Student Wellness Center. Explorer rope marks still hang from a broken window, and a faded treatment slogan peels off the wall. Somewhere inside, Nina and Lucas left traces for whoever came back to finish what they could not.",
      long:
        "The reopened St. Alden case has led you to the outer edge of Student Wellness Center. Explorer rope marks still hang from a broken window, and the treatment slogans on the wall peel away to reveal older room numbers underneath. The footage, the reopened case file, and a pressure in your own memory all point here. This run will take patience: Nina’s marks, Helix’s paperwork, and your own missing history will have to be reassembled in separate layers.",
    },
  },
};

export async function POST(req: Request) {
  const body = (await req.json()) as StartRequestBody;

  const role = sanitizeRole(body.role);
  const scenario = sanitizeScenario(body.scenario);
  const gameMode = sanitizeGameMode(body.gameMode);
  const maxDanger = sanitizeMaxDanger(gameMode, body.maxDanger);
  const safeName = sanitizeName(body.name);
  const config = scenarioConfig[scenario];

  const state: GameState = {
    sessionId: randomUUID(),
    world: config.world,
    scenario,
    gameMode,
    currentScene: config.startScene,
    character: createCharacter(role, safeName),
    flags: {},
    log: [
      {
        role: "narrator",
        text: config.intro[gameMode],
      },
    ],
    isFinished: false,
    turnCount: 0,
    danger: 0,
    maxDanger,
  };

  return NextResponse.json(state);
}
