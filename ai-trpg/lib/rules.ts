import {
  ActionCheck,
  Character,
  DiceResult,
  GameState,
  SceneId,
  Skill,
} from "@/types/game";
import { rollD20 } from "./dice";

const skillKeywords: Record<Skill, string[]> = {
  observation: [
    "look",
    "investigate",
    "inspect",
    "search",
    "observe",
    "check",
    "listen",
    "read",
    "观察",
    "检查",
    "调查",
    "搜查",
    "寻找",
    "查看",
    "倾听",
    "阅读",
  ],
  persuasion: [
    "ask",
    "talk",
    "speak",
    "persuade",
    "convince",
    "call",
    "shout",
    "说服",
    "交涉",
    "询问",
    "搭话",
    "呼喊",
    "交谈",
  ],
  willpower: [
    "resist",
    "endure",
    "pray",
    "stay calm",
    "push through",
    "抵抗",
    "坚持",
    "祈祷",
    "冷静",
    "硬撑",
  ],
};

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function addUniqueItem(items: string[], item: string) {
  return items.includes(item) ? items : [...items, item];
}

export function analyzeAction(action: string, scene: SceneId): ActionCheck {
  const text = action.toLowerCase();

  if (includesAny(text, skillKeywords.observation)) {
    return {
      requiresRoll: true,
      skill: "observation",
      reason: `Observation check in ${scene}`,
    };
  }

  if (includesAny(text, skillKeywords.persuasion)) {
    return {
      requiresRoll: true,
      skill: "persuasion",
      reason: `Persuasion check in ${scene}`,
    };
  }

  if (includesAny(text, skillKeywords.willpower)) {
    return {
      requiresRoll: true,
      skill: "willpower",
      reason: `Willpower check in ${scene}`,
    };
  }

  return {
    requiresRoll: false,
  };
}

export function resolveAction(
  character: Character,
  action: string,
  scene: SceneId
): DiceResult | null {
  const check = analyzeAction(action, scene);

  if (!check.requiresRoll || !check.skill) {
    return null;
  }

  const modifier = character[check.skill];
  return rollD20(modifier);
}

export function canEndSession(state: GameState) {
  return Boolean(
    state.isFinished ||
      state.flags.truth_found ||
      state.flags.hp_depleted ||
      state.flags.overwhelmed ||
      state.character.inventory.includes("Evidence Folder")
  );
}

function applyFailurePenalty(
  nextState: GameState,
  rollResult: DiceResult | null,
  scene: SceneId
) {
  if (!rollResult || rollResult.outcome !== "fail") {
    return "";
  }

  nextState.danger = Math.min(nextState.maxDanger, nextState.danger + 1);

  let note = "The failed attempt raises the danger level.";

  if (scene === "basement") {
    nextState.character.hp = Math.max(0, nextState.character.hp - 1);
    note += " The basement takes a toll on the player, costing 1 HP.";
  }

  if (nextState.character.hp <= 0) {
    nextState.isFinished = true;
    nextState.flags.hp_depleted = true;
    note += " The player can no longer continue.";
  }

  if (nextState.danger >= nextState.maxDanger) {
    nextState.isFinished = true;
    nextState.flags.overwhelmed = true;
    note += " The situation spins out of control.";
  }

  return note;
}

export function applyGameLogic(
  state: GameState,
  action: string,
  rollResult: DiceResult | null
) {
  const text = action.toLowerCase();

  const nextState: GameState = {
    ...state,
    flags: { ...state.flags },
    character: {
      ...state.character,
      inventory: [...state.character.inventory],
    },
  };

  nextState.turnCount += 1;

  let logicNote = "";
  const success = rollResult ? rollResult.outcome !== "fail" : true;

  const failureNote = applyFailurePenalty(
    nextState,
    rollResult,
    state.currentScene
  );

  if (state.currentScene === "gate") {
    if (
      includesAny(text, [
        "look",
        "investigate",
        "inspect",
        "search",
        "观察",
        "检查",
        "调查",
        "搜查",
      ]) &&
      success
    ) {
      nextState.flags.found_gate_clue = true;
      nextState.character.inventory = addUniqueItem(
        nextState.character.inventory,
        "Crumpled Map"
      );
      logicNote =
        "The player notices scratch marks near the side entrance and finds a crumpled map hidden under dead leaves.";
    }

    if (
      includesAny(text, [
        "open gate",
        "use key",
        "enter",
        "go inside",
        "push the door",
        "开门",
        "进去",
        "进入",
        "用钥匙",
      ])
    ) {
      const canEnter =
        nextState.character.inventory.includes("Old Key") ||
        nextState.flags.found_gate_clue;

      if (canEnter) {
        nextState.currentScene = "hallway";
        logicNote =
          "The side entrance opens with a heavy click, and the player steps into a dark hallway.";
      } else {
        logicNote =
          "The entrance does not open. The player may need to inspect the area first.";
      }
    }
  }

  if (state.currentScene === "hallway") {
    if (
      includesAny(text, [
        "look",
        "investigate",
        "inspect",
        "search",
        "listen",
        "观察",
        "检查",
        "调查",
        "搜查",
        "倾听",
      ]) &&
      success
    ) {
      nextState.flags.archive_hint = true;
      logicNote =
        "A faint draft slips through a cracked archive door. A metal sign points deeper into the building.";
    }

    if (
      includesAny(text, [
        "ask",
        "talk",
        "speak",
        "call",
        "shout",
        "询问",
        "搭话",
        "呼喊",
        "交谈",
      ]) &&
      success
    ) {
      nextState.flags.archive_unlocked = true;
      logicNote =
        "A nervous caretaker answers from the shadows and reveals that the archive room was left unlocked.";
    }

    if (
      includesAny(text, [
        "go to archive",
        "open archive",
        "enter archive",
        "去档案室",
        "打开档案室",
        "进入档案室",
      ])
    ) {
      if (nextState.flags.archive_hint || nextState.flags.archive_unlocked) {
        nextState.currentScene = "archive";
        logicNote =
          "The player moves into the archive room, where rows of dusty cabinets stand under weak fluorescent light.";
      } else {
        logicNote =
          "The archive door is hard to identify in the dark. More investigation may help.";
      }
    }
  }

  if (state.currentScene === "archive") {
    if (
      includesAny(text, [
        "look",
        "investigate",
        "inspect",
        "search",
        "read",
        "观察",
        "检查",
        "调查",
        "搜查",
        "阅读",
      ]) &&
      success
    ) {
      nextState.flags.basement_unlocked = true;
      nextState.flags.evidence_found = true;
      nextState.character.inventory = addUniqueItem(
        nextState.character.inventory,
        "Evidence Folder"
      );
      nextState.character.inventory = addUniqueItem(
        nextState.character.inventory,
        "Basement Passcard"
      );
      logicNote =
        "Inside a damaged personnel file, the player finds a basement passcard and an evidence folder tied to the disappearance.";
    }

    if (
      includesAny(text, [
        "go basement",
        "descend",
        "go downstairs",
        "open basement",
        "去地下室",
        "下楼",
        "进入地下室",
      ])
    ) {
      if (nextState.flags.basement_unlocked) {
        nextState.currentScene = "basement";
        logicNote =
          "The elevator shudders downward. The basement is colder than expected, and the air smells metallic.";
      } else {
        logicNote =
          "The basement access remains locked. The archive may contain what you need.";
      }
    }

    if (
      includesAny(text, [
        "end session",
        "leave now",
        "escape with the evidence",
        "结束",
        "离开",
        "带着证据离开",
      ]) &&
      nextState.character.inventory.includes("Evidence Folder")
    ) {
      nextState.isFinished = true;
      nextState.flags.escaped_with_evidence = true;
      logicNote =
        "The player decides to end the investigation early and leave with the evidence folder.";
    }
  }

  if (state.currentScene === "basement") {
    if (
      includesAny(text, [
        "look",
        "investigate",
        "inspect",
        "search",
        "open file",
        "观察",
        "检查",
        "调查",
        "搜查",
        "打开文件",
      ]) &&
      success
    ) {
      nextState.isFinished = true;
      nextState.flags.truth_found = true;
      logicNote =
        "The player uncovers records proving the disappearance was covered up by the school administration.";
    }

    if (
      includesAny(text, [
        "resist",
        "pray",
        "stay calm",
        "抵抗",
        "祈祷",
        "冷静",
      ]) &&
      success
    ) {
      nextState.isFinished = true;
      nextState.flags.truth_found = true;
      logicNote =
        "The player steadies their nerves, follows the whispers, and reaches the hidden evidence room in the basement.";
    }
  }

  if (failureNote) {
    logicNote = logicNote ? `${logicNote} ${failureNote}` : failureNote;
  }

  return {
    state: nextState,
    logicNote,
  };
}
