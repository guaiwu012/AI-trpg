import {
  ActionCheck,
  Character,
  DiceResult,
  GameState,
  SceneId,
} from "@/types/game";
import { rollD20 } from "./dice";

const skillKeywords: Record<"observation" | "persuasion" | "willpower", string[]> = {
  observation: [
    "look",
    "investigate",
    "inspect",
    "search",
    "observe",
    "check",
    "listen",
    "read",
    "scan",
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
    "询问",
    "搭话",
    "说服",
    "交涉",
    "呼喊",
    "交谈",
  ],
  willpower: [
    "resist",
    "endure",
    "pray",
    "stay calm",
    "push through",
    "steady",
    "抵抗",
    "坚持",
    "祈祷",
    "冷静",
    "硬撑",
    "镇定",
  ],
};

const hardPushKeywords = [
  "push through",
  "force it",
  "force open",
  "take the hit",
  "through the pain",
  "ignore the pain",
  "ignore the wound",
  "with my bare hands",
  "hard push",
  "硬撑",
  "强行",
  "拼着受伤",
  "冒着受伤",
  "忍痛",
  "顶着疼",
  "徒手",
];

const hpTradeKeywords: Partial<Record<SceneId, string[]>> = {
  archive: [
    "force open cabinet",
    "pry open cabinet",
    "pry open drawer",
    "tear open drawer",
    "bare hands",
    "rip open the file cabinet",
    "强行拉开柜子",
    "撬开抽屉",
    "撬开柜门",
    "徒手拉开",
    "扯开柜子",
  ],
  clinic_hall: [
    "push through broken glass",
    "walk through glass",
    "cross the broken glass",
    "crawl through debris",
    "step through the shards",
    "穿过碎玻璃",
    "踩过玻璃",
    "顶着碎片过去",
    "硬闯走廊",
  ],
  infirmary: [
    "force open desk",
    "force open drawer",
    "rip open the drawer",
    "break open the desk",
    "tear open the nurse desk",
    "强行拉开抽屉",
    "撬开桌子",
    "撬开医务室抽屉",
    "砸开桌柜",
  ],
  basement: [
    "push through the pain",
    "follow the whispering trail",
    "force the hidden door",
    "crawl through the broken pipe",
    "ignore the blood",
    "忍痛前进",
    "顺着低语走",
    "强行推开暗门",
    "钻过破裂管道",
  ],
  quarantine_room: [
    "pull the sealed records free",
    "stay in the room despite the pain",
    "force open the sealed cabinet",
    "tear the records free",
    "硬撑着把记录拽出来",
    "强行打开密封柜",
    "忍痛留在房间里",
    "把封存记录拽出来",
  ],
};

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function addUniqueItem(items: string[], item: string) {
  return items.includes(item) ? items : [...items, item];
}

function hasEvidence(state: GameState) {
  return (
    state.flags.evidence_found ||
    state.flags.evidence_folder_found ||
    state.flags.night_shift_log_found ||
    state.character.inventory.includes("Evidence Folder") ||
    state.character.inventory.includes("Medical Ledger")
  );
}

function spendHp(nextState: GameState, amount: number) {
  nextState.character.hp = Math.max(0, nextState.character.hp - amount);

  if (nextState.character.hp <= 0) {
    nextState.isFinished = true;
    nextState.flags.hp_depleted = true;
  }
}

function applyHpTradeoff(nextState: GameState, text: string) {
  const sceneKeywords = hpTradeKeywords[nextState.currentScene];

  if (!sceneKeywords || !includesAny(text, sceneKeywords)) {
    return "";
  }

  if (nextState.currentScene === "archive" && !nextState.flags.evidence_found) {
    spendHp(nextState, 1);
    nextState.flags.basement_unlocked = true;
    nextState.flags.evidence_found = true;
    nextState.flags.evidence_folder_found = true;
    nextState.character.inventory = addUniqueItem(
      nextState.character.inventory,
      "Evidence Folder"
    );
    nextState.character.inventory = addUniqueItem(
      nextState.character.inventory,
      "Basement Passcard"
    );

    return "The player forces open the jammed archive cabinet with bare hands, slicing skin on rusted metal. It costs 1 HP, but an evidence folder and a basement passcard drop into reach.";
  }

  if (
    nextState.currentScene === "clinic_hall" &&
    !nextState.flags.infirmary_hint &&
    !nextState.flags.infirmary_unlocked
  ) {
    spendHp(nextState, 1);
    nextState.flags.infirmary_hint = true;

    return "The player pushes through broken glass and scattered debris in the clinic hall. It costs 1 HP, but the blood trail reveals which door leads to the infirmary.";
  }

  if (
    nextState.currentScene === "infirmary" &&
    !nextState.flags.quarantine_unlocked
  ) {
    spendHp(nextState, 1);
    nextState.flags.quarantine_unlocked = true;
    nextState.flags.evidence_found = true;
    nextState.flags.night_shift_log_found = true;
    nextState.character.inventory = addUniqueItem(
      nextState.character.inventory,
      "Medical Ledger"
    );
    nextState.character.inventory = addUniqueItem(
      nextState.character.inventory,
      "Quarantine Keycard"
    );

    return "The player forces the nurse's drawer open with raw strength. It costs 1 HP, but a medical ledger and a quarantine keycard are pulled free.";
  }

  if (
    nextState.currentScene === "basement" &&
    !nextState.flags.truth_found
  ) {
    spendHp(nextState, 1);
    nextState.isFinished = true;
    nextState.flags.truth_found = true;

    return "The player pushes through the pain and follows the whispering trail into a hidden recess. It costs 1 HP, but the final basement records are recovered.";
  }

  if (
    nextState.currentScene === "quarantine_room" &&
    !nextState.flags.truth_found
  ) {
    spendHp(nextState, 2);
    nextState.isFinished = true;
    nextState.flags.truth_found = true;

    return "The player stays in the quarantine room long enough to wrench the sealed records free. It costs 2 HP, but the concealed treatment files are finally exposed.";
  }

  return "";
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

  return { requiresRoll: false };
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
      hasEvidence(state)
  );
}

function applyFailurePenalty(
  nextState: GameState,
  rollResult: DiceResult | null,
  scene: SceneId,
  text: string
) {
  if (!rollResult || rollResult.outcome !== "fail") {
    return "";
  }

  if (includesAny(text, hardPushKeywords)) {
    spendHp(nextState, 1);

    let note =
      "The attempt still goes badly, but the player forces it through with their body instead of backing off. 1 HP is lost instead of raising danger.";

    if (nextState.character.hp <= 0) {
      note += " The player collapses after the effort.";
    }

    return note;
  }

  nextState.danger = Math.min(nextState.maxDanger, nextState.danger + 1);

  let note = "The failed attempt raises the danger level.";

  if (scene === "basement" || scene === "quarantine_room") {
    spendHp(nextState, 1);
    note += " The hostile environment costs 1 HP.";
  }

  if (nextState.character.hp <= 0) {
    note += " The player can no longer continue.";
  }

  if (nextState.danger >= nextState.maxDanger) {
    nextState.isFinished = true;
    nextState.flags.overwhelmed = true;
    note += " The situation spins out of control.";
  }

  return note;
}

function applyBasementScenario(
  nextState: GameState,
  text: string,
  success: boolean
) {
  let logicNote = "";

  if (nextState.currentScene === "gate") {
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
      ]) && success
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

  if (nextState.currentScene === "hallway") {
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
      ]) && success
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
      ]) && success
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

  if (nextState.currentScene === "archive") {
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
      ]) && success
    ) {
      nextState.flags.basement_unlocked = true;
      nextState.flags.evidence_found = true;
      nextState.flags.evidence_folder_found = true;
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
      ]) && hasEvidence(nextState)
    ) {
      nextState.isFinished = true;
      nextState.flags.escaped_with_evidence = true;
      nextState.flags.extracted_alive = true;
      logicNote =
        "The player decides to end the investigation early and leave with the evidence folder.";
    }
  }

  if (nextState.currentScene === "basement") {
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
      ]) && success
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
      ]) && success
    ) {
      nextState.isFinished = true;
      nextState.flags.truth_found = true;
      logicNote =
        "The player steadies their nerves, follows the whispers, and reaches the hidden evidence room in the basement.";
    }

    if (
      includesAny(text, [
        "end session",
        "leave now",
        "escape with the evidence",
        "结束",
        "离开",
        "带着证据离开",
      ]) && hasEvidence(nextState)
    ) {
      nextState.isFinished = true;
      nextState.flags.escaped_with_evidence = true;
      nextState.flags.extracted_alive = true;
      logicNote =
        "The player retreats from the basement with enough evidence to file a report.";
    }
  }

  return logicNote;
}

function applyInfirmaryScenario(
  nextState: GameState,
  text: string,
  success: boolean
) {
  let logicNote = "";

  if (nextState.currentScene === "courtyard") {
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
      ]) && success
    ) {
      nextState.flags.found_courtyard_clue = true;
      nextState.character.inventory = addUniqueItem(
        nextState.character.inventory,
        "Clinic Floor Plan"
      );
      logicNote =
        "Near the boarded window, the player finds a faded floor plan showing a back entrance to the infirmary wing.";
    }

    if (
      includesAny(text, [
        "open door",
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
        nextState.flags.found_courtyard_clue;

      if (canEnter) {
        nextState.currentScene = "clinic_hall";
        logicNote =
          "The warped service door gives way, revealing a narrow corridor lined with cracked medicine cabinets.";
      } else {
        logicNote =
          "The infirmary entrance stays sealed. A closer look around the courtyard may reveal another way in.";
      }
    }
  }

  if (nextState.currentScene === "clinic_hall") {
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
      ]) && success
    ) {
      nextState.flags.infirmary_hint = true;
      logicNote =
        "A dim emergency light flickers beside the main infirmary, and a second door is marked quarantine in peeling paint.";
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
      ]) && success
    ) {
      nextState.flags.infirmary_unlocked = true;
      logicNote =
        "A trembling voice from an old intercom warns that the nurse kept her real records inside the infirmary desk.";
    }

    if (
      includesAny(text, [
        "go infirmary",
        "open infirmary",
        "enter infirmary",
        "去医务室",
        "打开医务室",
        "进入医务室",
      ])
    ) {
      if (nextState.flags.infirmary_hint || nextState.flags.infirmary_unlocked) {
        nextState.currentScene = "infirmary";
        logicNote =
          "The player enters the infirmary. Dust hangs over overturned beds and a desk drawer is half open.";
      } else {
        logicNote =
          "The main infirmary is easy to miss from the dark corridor. More investigation may help.";
      }
    }
  }

  if (nextState.currentScene === "infirmary") {
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
      ]) && success
    ) {
      nextState.flags.quarantine_unlocked = true;
      nextState.flags.evidence_found = true;
      nextState.flags.night_shift_log_found = true;
      nextState.character.inventory = addUniqueItem(
        nextState.character.inventory,
        "Medical Ledger"
      );
      nextState.character.inventory = addUniqueItem(
        nextState.character.inventory,
        "Quarantine Keycard"
      );
      logicNote =
        "Inside the nurse's desk, the player finds a medical ledger and a quarantine keycard listing students whose names were quietly erased.";
    }

    if (
      includesAny(text, [
        "go quarantine",
        "open quarantine",
        "enter quarantine",
        "去隔离室",
        "打开隔离室",
        "进入隔离室",
      ])
    ) {
      if (nextState.flags.quarantine_unlocked) {
        nextState.currentScene = "quarantine_room";
        logicNote =
          "The keycard opens the quarantine room. The air is chemical and cold, and one cabinet door is still moving.";
      } else {
        logicNote =
          "The quarantine room remains locked. The infirmary desk may contain what you need.";
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
      ]) && hasEvidence(nextState)
    ) {
      nextState.isFinished = true;
      nextState.flags.escaped_with_evidence = true;
      nextState.flags.extracted_alive = true;
      logicNote =
        "The player withdraws with the medical ledger instead of pushing deeper into the infirmary wing.";
    }
  }

  if (nextState.currentScene === "quarantine_room") {
    if (
      includesAny(text, [
        "look",
        "investigate",
        "inspect",
        "search",
        "open cabinet",
        "观察",
        "检查",
        "调查",
        "搜查",
        "打开柜子",
      ]) && success
    ) {
      nextState.isFinished = true;
      nextState.flags.truth_found = true;
      logicNote =
        "The player uncovers sealed treatment records proving the infirmary was used to hide coerced experiments and disappearances.";
    }

    if (
      includesAny(text, [
        "resist",
        "pray",
        "stay calm",
        "steady",
        "抵抗",
        "祈祷",
        "冷静",
      ]) && success
    ) {
      nextState.isFinished = true;
      nextState.flags.truth_found = true;
      logicNote =
        "The player endures the chemical stench, follows the scraping sound, and discovers the sealed quarantine records behind a false wall.";
    }

    if (
      includesAny(text, [
        "end session",
        "leave now",
        "escape with the evidence",
        "结束",
        "离开",
        "带着证据离开",
      ]) && hasEvidence(nextState)
    ) {
      nextState.isFinished = true;
      nextState.flags.escaped_with_evidence = true;
      nextState.flags.extracted_alive = true;
      logicNote =
        "The player escapes the infirmary wing with enough records to expose part of the case.";
    }
  }

  return logicNote;
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

  const hpTradeNote = applyHpTradeoff(nextState, text);
  const success = rollResult ? rollResult.outcome !== "fail" : true;

  let failureNote = "";
  let logicNote = hpTradeNote;

  if (!hpTradeNote) {
    logicNote =
      state.scenario === "infirmary_case"
        ? applyInfirmaryScenario(nextState, text, success)
        : applyBasementScenario(nextState, text, success);

    failureNote = applyFailurePenalty(
      nextState,
      rollResult,
      state.currentScene,
      text
    );
  }

  if (failureNote) {
    logicNote = logicNote ? `${logicNote} ${failureNote}` : failureNote;
  }

  return {
    state: nextState,
    logicNote,
  };
}
