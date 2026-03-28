import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { GameState, Role } from "@/types/game";

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

export async function POST(req: Request) {
  const body = await req.json();
  const role = body.role as Role;

  const state: GameState = {
    sessionId: randomUUID(),
    world: "Basement Case File",
    currentScene: "gate",
    character: createCharacter(role),
    flags: {},
    log: [
      {
        role: "narrator",
        text: "Rain needles the abandoned school building. A message from an unknown sender claims the missing student's file was moved to the basement tonight.",
      },
    ],
    isFinished: false,
    turnCount: 0,
    danger: 0,
    maxDanger: 10,
  };

  return NextResponse.json(state);
}
