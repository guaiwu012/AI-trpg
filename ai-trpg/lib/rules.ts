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
    "look","investigate","inspect","search","observe","check","listen","read","scan","examine","study","follow","trace","find","take a closer look",
    "观察","检查","调查","搜查","寻找","查看","倾听","阅读","找","翻","看一看","看看",
  ],
  persuasion: [
    "ask","talk","speak","persuade","convince","call","shout","question","negotiate","yell",
    "询问","搭话","说服","交涉","呼喊","交谈","问","喊","叫",
  ],
  willpower: [
    "resist","endure","pray","stay calm","push through","steady","force myself","hold on","keep going","resilience",
    "抵抗","坚持","祈祷","冷静","硬撑","镇定","撑住","继续",
  ],
};

const moveKeywords = [
  "open","enter","go","move","follow","continue","push the door","go inside","head deeper","walk forward","try the door","toward","approach",
  "开门","进去","进入","前进","继续走","往里走","跟着","朝前走","试门","靠近","往",
];

const evidenceKeywords = [
  "file","folder","record","ledger","desk","drawer","cabinet","paper","document","keycard","passcard","take","grab","pick up","open drawer","open desk","manifest","protocol","manual","contract","mail","letter","memo","photo",
  "档案","文件","账本","记录","抽屉","桌子","柜子","卡","钥匙卡","拿","取走","拿走","打开抽屉","打开桌子","拿起","清单","手册","协议","合同","邮件","信","备忘录","照片",
];

const endingKeywords = [
  "end session","leave now","escape with the evidence","leave","retreat","get out","run","exit","compile report",
  "结束","离开","带着证据离开","撤退","逃走","出去","结束调查",
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

function hasEvidence(state: GameState) {
  return (
    state.flags.evidence_found ||
    state.flags.evidence_folder_found ||
    state.flags.night_shift_log_found ||
    state.character.inventory.includes("Evidence Folder") ||
    state.character.inventory.includes("Medical Ledger")
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

function hasSpecificClue(state: GameState, clue: string) {
  return Boolean(state.flags[clue]);
}

function basementClueCount(state: GameState) {
  return countTrueFlags(state, basementCorroborationFlags);
}

function infirmaryClueCount(state: GameState) {
  return countTrueFlags(state, infirmaryCorroborationFlags);
}

function reconcileItems(nextState: GameState) {
  if (nextState.flags.basement_unlocked) {
    nextState.character.inventory = addUniqueItem(nextState.character.inventory, "Basement Passcard");
  }

  if (nextState.flags.quarantine_unlocked) {
    nextState.character.inventory = addUniqueItem(nextState.character.inventory, "Quarantine Keycard");
  }

  if (nextState.flags.evidence_folder_found || nextState.flags.evidence_found) {
    if (nextState.scenario === "basement_case") {
      nextState.character.inventory = addUniqueItem(nextState.character.inventory, "Evidence Folder");
    }
  }

  if (nextState.flags.night_shift_log_found || nextState.flags.evidence_found) {
    if (nextState.scenario === "infirmary_case") {
      nextState.character.inventory = addUniqueItem(nextState.character.inventory, "Medical Ledger");
    }
  }

  const itemMap: Record<string, string> = {
    transfer_manifest_found: "Transfer Manifest",
    restraint_protocol_found: "Restraint Protocol",
    partner_contract_found: "Partner Contract",
    parent_letter_found: "Parent Letter",
    ethics_memo_found: "Ethics Memo",
    night_transfer_schedule_found: "Night Transfer Schedule",
    sedation_protocol_found: "Sedation Protocol",
    training_manual_found: "Training Manual",
    dosage_variance_found: "Dosage Variance Sheet",
    incident_photo_found: "Incident Photo",
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
  if (!success) return "";
  if (!nextState.flags.evidence_folder_found) return "";

  const broadEvidence = isObservationIntent(text) || isEvidenceIntent(text) || isPersuasionIntent(text) || isWillpowerIntent(text);

  if (
    !hasSpecificClue(nextState, "transfer_manifest_found") &&
    (broadEvidence || includesAny(text, ["manifest", "elevator log", "freight", "转运", "清单", "货梯"]))
  ) {
    nextState.flags.transfer_manifest_found = true;
    return "Behind the freight cage, the player uncovers a transfer manifest showing selected students were moved before sunrise under maintenance codes, with the infirmary listed as the handoff point and the basement listed as the holding stage.";
  }

  if (
    !hasSpecificClue(nextState, "restraint_protocol_found") &&
    (broadEvidence || includesAny(text, ["protocol", "restraint", "procedure", "约束", "协议", "流程"]))
  ) {
    nextState.flags.restraint_protocol_found = true;
    return "A restraint protocol packet explains how agitation, silence, and compliance were scored after sedation. Fear was not being treated here. It was being measured and standardized.";
  }

  if (
    !hasSpecificClue(nextState, "partner_contract_found") &&
    (broadEvidence || includesAny(text, ["contract", "agreement", "partner", "ward", "合同", "合作", "病区"]))
  ) {
    nextState.flags.partner_contract_found = true;
    return "A contract bundle links the school to an external behavior unit. The language is dry, but the meaning is not: students labeled unstable could be transferred off-book under a special intervention partnership.";
  }

  if (
    !hasSpecificClue(nextState, "parent_letter_found") &&
    (broadEvidence || includesAny(text, ["letter", "guardian", "appeal", "family", "信", "家长", "申诉", "家属"]))
  ) {
    nextState.flags.parent_letter_found = true;
    return "Folded into a damaged file is a parent's unanswered letter asking why their child was marked discharged before anyone from the family had arrived. It proves the paper trail was altered after the fact.";
  }

  if (
    !hasSpecificClue(nextState, "ethics_memo_found") &&
    (broadEvidence || includesAny(text, ["memo", "ethics", "board", "reputation", "备忘录", "伦理", "声誉", "校董"]))
  ) {
    nextState.flags.ethics_memo_found = true;
    return "An internal memo warns that public incidents involving unstable students could damage rankings, donations, and cooperation agreements. It recommends tighter cross-department handling and stricter documentation discipline.";
  }

  return "";
}

function addInfirmaryCorroboration(nextState: GameState, text: string, success: boolean) {
  if (!success) return "";
  if (!nextState.flags.night_shift_log_found) return "";

  const broadEvidence = isObservationIntent(text) || isEvidenceIntent(text) || isPersuasionIntent(text) || isWillpowerIntent(text);

  if (
    !hasSpecificClue(nextState, "night_transfer_schedule_found") &&
    (broadEvidence || includesAny(text, ["schedule", "timetable", "night transfer", "时间表", "夜班", "转运"]))
  ) {
    nextState.flags.night_transfer_schedule_found = true;
    return "The player uncovers a night transfer schedule showing that selected students were moved between 2:10 and 4:30 a.m., after public logs had already been closed and before day staff arrived.";
  }

  if (
    !hasSpecificClue(nextState, "sedation_protocol_found") &&
    (broadEvidence || includesAny(text, ["sedation", "dose", "protocol", "medication", "镇静", "剂量", "流程"]))
  ) {
    nextState.flags.sedation_protocol_found = true;
    return "A sedation protocol sheet lays out dosage escalation tied to resistance, eye contact, speech volume, and refusal. Care was being calibrated for obedience rather than recovery.";
  }

  if (
    !hasSpecificClue(nextState, "training_manual_found") &&
    (broadEvidence || includesAny(text, ["manual", "training", "memo", "assessment", "手册", "培训", "备忘录"]))
  ) {
    nextState.flags.training_manual_found = true;
    return "A staff training manual teaches that strict quiet, mechanical restraint, and emotional distance are signs of professional discipline during high-risk student management.";
  }

  if (
    !hasSpecificClue(nextState, "dosage_variance_found") &&
    (broadEvidence || includesAny(text, ["variance", "dosage", "ampoule", "记录差异", "药量", "安瓿"]))
  ) {
    nextState.flags.dosage_variance_found = true;
    return "A dosage variance sheet shows repeated corrections made after dawn. The visible chart records mild observation. The sealed sheet records heavier sedative use and longer immobilization.";
  }

  if (
    !hasSpecificClue(nextState, "incident_photo_found") &&
    (broadEvidence || includesAny(text, ["photo", "camera", "polaroid", "照片", "相机", "拍立得"]))
  ) {
    nextState.flags.incident_photo_found = true;
    return "Tucked behind a supply cabinet is a blurred incident photo: a restrained student on a narrow bed, the timestamp clipped, the infirmary curtain visible, and a transfer trolley waiting just outside frame.";
  }

  return "";
}

function basementTruthReady(state: GameState) {
  return state.flags.evidence_folder_found && basementClueCount(state) >= 3;
}

function infirmaryTruthReady(state: GameState) {
  return state.flags.night_shift_log_found && infirmaryClueCount(state) >= 3;
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
      nextState.character.inventory = addUniqueItem(nextState.character.inventory, "Crumpled Map");
      logicNote =
        "Near the side entrance, the player finds a crumpled utility map and a torn withdrawal slip stamped after midnight. It suggests students were not leaving through the main gate at all, but through the service side of the campus.";
    }

    if (isMoveIntent(text)) {
      nextState.flags.found_gate_clue = true;
      nextState.currentScene = "hallway";
      logicNote =
        success
          ? "The player gets past the entrance and steps into a dark hallway. The building feels organized rather than chaotic, as if someone expected these late-night movements."
          : "The player forces their way through the side entrance and stumbles into a dark hallway, drawing attention and raising the pressure around the investigation.";
    }
  }

  if (nextState.currentScene === "hallway") {
    if ((isObservationIntent(text) || isPersuasionIntent(text) || isMoveIntent(text)) && !nextState.flags.archive_hint) {
      nextState.flags.archive_hint = true;
      logicNote =
        "By following the draft, old floor signs, and faint lift noise, the player identifies the archive corridor. Someone built a route from record keeping to transport, not from care to recovery.";
    }

    if (isPersuasionIntent(text) && success && !nextState.flags.archive_unlocked) {
      nextState.flags.archive_unlocked = true;
      logicNote =
        "A frightened caretaker voice or half-heard reply confirms that the archive was used to alter disciplinary files before students were moved elsewhere.";
    }

    if (
      includesAny(text, [
        "archive","档案室","follow the sign","follow the draft","marked door","deeper inside","继续往里","顺着标记",
      ]) ||
      (isMoveIntent(text) && nextState.flags.archive_hint)
    ) {
      nextState.flags.archive_hint = true;
      nextState.currentScene = "archive";
      logicNote =
        "The player reaches the archive room, where dusty cabinets and reorganized files suggest records were rewritten before anyone was ever declared missing.";
    }
  }

  if (nextState.currentScene === "archive") {
    if (isEvidenceIntent(text) && !nextState.flags.evidence_folder_found) {
      nextState.flags.basement_unlocked = true;
      nextState.flags.evidence_found = true;
      nextState.flags.evidence_folder_found = true;
      nextState.character.inventory = addUniqueItem(nextState.character.inventory, "Evidence Folder");
      nextState.character.inventory = addUniqueItem(nextState.character.inventory, "Basement Passcard");
      logicNote =
        success
          ? "Inside the archive, the player recovers an evidence folder and a basement passcard. The folder is enough to show that students were relabeled as disciplinary risks before being removed from the normal record system."
          : "Even under pressure, the player tears enough material free to recover an evidence folder and basement passcard. The surviving paperwork still shows that records were altered before students were declared gone.";
    } else if (isEvidenceIntent(text) && !nextState.flags.basement_transfer_route_found) {
      nextState.flags.basement_transfer_route_found = true;
      logicNote =
        success
          ? "A second pass through the archive reveals the missing chain: infirmary intake, archive revision, service lift movement, and basement holding. It is no longer just a disappearance. It is a route."
          : "The player cannot sort every file cleanly, but still reconstructs the route well enough to see that the basement was part of a controlled transfer chain.";
    }

    if (
      includesAny(text, ["basement","downstairs","elevator","lower level","地下室","下楼","电梯"]) ||
      (isMoveIntent(text) && nextState.flags.basement_unlocked && nextState.flags.basement_transfer_route_found)
    ) {
      if (nextState.flags.basement_unlocked && nextState.flags.basement_transfer_route_found) {
        nextState.currentScene = "basement";
        logicNote =
          "The player takes the way down into the basement. The cold air, chemical smell, and freight markings make it clear this place was built for controlled movement, not storage.";
      } else if (!logicNote) {
        logicNote =
          "The basement access exists, but the archive still holds unanswered gaps. The player needs to reconstruct the transfer route before the descent means anything.";
      }
    }

    if (isEndingIntent(text) && hasEvidence(nextState)) {
      nextState.isFinished = true;
      nextState.flags.escaped_with_evidence = true;
      nextState.flags.extracted_alive = true;
      logicNote =
        "The player leaves with the paper trail intact. Even without the deepest records, the archive already proves students were administratively erased before being transferred.";
    }
  }

  if (nextState.currentScene === "basement") {
    const corroborationNote = addBasementCorroboration(nextState, text, success);
    if (corroborationNote) {
      logicNote = corroborationNote;
    }

    const truthIntent =
      includesAny(text, [
        "master ledger","hidden office","steel cabinet","compare records","reconstruct the chain","who signed this","why were they moved",
        "真正的记录","总账","隐藏办公室","钢柜","比对记录","追查链条","谁签了字","为什么被转移",
      ]) ||
      (isEvidenceIntent(text) && basementTruthReady(nextState)) ||
      (isWillpowerIntent(text) && basementTruthReady(nextState));

    if (truthIntent) {
      if (success && basementTruthReady(nextState)) {
        nextState.isFinished = true;
        nextState.flags.truth_found = true;
        nextState.flags.basement_experiment_found = true;
        nextState.flags.systemic_pressure_found = true;
        logicNote =
          "When the player compares the manifest, restraint packet, partner contract, family complaint, and ethics memo, the basement record becomes legible. Students marked unstable, defiant, or reputationally risky were first routed through infirmary observation, sedated under observation codes, then moved by service lift to a privately supervised behavior lab. The program measured obedience, stress tolerance, and emotional suppression while being justified as safety, campus order, and performance protection. The cruelty was procedural, not chaotic.";
      } else if (hasEvidence(nextState)) {
        nextState.isFinished = true;
        nextState.flags.escaped_with_evidence = true;
        nextState.flags.extracted_alive = true;
        logicNote =
          "The player cannot secure the full basement chain, but escapes with enough evidence to show that disappearance here was systematic: paperwork revision, controlled sedation, basement transfer, and off-book behavioral management.";
      } else {
        nextState.isFinished = true;
        nextState.flags.overwhelmed = true;
        logicNote =
          "The basement closes in before the player can secure proof. Even so, the fragments suggest this was never a single kidnapping, but a system for quietly processing inconvenient students.";
      }
    }

    if (isEndingIntent(text) && hasEvidence(nextState)) {
      nextState.isFinished = true;
      nextState.flags.escaped_with_evidence = true;
      nextState.flags.extracted_alive = true;
      if (!logicNote) {
        logicNote =
          "The player retreats from the basement with enough evidence to expose the transfer route and the hidden program, even without collecting every final document.";
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
      nextState.character.inventory = addUniqueItem(nextState.character.inventory, "Clinic Floor Plan");
      logicNote =
        "Near the boarded window, the player finds a faded floor plan and a disposal timetable. It suggests the infirmary wing had its own after-hours route for moving patients without using the main corridor.";
    }

    if (isMoveIntent(text)) {
      nextState.flags.found_courtyard_clue = true;
      nextState.currentScene = "clinic_hall";
      logicNote =
        success
          ? "The player reaches the clinic hall, where cracked cabinets and fluorescent hum make the space feel more procedural than humane."
          : "The player squeezes or forces their way into the infirmary wing, reaching the clinic hall while setting off more danger in the process.";
    }
  }

  if (nextState.currentScene === "clinic_hall") {
    if ((isObservationIntent(text) || isPersuasionIntent(text) || isMoveIntent(text)) && !nextState.flags.infirmary_hint) {
      nextState.flags.infirmary_hint = true;
      logicNote =
        "The player spots the infirmary door, a quarantine sign, and coded wall marks showing certain students were routed away from ordinary treatment and into controlled observation.";
    }

    if (isPersuasionIntent(text) && success && !nextState.flags.infirmary_unlocked) {
      nextState.flags.infirmary_unlocked = true;
      logicNote =
        "A trembling voice from the intercom confirms that the nurse kept separate records for the night shift. Public charts showed fever or panic. The hidden ledger tracked restraint, dosage, and transfer readiness.";
    }

    if (
      includesAny(text, [
        "infirmary","clinic room","nurse room","医务室","诊室","门牌","quarantine sign","door with light",
      ]) ||
      (isMoveIntent(text) && nextState.flags.infirmary_hint)
    ) {
      nextState.flags.infirmary_hint = true;
      nextState.currentScene = "infirmary";
      logicNote =
        "The player enters the infirmary, where overturned beds, medical trays, and a half-open desk suggest treatment here often ended in paperwork rather than recovery.";
    }
  }

  if (nextState.currentScene === "infirmary") {
    if (isEvidenceIntent(text) && !nextState.flags.night_shift_log_found) {
      nextState.flags.quarantine_unlocked = true;
      nextState.flags.evidence_found = true;
      nextState.flags.night_shift_log_found = true;
      nextState.character.inventory = addUniqueItem(nextState.character.inventory, "Medical Ledger");
      nextState.character.inventory = addUniqueItem(nextState.character.inventory, "Quarantine Keycard");
      logicNote =
        success
          ? "Inside the nurse's desk, the player finds a medical ledger and a quarantine keycard. The ledger shows students logged as fever, panic, or observation cases, then quietly reassigned to restricted rooms and removed from the public register before dawn."
          : "Even in a rushed search, the player pulls out a medical ledger and quarantine keycard. The entries still make one thing clear: students were not discharged, but administratively converted into off-book cases before transfer.";
    } else if (isEvidenceIntent(text) && !nextState.flags.infirmary_transfer_route_found) {
      nextState.flags.infirmary_transfer_route_found = true;
      logicNote =
        success
          ? "A second sweep through the infirmary links the ledger to room numbers, sedative drawers, and trolley routes. It becomes clear that the ward did not merely observe students. It staged them for transfer."
          : "The player cannot fully sort the infirmary paperwork, but still pieces together that the ward's records and physical layout were designed to support controlled overnight movement.";
    }

    if (
      includesAny(text, ["quarantine","sealed room","back room","隔离室","封闭房间","后面的门"]) ||
      (isMoveIntent(text) && nextState.flags.quarantine_unlocked && nextState.flags.infirmary_transfer_route_found)
    ) {
      if (nextState.flags.quarantine_unlocked && nextState.flags.infirmary_transfer_route_found) {
        nextState.currentScene = "quarantine_room";
        logicNote =
          "The player enters the quarantine room. The air smells of antiseptic and old sedatives, and the layout makes it obvious this space was used to contain people, not heal them.";
      } else if (!logicNote) {
        logicNote =
          "The quarantine room is there, but entering it blindly would miss the point. The player still needs to understand how the ward prepared students for night transfer.";
      }
    }

    if (isEndingIntent(text) && hasEvidence(nextState)) {
      nextState.isFinished = true;
      nextState.flags.escaped_with_evidence = true;
      nextState.flags.extracted_alive = true;
      logicNote =
        "The player leaves with the ledger intact. Even without opening the deepest room, the records already show how care was converted into a transfer pipeline.";
    }
  }

  if (nextState.currentScene === "quarantine_room") {
    const corroborationNote = addInfirmaryCorroboration(nextState, text, success);
    if (corroborationNote) {
      logicNote = corroborationNote;
    }

    const truthIntent =
      includesAny(text, [
        "sealed cabinet","master protocol","compare ledgers","follow the signatures","why the night shift exists","master file",
        "密封柜","总协议","比对账本","追查签字","夜班为什么存在","总档案",
      ]) ||
      (isEvidenceIntent(text) && infirmaryTruthReady(nextState)) ||
      (isWillpowerIntent(text) && infirmaryTruthReady(nextState));

    if (truthIntent) {
      if (success && infirmaryTruthReady(nextState)) {
        nextState.isFinished = true;
        nextState.flags.truth_found = true;
        nextState.flags.infirmary_experiment_found = true;
        nextState.flags.systemic_pressure_found = true;
        logicNote =
          "When the player compares the night transfer schedule, sedation sheet, training manual, dosage variance, and incident photo, the ward's logic becomes explicit. Students flagged as unstable, disruptive, self-harming, or reputationally risky were isolated, medicated, scored for compliance, and transferred before dawn to partner wards. The program was framed as resilience optimization and crisis prevention, but functioned as behavior control. Staff manuals show overworked personnel were trained to treat silence, restraint, and dosage discipline as professional success.";
      } else if (hasEvidence(nextState)) {
        nextState.isFinished = true;
        nextState.flags.escaped_with_evidence = true;
        nextState.flags.extracted_alive = true;
        logicNote =
          "The player cannot secure every sealed record, but escapes with enough material to prove the pattern: students entered under ordinary medical labels, were isolated under night protocols, and became test subjects in a punitive treatment system.";
      } else {
        nextState.isFinished = true;
        nextState.flags.overwhelmed = true;
        logicNote =
          "The quarantine room becomes unmanageable before the player can carry proof out. Even so, the room makes the moral shape of the system clear: people were processed as liabilities, not patients.";
      }
    }

    if (isEndingIntent(text) && hasEvidence(nextState)) {
      nextState.isFinished = true;
      nextState.flags.escaped_with_evidence = true;
      nextState.flags.extracted_alive = true;
      if (!logicNote) {
        logicNote =
          "The player escapes the infirmary wing with enough records to expose how the medical system separated, tracked, and transferred students under the language of care.";
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
