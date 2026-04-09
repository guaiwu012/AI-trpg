import {
  ActionCheck,
  Character,
  DiceResult,
  GameState,
  SceneId,
} from "@/types/game";
import { rollD20 } from "./dice";

type SkillName = "observation" | "persuasion" | "willpower";

const skillKeywords: Record<SkillName, string[]> = {
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
    "examine",
    "study",
    "follow",
    "trace",
    "find",
    "count",
    "compare",
    "观察",
    "检查",
    "调查",
    "搜查",
    "寻找",
    "查看",
    "阅读",
    "对比",
    "统计",
  ],
  persuasion: [
    "ask",
    "talk",
    "speak",
    "persuade",
    "convince",
    "call",
    "shout",
    "question",
    "negotiate",
    "interrogate",
    "询问",
    "搭话",
    "说服",
    "交涉",
    "呼喊",
    "交谈",
    "问",
    "喊",
  ],
  willpower: [
    "resist",
    "endure",
    "pray",
    "stay calm",
    "push through",
    "steady",
    "hold on",
    "remember",
    "force myself",
    "ignore the fear",
    "抵抗",
    "坚持",
    "祈祷",
    "冷静",
    "硬撑",
    "撑住",
    "回想",
    "想起来",
  ],
};

const moveKeywords = [
  "open",
  "enter",
  "go",
  "move",
  "follow",
  "continue",
  "push the door",
  "go inside",
  "head deeper",
  "walk forward",
  "try the door",
  "toward",
  "approach",
  "descend",
  "开门",
  "进去",
  "进入",
  "前进",
  "继续走",
  "往里走",
  "跟着",
  "试门",
  "靠近",
  "下去",
  "下楼",
];

const evidenceKeywords = [
  "file",
  "folder",
  "record",
  "ledger",
  "desk",
  "drawer",
  "cabinet",
  "paper",
  "document",
  "keycard",
  "passcard",
  "take",
  "grab",
  "pick up",
  "manifest",
  "protocol",
  "manual",
  "contract",
  "letter",
  "memo",
  "photo",
  "terminal",
  "sample",
  "档案",
  "文件",
  "记录",
  "抽屉",
  "柜子",
  "卡",
  "拿",
  "取走",
  "清单",
  "手册",
  "合同",
  "信",
  "备忘录",
  "照片",
  "终端",
  "样本",
];

const endingKeywords = [
  "end session",
  "leave now",
  "escape with the evidence",
  "leave",
  "retreat",
  "get out",
  "run",
  "exit",
  "compile report",
  "结束",
  "离开",
  "带着证据离开",
  "撤退",
  "逃走",
  "出去",
  "结束调查",
];

const basementCorroborationFlags = [
  "transfer_manifest_found",
  "restraint_protocol_found",
  "partner_contract_found",
  "parent_letter_found",
  "ethics_memo_found",
] as const;

const infirmaryCorroborationFlags = [
  "night_transfer_schedule_found",
  "sedation_protocol_found",
  "training_manual_found",
  "dosage_variance_found",
  "incident_photo_found",
] as const;

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function addUniqueItem(items: string[], item: string) {
  return items.includes(item) ? items : [...items, item];
}

function countTrueFlags(state: GameState, flags: readonly string[]) {
  return flags.filter((flag) => state.flags[flag]).length;
}

function isLongMode(state: GameState) {
  return state.gameMode === "long";
}

function longTruthThreshold(state: GameState) {
  return isLongMode(state) ? 4 : 3;
}

function hasEvidence(state: GameState) {
  return (
    state.flags.evidence_found ||
    state.flags.evidence_folder_found ||
    state.flags.night_shift_log_found ||
    state.flags.truth_found ||
    state.character.inventory.includes("Lucas Dossier") ||
    state.character.inventory.includes("Treatment Ledger")
  );
}

function isObservationIntent(text: string) {
  return includesAny(text, skillKeywords.observation);
}

function isPersuasionIntent(text: string) {
  return includesAny(text, skillKeywords.persuasion);
}

function isWillpowerIntent(text: string) {
  return includesAny(text, skillKeywords.willpower);
}

function isMoveIntent(text: string) {
  return includesAny(text, moveKeywords);
}

function isEvidenceIntent(text: string) {
  return includesAny(text, evidenceKeywords) || isObservationIntent(text);
}

function isEndingIntent(text: string) {
  return includesAny(text, endingKeywords);
}

function basementClueCount(state: GameState) {
  return countTrueFlags(state, basementCorroborationFlags);
}

function infirmaryClueCount(state: GameState) {
  return countTrueFlags(state, infirmaryCorroborationFlags);
}

function reconcileItems(nextState: GameState) {
  if (nextState.flags.basement_unlocked) {
    nextState.character.inventory = addUniqueItem(nextState.character.inventory, "Service Passcard");
  }

  if (nextState.flags.quarantine_unlocked) {
    nextState.character.inventory = addUniqueItem(nextState.character.inventory, "Treatment Keycard");
  }

  if (nextState.flags.evidence_folder_found || nextState.flags.evidence_found) {
    if (nextState.scenario === "basement_case") {
      nextState.character.inventory = addUniqueItem(nextState.character.inventory, "Lucas Dossier");
    }
  }

  if (nextState.flags.night_shift_log_found || nextState.flags.evidence_found) {
    if (nextState.scenario === "infirmary_case") {
      nextState.character.inventory = addUniqueItem(nextState.character.inventory, "Treatment Ledger");
    }
  }

  const itemMap: Record<string, string> = {
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

  for (const [flag, item] of Object.entries(itemMap)) {
    if (nextState.flags[flag]) {
      nextState.character.inventory = addUniqueItem(nextState.character.inventory, item);
    }
  }
}

export function analyzeAction(action: string, scene: SceneId): ActionCheck {
  const text = action.toLowerCase();

  if (isObservationIntent(text)) {
    return {
      requiresRoll: true,
      skill: "observation",
      reason: `Observation check in ${scene}`,
    };
  }

  if (isPersuasionIntent(text)) {
    return {
      requiresRoll: true,
      skill: "persuasion",
      reason: `Persuasion check in ${scene}`,
    };
  }

  if (isWillpowerIntent(text)) {
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
      state.flags.escaped_with_evidence ||
      hasEvidence(state)
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

  if (scene === "basement" || scene === "quarantine_room") {
    nextState.character.hp = Math.max(0, nextState.character.hp - 1);
    note += " The hostile environment costs 1 HP.";
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

function addBasementCorroboration(nextState: GameState, text: string, success: boolean) {
  if (!success || !nextState.flags.evidence_folder_found) {
    return "";
  }

  const broadEvidence =
    isObservationIntent(text) ||
    isEvidenceIntent(text) ||
    isPersuasionIntent(text) ||
    isWillpowerIntent(text);

  if (
    !nextState.flags.transfer_manifest_found &&
    (broadEvidence || includesAny(text, ["route", "map", "wall", "below", "路线", "地图", "墙后", "下面"]))
  ) {
    nextState.flags.transfer_manifest_found = true;
    return "A hidden route fragment in Lucas's hand marks a false wall behind Student Wellness Center and a path into the underground core. He had mapped the secret descent before the fire reached the school.";
  }

  if (
    !nextState.flags.restraint_protocol_found &&
    (broadEvidence || includesAny(text, ["protocol", "restraint", "treatment bed", "procedure", "协议", "束缚", "治疗床", "流程"]))
  ) {
    nextState.flags.restraint_protocol_found = true;
    return "An underground protocol sheet explains how students whose reactions destabilized after hormone treatment were restrained, observed, and reclassified as unusable samples rather than patients.";
  }

  if (
    !nextState.flags.partner_contract_found &&
    (broadEvidence || includesAny(text, ["contract", "helix", "institute", "agreement", "合同", "海利克斯", "研究所", "合作"]))
  ) {
    nextState.flags.partner_contract_found = true;
    return "A sealed cooperation contract ties St. Alden to Helix Juvenile Development Institute. The language describes youth development and stability research. The specimen tables describe something far uglier.";
  }

  if (
    !nextState.flags.parent_letter_found &&
    (broadEvidence || includesAny(text, ["letter", "parent", "complaint", "family", "信", "家长", "投诉", "家属"]))
  ) {
    nextState.flags.parent_letter_found = true;
    return "Inside a damaged envelope is a parent's unanswered plea asking why their child was declared transferred without any visit or final contact. The paper proves the families were kept outside the truth on purpose.";
  }

  if (
    !nextState.flags.ethics_memo_found &&
    (broadEvidence || includesAny(text, ["memo", "fire", "cleanup", "purge", "备忘录", "火灾", "清理", "销毁"]))
  ) {
    nextState.flags.ethics_memo_found = true;
    return "A cleanup memo written just before the fire orders the removal of failed-sample records, treatment traces, and identity links. The blaze was not only disaster. It was also erasure.";
  }

  return "";
}

function addInfirmaryCorroboration(nextState: GameState, text: string, success: boolean) {
  if (!success || !nextState.flags.night_shift_log_found) {
    return "";
  }

  const broadEvidence =
    isObservationIntent(text) ||
    isEvidenceIntent(text) ||
    isPersuasionIntent(text) ||
    isWillpowerIntent(text);

  if (
    !nextState.flags.night_transfer_schedule_found &&
    (broadEvidence || includesAny(text, ["nina", "night", "schedule", "count again", "妮娜", "夜班", "排班", "再数一遍"]))
  ) {
    nextState.flags.night_transfer_schedule_found = true;
    return "A hidden night log left by Nina tracks students who entered deeper treatment rooms and never returned. Next to several names she wrote only two words: Count again.";
  }

  if (
    !nextState.flags.sedation_protocol_found &&
    (broadEvidence || includesAny(text, ["hormone", "dose", "sedation", "protocol", "激素", "剂量", "镇静", "方案"]))
  ) {
    nextState.flags.sedation_protocol_found = true;
    return "A hormone dosing chart links mood suppression, obedience scoring, and physical stability. Student Wellness Center was not an ordinary recovery wing. It was a filtering stage for Helix's experiment.";
  }

  if (
    !nextState.flags.training_manual_found &&
    (broadEvidence || includesAny(text, ["ethan", "manual", "directive", "override", "伊森", "手册", "指令", "权限"]))
  ) {
    nextState.flags.training_manual_found = true;
    return "A manual signed under Ethan's authority tells staff to isolate unstable students, suppress questions, and prioritize sample retention over emotional distress. Care language was being used as cover.";
  }

  if (
    !nextState.flags.dosage_variance_found &&
    (broadEvidence || includesAny(text, ["stability", "rating", "sheet", "variance", "稳定", "评级", "表格", "差异"]))
  ) {
    nextState.flags.dosage_variance_found = true;
    return "A stability sheet ranks students as failed, volatile, or approved for release. One entry stands apart: a successful sample marked for transfer and long-term observation rather than disposal.";
  }

  if (
    !nextState.flags.incident_photo_found &&
    (broadEvidence || includesAny(text, ["photo", "camera", "sample", "bed", "照片", "相机", "样本", "病床"]))
  ) {
    nextState.flags.incident_photo_found = true;
    return "A scorched photo shows three students near a treatment bed. One face is Lucas. One is blurred. The third feels unbearable to look at, as if memory itself is trying to pull you closer.";
  }

  return "";
}

function addLongIdentityClues(nextState: GameState, text: string, success: boolean) {
  if (!success || !isLongMode(nextState)) {
    return "";
  }

  const broadEvidence =
    isObservationIntent(text) ||
    isEvidenceIntent(text) ||
    isPersuasionIntent(text) ||
    isWillpowerIntent(text);

  if (
    !nextState.flags.release_record_found &&
    (broadEvidence || includesAny(text, ["release", "approval", "stability", "档案", "释放", "批准", "稳定样本"]))
  ) {
    nextState.flags.release_record_found = true;
    return "Behind the sample files sits a release approval record for one rare successful subject. Instead of disposal, the plan orders transfer, continued observation, and total secrecy. The score pattern feels dangerously familiar.";
  }

  if (
    !nextState.flags.escape_log_found &&
    (broadEvidence || includesAny(text, ["escape", "ethan", "override", "incident", "逃离", "伊森", "权限覆盖", "事故"]))
  ) {
    nextState.flags.escape_log_found = true;
    return "An override incident log signed under Ethan's authority records a transfer subject who fled during the fire-night cleanup and was later marked presumed dead after a fall. The entry ends with a refusal to reopen the search.";
  }

  return "";
}

function basementTruthReady(state: GameState) {
  const baseReady =
    state.flags.evidence_folder_found && basementClueCount(state) >= longTruthThreshold(state);

  if (!baseReady) {
    return false;
  }

  if (!isLongMode(state)) {
    return true;
  }

  return Boolean(
    state.flags.memory_trigger_found &&
      state.flags.lucas_map_completed &&
      state.flags.release_record_found &&
      state.flags.escape_log_found
  );
}

function infirmaryTruthReady(state: GameState) {
  const baseReady =
    state.flags.night_shift_log_found && infirmaryClueCount(state) >= longTruthThreshold(state);

  if (!baseReady) {
    return false;
  }

  if (!isLongMode(state)) {
    return true;
  }

  return Boolean(
    state.flags.memory_trigger_found &&
      state.flags.nina_mark_sequence_found &&
      state.flags.release_record_found &&
      state.flags.escape_log_found
  );
}

function finalTruthNote(route: "basement" | "wellness") {
  const routeText =
    route === "basement"
      ? "The archive route, the hidden wall, and the underground treatment beds now fit together into one coherent system."
      : "The treatment wing, the night logs, and the sealed sample sheets now fit together into one coherent system.";

  return `${routeText} St. Alden was never only a boarding school. It worked with Helix Juvenile Development Institute on an illegal hormone program that used students as live samples. Those who showed memory loss, emotional flattening, sleep disorder, or unstable behavior were pushed deeper into Student Wellness Center and treated as failed samples to be isolated, processed, and erased. The fire was used to destroy the final evidence. The deepest file reveals one more truth: the player was one of the rare successful samples, marked approved for release and meant to be transferred out for long-term control. Ethan's override notes confirm he believed the subject died during escape. Your return is not just a threat to the system. You are proof it worked.`;
}

function applyBasementScenario(
  nextState: GameState,
  text: string,
  success: boolean
) {
  let logicNote = "";

  if (nextState.currentScene === "gate") {
    if ((isObservationIntent(text) || isPersuasionIntent(text)) && !nextState.flags.found_gate_clue) {
      nextState.flags.found_gate_clue = true;
      if (isLongMode(nextState)) {
        nextState.flags.explorer_video_found = true;
        logicNote =
          "Near the ruined entrance, the player finds explorer spray marks, a broken action-camera mount, and a cracked phone still holding one freeze-frame of the hidden treatment room. The route inside does not feel discovered. It feels remembered.";
      } else {
        logicNote =
          "Near the ruined entrance, the player finds explorer spray marks, a broken action-camera mount, and a tiny Nina-style notch on the wall. The route inside does not feel discovered. It feels remembered.";
      }
    }

    if (isMoveIntent(text)) {
      nextState.flags.found_gate_clue = true;
      nextState.currentScene = "hallway";
      logicNote = success
        ? "The player slips into the burned school corridor. Melted lockers, damp ash, and shifted photo frames suggest someone came back here after the fire to move or remove what remained."
        : "The player forces a way into the corridor, scattering debris and drawing more danger, but still gets inside the ruined school.";
    }
  }

  if (nextState.currentScene === "hallway") {
    if ((isObservationIntent(text) || isPersuasionIntent(text) || isMoveIntent(text)) && !nextState.flags.archive_hint) {
      nextState.flags.archive_hint = true;
      logicNote =
        "Behind a warped class photo, the player finds Lucas's first warning: There was someone here. The corridor leads toward the archive and toward records that were changed after students disappeared.";
    }

    if (
      isLongMode(nextState) &&
      success &&
      !nextState.flags.memory_trigger_found &&
      (isWillpowerIntent(text) || includesAny(text, ["stair", "hall", "familiar", "remember", "楼梯", "走廊", "熟悉", "想起来"]))
    ) {
      nextState.flags.memory_trigger_found = true;
      logicNote =
        "When the player stops fighting the familiarity, a shard of memory surfaces: the smell of antiseptic drifting under smoke, and the certainty that the stairs near the archive once led somewhere forbidden. The school is no longer only a case site.";
    }

    if (isPersuasionIntent(text) && success && !nextState.flags.archive_unlocked) {
      nextState.flags.archive_unlocked = true;
      logicNote =
        "A damaged speaker crackles with an old treatment announcement and an incomplete staff reply. Student Wellness Center was receiving students whose files had already been rewritten elsewhere in the building.";
    }

    if (
      includesAny(text, ["archive", "photo", "lucas", "follow the note", "档案室", "照片", "路标", "继续往里"]) ||
      (isMoveIntent(text) && nextState.flags.archive_hint)
    ) {
      nextState.flags.archive_hint = true;
      nextState.currentScene = "archive";
      logicNote =
        "The player reaches the archive room, where burned filing cabinets and replaced class lists show that St. Alden did not just lose students. It revised them out of existence.";
    }
  }

  if (nextState.currentScene === "archive") {
    if (isEvidenceIntent(text) && !nextState.flags.evidence_folder_found) {
      nextState.flags.basement_unlocked = true;
      nextState.flags.evidence_found = true;
      nextState.flags.evidence_folder_found = true;
      logicNote = success
        ? "Inside a sealed drawer, the player recovers Lucas's dossier and a service passcard. Mixed among missing-student records are route sketches, erased names, and one handwritten line: Below the wall."
        : "Even in a rushed search, the player tears free Lucas's dossier and a service passcard. The surviving pages still prove students were systematically removed from rosters before anyone admitted they were gone.";
    } else if (isEvidenceIntent(text) && !nextState.flags.basement_transfer_route_found) {
      nextState.flags.basement_transfer_route_found = true;
      logicNote = success
        ? "By comparing archive revisions, treatment references, and service maps, the player reconstructs the hidden route from school records to Student Wellness Center and down into the underground core."
        : "The player cannot sort every cabinet cleanly, but still pieces together the essential chain: erased record, treatment wing, hidden wall, underground transfer.";
    } else if (
      isLongMode(nextState) &&
      success &&
      nextState.flags.evidence_folder_found &&
      nextState.flags.basement_transfer_route_found &&
      !nextState.flags.lucas_map_completed &&
      (isObservationIntent(text) || isEvidenceIntent(text) || isWillpowerIntent(text))
    ) {
      nextState.flags.lucas_map_completed = true;
      logicNote =
        "By fitting Lucas's fragments together, the player completes his hidden map of the school-to-treatment route. A final note in the margin is harsher than any diagram: Not treatment.";
    }

    if (
      includesAny(text, ["basement", "below the wall", "hidden stairs", "地下", "墙后", "楼梯"]) ||
      (isMoveIntent(text) && nextState.flags.basement_unlocked && nextState.flags.basement_transfer_route_found)
    ) {
      const readyForBasement =
        nextState.flags.basement_unlocked &&
        nextState.flags.basement_transfer_route_found &&
        (!isLongMode(nextState) || nextState.flags.lucas_map_completed);

      if (readyForBasement) {
        nextState.currentScene = "basement";
        logicNote =
          "The false wall opens, and the player descends into the underground treatment core. Here the school's language of care is gone. Only beds, restraints, sample numbers, and sealed terminals remain.";
      } else if (!logicNote) {
        logicNote = isLongMode(nextState)
          ? "The hidden route is close, but in long mode the player still needs Lucas's completed map before descending blindly."
          : "The hidden route is close, but the player still needs both the service access and Lucas's full path before descending blindly.";
      }
    }

    if (isEndingIntent(text) && hasEvidence(nextState)) {
      nextState.isFinished = true;
      nextState.flags.escaped_with_evidence = true;
      nextState.flags.extracted_alive = true;
      logicNote =
        "The player leaves with Lucas's dossier intact. Even without the final descent, the archive evidence already proves that the school erased students in stages before the outside world ever saw the fire.";
    }
  }

  if (nextState.currentScene === "basement") {
    const corroborationNote = addBasementCorroboration(nextState, text, success);
    if (corroborationNote) {
      logicNote = corroborationNote;
    }

    const identityNote = addLongIdentityClues(nextState, text, success);
    if (identityNote) {
      logicNote = identityNote;
    }

    const truthIntent =
      includesAny(text, [
        "compare the files",
        "open the core terminal",
        "check my file",
        "remember",
        "look for release approval",
        "比对档案",
        "核心终端",
        "我的档案",
        "想起来",
        "批准释放",
      ]) ||
      (isEvidenceIntent(text) && basementTruthReady(nextState)) ||
      (isWillpowerIntent(text) && basementTruthReady(nextState));

    if (truthIntent) {
      if (success && basementTruthReady(nextState)) {
        nextState.isFinished = true;
        nextState.flags.truth_found = true;
        nextState.flags.basement_experiment_found = true;
        nextState.flags.systemic_pressure_found = true;
        nextState.flags.identity_revealed = true;
        nextState.flags.ethan_contact = true;
        logicNote = finalTruthNote("basement");
      } else if (hasEvidence(nextState)) {
        nextState.isFinished = true;
        nextState.flags.escaped_with_evidence = true;
        nextState.flags.extracted_alive = true;
        logicNote =
          "The player cannot complete the final comparison under pressure, but escapes with enough material to prove that St. Alden and Helix used Student Wellness Center to process and erase student samples.";
      } else {
        nextState.isFinished = true;
        nextState.flags.overwhelmed = true;
        logicNote =
          "The underground core closes in before the player can force the final reveal. Even so, the treatment beds and sealed sample numbers make clear that this place was built for experiments, not recovery.";
      }
    }

    if (isEndingIntent(text) && hasEvidence(nextState)) {
      nextState.isFinished = true;
      nextState.flags.escaped_with_evidence = true;
      nextState.flags.extracted_alive = true;
      if (!logicNote) {
        logicNote =
          "The player retreats from the underground core with enough evidence to expose St. Alden's missing-student pipeline, even without opening every final terminal.";
      }
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
    if ((isObservationIntent(text) || isPersuasionIntent(text)) && !nextState.flags.found_courtyard_clue) {
      nextState.flags.found_courtyard_clue = true;
      if (isLongMode(nextState)) {
        nextState.flags.explorer_video_found = true;
        logicNote =
          "At the outer edge of Student Wellness Center, the player finds explorer rope, a shattered window latch, and a damaged phone clip still holding frames from the hidden room upload. Nina's repeated notch is carved beside it, pointing inward.";
      } else {
        logicNote =
          "At the outer edge of Student Wellness Center, the player finds explorer rope, a shattered window latch, and one small repeated mark cut into the frame. Nina used it to point inward.";
      }
    }

    if (isMoveIntent(text)) {
      nextState.flags.found_courtyard_clue = true;
      nextState.currentScene = "clinic_hall";
      logicNote = success
        ? "The player enters the outer treatment hall. Faded encouragement posters and locked observation doors make the wing feel less like care and more like managed containment."
        : "The player forces a path into the treatment hall, raising the danger level, but still makes it into the outer wing.";
    }
  }

  if (nextState.currentScene === "clinic_hall") {
    if ((isObservationIntent(text) || isPersuasionIntent(text) || isMoveIntent(text)) && !nextState.flags.infirmary_hint) {
      nextState.flags.infirmary_hint = true;
      logicNote =
        "The player finds altered room signs, duplicated sample numbers, and a half-cleaned treatment board still labeled Student Wellness Center. Whatever happened here was structured and repeated.";
    }

    if (
      isLongMode(nextState) &&
      success &&
      !nextState.flags.memory_trigger_found &&
      (isWillpowerIntent(text) || includesAny(text, ["smell", "familiar", "remember", "hall", "气味", "熟悉", "想起来", "走廊"]))
    ) {
      nextState.flags.memory_trigger_found = true;
      logicNote =
        "When the player steadies themself, an involuntary fragment returns: antiseptic on skin, a voice calling the place supportive care, and the certainty that the deeper rooms once decided who came back out. This is not an ordinary case site.";
    }

    if (isPersuasionIntent(text) && success && !nextState.flags.infirmary_unlocked) {
      nextState.flags.infirmary_unlocked = true;
      logicNote =
        "A damaged audio recorder captures Nina's frightened voice: They do not come back. Count again. Do not trust the files. Someone inside the system knew students were vanishing behind treatment language.";
    }

    if (
      includesAny(text, ["infirmary", "treatment room", "nurse room", "医务室", "治疗室", "门牌"]) ||
      (isMoveIntent(text) && nextState.flags.infirmary_hint)
    ) {
      nextState.flags.infirmary_hint = true;
      nextState.currentScene = "infirmary";
      logicNote =
        "The player enters the outer treatment rooms. Clipboards, broken lamps, and half-removed labels show the wing was used to stage students before they were moved deeper inside.";
    }
  }

  if (nextState.currentScene === "infirmary") {
    if (isEvidenceIntent(text) && !nextState.flags.night_shift_log_found) {
      nextState.flags.quarantine_unlocked = true;
      nextState.flags.evidence_found = true;
      nextState.flags.night_shift_log_found = true;
      logicNote = success
        ? "Inside a locked desk, the player finds a treatment ledger and a keycard. Nina's notes, altered dates, and missing signatures show that students entered recovery, then disappeared into a deeper zone with no return record."
        : "Even in a rushed search, the player pulls out the treatment ledger and keycard. The remaining entries still prove that Student Wellness Center hid transfers behind incomplete treatment paperwork.";
    } else if (isEvidenceIntent(text) && !nextState.flags.infirmary_transfer_route_found) {
      nextState.flags.infirmary_transfer_route_found = true;
      logicNote = success
        ? "By comparing the ledger, wall numbers, and dragged-bed marks, the player reconstructs the route from outer treatment rooms to the hidden underground area."
        : "The player cannot sort every chart cleanly, but still reconstructs the essential path from treatment intake to sealed underground processing.";
    } else if (
      isLongMode(nextState) &&
      success &&
      nextState.flags.night_shift_log_found &&
      nextState.flags.infirmary_transfer_route_found &&
      !nextState.flags.nina_mark_sequence_found &&
      (isObservationIntent(text) || isEvidenceIntent(text) || isWillpowerIntent(text))
    ) {
      nextState.flags.nina_mark_sequence_found = true;
      logicNote =
        "Across door frames, bed rails, and chart edges, the player pieces together Nina's repeated marks into a full sequence. They do not just warn of danger. They diagram who was sent deeper and who never returned.";
    }

    if (
      includesAny(text, ["quarantine", "sealed room", "deeper room", "隔离室", "封闭房间", "更里面"]) ||
      (isMoveIntent(text) && nextState.flags.quarantine_unlocked && nextState.flags.infirmary_transfer_route_found)
    ) {
      const readyForCore =
        nextState.flags.quarantine_unlocked &&
        nextState.flags.infirmary_transfer_route_found &&
        (!isLongMode(nextState) || nextState.flags.nina_mark_sequence_found);

      if (readyForCore) {
        nextState.currentScene = "quarantine_room";
        logicNote =
          "The player enters the hidden treatment core beyond the outer rooms. The equipment is colder, older, and less human. Here the school stopped pretending this was therapy.";
      } else if (!logicNote) {
        logicNote = isLongMode(nextState)
          ? "The deeper room is there, but in long mode the player still needs Nina's full mark sequence before forcing entry."
          : "The deeper room is there, but the player still needs both the keycard and the route before forcing entry.";
      }
    }

    if (isEndingIntent(text) && hasEvidence(nextState)) {
      nextState.isFinished = true;
      nextState.flags.escaped_with_evidence = true;
      nextState.flags.extracted_alive = true;
      logicNote =
        "The player leaves the treatment wing with Nina's ledger intact. Even without entering the deepest room, the records already show that students were routed inward and erased in sequence.";
    }
  }

  if (nextState.currentScene === "quarantine_room") {
    const corroborationNote = addInfirmaryCorroboration(nextState, text, success);
    if (corroborationNote) {
      logicNote = corroborationNote;
    }

    const identityNote = addLongIdentityClues(nextState, text, success);
    if (identityNote) {
      logicNote = identityNote;
    }

    const truthIntent =
      includesAny(text, [
        "compare the sample sheets",
        "open the locked terminal",
        "check the release record",
        "remember",
        "follow ethan",
        "比对样本表",
        "锁定终端",
        "释放记录",
        "想起来",
        "追查伊森",
      ]) ||
      (isEvidenceIntent(text) && infirmaryTruthReady(nextState)) ||
      (isWillpowerIntent(text) && infirmaryTruthReady(nextState));

    if (truthIntent) {
      if (success && infirmaryTruthReady(nextState)) {
        nextState.isFinished = true;
        nextState.flags.truth_found = true;
        nextState.flags.infirmary_experiment_found = true;
        nextState.flags.systemic_pressure_found = true;
        nextState.flags.identity_revealed = true;
        nextState.flags.ethan_contact = true;
        logicNote = finalTruthNote("wellness");
      } else if (hasEvidence(nextState)) {
        nextState.isFinished = true;
        nextState.flags.escaped_with_evidence = true;
        nextState.flags.extracted_alive = true;
        logicNote =
          "The player cannot complete the final comparison in time, but escapes with enough records to prove that St. Alden and Helix turned Student Wellness Center into a live experimental filter.";
      } else {
        nextState.isFinished = true;
        nextState.flags.overwhelmed = true;
        logicNote =
          "The hidden treatment core becomes unmanageable before the player can carry proof out. Even so, the sample beds and scoring sheets make the moral shape of the system impossible to miss.";
      }
    }

    if (isEndingIntent(text) && hasEvidence(nextState)) {
      nextState.isFinished = true;
      nextState.flags.escaped_with_evidence = true;
      nextState.flags.extracted_alive = true;
      if (!logicNote) {
        logicNote =
          "The player escapes with enough treatment records to expose how Student Wellness Center filtered, scored, and erased students under medical language.";
      }
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

  const success = rollResult ? rollResult.outcome !== "fail" : true;
  const failureNote = applyFailurePenalty(nextState, rollResult, state.currentScene);

  let logicNote =
    state.scenario === "infirmary_case"
      ? applyInfirmaryScenario(nextState, text, success)
      : applyBasementScenario(nextState, text, success);

  reconcileItems(nextState);

  if (failureNote) {
    logicNote = logicNote ? `${logicNote} ${failureNote}` : failureNote;
  }

  return {
    state: nextState,
    logicNote,
  };
}
