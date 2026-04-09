import { GameState } from "@/types/game";

export type StoryImageConfig = {
  src: string;
  fileName: string;
  title?: string;
  alt: string;
  caption?: string;
  promptKey?: string;
};

const IMAGES = {
  gateExterior: {
    src: "/story/st-alden/sa_01_gate_exterior_v1.png",
    fileName: "sa_01_gate_exterior_v1.png",
    title: "Ruined Main Entrance",
    alt: "The burned exterior of St. Alden Residential Academy at dusk",
    caption: "The first approach to St. Alden should feel broad, cold, and abandoned, with enough readable architecture to anchor the player in a real place.",
    promptKey: "P01_GATE_EXTERIOR",
  },
  gateTrace: {
    src: "/story/st-alden/sa_02_gate_explorer_trace_v1.png",
    fileName: "sa_02_gate_explorer_trace_v1.png",
    //title: "Explorer Trace at the Gate",
    alt: "Ropes, dust, flashlights, and fresh disturbance at the ruined academy entrance",
    //caption: "Use this after the player confirms the recent intrusion, so the school stops feeling like a distant ruin and starts feeling actively disturbed.",
    //promptKey: "P02_GATE_TRACE",
  },
  hallwayMemory: {
    src: "/story/st-alden/sa_03_hallway_memory_v1.png",
    fileName: "sa_03_hallway_memory_v1.png",
    title: "Burned Corridor and Returning Memory",
    alt: "A long burned school corridor with lockers, ash, and a faint uncanny familiarity",
    caption: "This is the first inward shift: the school is not only dangerous, but personally familiar to the player.",
    promptKey: "P03_HALLWAY_MEMORY",
  },
  archiveRecords: {
    src: "/story/st-alden/sa_04_archive_erased_records_v1.png",
    fileName: "sa_04_archive_erased_records_v1.png",
    title: "Archive of Erased Students",
    alt: "Charred student files, half-burned class photos, and altered records in a hidden archive",
    caption: "Show systematic erasure rather than generic horror. This image should imply administrative violence: folders, removals, replacements, and missing faces.",
    promptKey: "P04_ARCHIVE_RECORDS",
  },
  lucasWall: {
    src: "/story/st-alden/sa_05_lucas_clue_wall_v1.png",
    fileName: "sa_05_lucas_clue_wall_v1.png",
    title: "Lucas's Hidden Clue Fragments",
    alt: "Cryptic marks, arrows, scratched lines, and note fragments hidden around an old dorm wall",
    caption: "This is a clue image rather than a landscape image. It should feel intimate, human, and desperate.",
    promptKey: "P05_LUCAS_WALL",
  },
  clinicHall: {
    src: "/story/st-alden/sa_06_clinic_outer_hall_v1.png",
    fileName: "sa_06_clinic_outer_hall_v1.png",
    title: "Outer Treatment Hall",
    alt: "A dim student wellness corridor with faded encouragement posters and sealed treatment doors",
    caption: "This scene should still read as plausible institutional care at first glance, with the wrongness kept just beneath the surface.",
    promptKey: "P06_CLINIC_HALL",
  },
  wellnessLobby: {
    src: "/story/st-alden/sa_07_wellness_lobby_v1.png",
    fileName: "sa_07_wellness_lobby_v1.png",
    title: "Student Wellness Center",
    alt: "A quiet ruined wellness center lobby with records, treatment signage, and old medical debris",
    caption: "This is where the mask of care and the machinery of control overlap most clearly.",
    promptKey: "P07_WELLNESS_LOBBY",
  },
  ninaMark: {
    src: "/story/st-alden/sa_08_nina_mark_detail_v1.png",
    fileName: "sa_08_nina_mark_detail_v1.png",
    title: "Nina's Repeated Marks",
    alt: "A close-up of repeated tiny marks on a cabinet, door frame, and observation sheet",
    caption: "Use this when Nina's small interventions become legible to the player. It should feel fragile and deliberate.",
    promptKey: "P08_NINA_MARK",
  },
  basementCore: {
    src: "/story/st-alden/sa_09_basement_treatment_core_v1.png",
    fileName: "sa_09_basement_treatment_core_v1.png",
    title: "Underground Treatment Core",
    alt: "A hidden underground treatment core with observation beds, restraints, and sample numbering",
    caption: "This is the first full confirmation that the school was part of a controlled experimental system.",
    promptKey: "P09_BASEMENT_CORE",
  },
  quarantineWing: {
    src: "/story/st-alden/sa_10_quarantine_sample_wing_v1.png",
    fileName: "sa_10_quarantine_sample_wing_v1.png",
    title: "Hidden Sample Wing",
    alt: "A sealed lower wing with numbered rooms, restraint equipment, and institutional decay",
    caption: "The hidden wing should feel colder, more modular, and less human than the outer treatment areas.",
    promptKey: "P10_QUARANTINE_WING",
  },
  identityReveal: {
    src: "/story/st-alden/sa_11_identity_reveal_record_v1.png",
    fileName: "sa_11_identity_reveal_record_v1.png",
    title: "Release Approval and Identity Reveal",
    alt: "A recovered file naming the player as a successful sample, with release approval and tracking notes",
    caption: "This should not look like a jump scare. It should look precise, documented, and devastating.",
    promptKey: "P11_IDENTITY_REVEAL",
  },
  escapeTunnel: {
    src: "/story/st-alden/sa_12_escape_fire_tunnel_v1.png",
    fileName: "sa_12_escape_fire_tunnel_v1.png",
    title: "Escape Route Under Fire",
    alt: "A final underground route toward the surface, lit by emergency lights, smoke, and collapsing debris",
    caption: "Use this once the truth is known and the remaining question is what the player can still carry out of the school.",
    promptKey: "P12_ESCAPE_TUNNEL",
  },
  truthEscape: {
    src: "/story/st-alden/sa_13_truth_escape_dawn_v1.png",
    fileName: "sa_13_truth_escape_dawn_v1.png",
    title: "Dawn After Extraction",
    alt: "The school grounds at cold dawn after escape, with evidence in hand and the case exposed",
    caption: "This is the successful ending image. It should feel exhausted rather than triumphant.",
    promptKey: "P13_TRUTH_ESCAPE",
  },
  lockedSystem: {
    src: "/story/st-alden/sa_14_locked_system_end_v1.png",
    fileName: "sa_14_locked_system_end_v1.png",
    title: "Sealed Back Into the System",
    alt: "A dark institutional interior closing shut, with surveillance glass and sealed doors",
    caption: "This is the failed ending image. The feeling should be containment, not gore.",
    promptKey: "P14_LOCKED_SYSTEM",
  },
} as const;

export function getStoryImageConfig(state: GameState): StoryImageConfig {
  const isBasement = state.scenario === "basement_case";

  if (state.isFinished) {
    if (state.summary?.outcome === "truth_found" || state.summary?.outcome === "extracted") {
      return IMAGES.truthEscape;
    }
    return IMAGES.lockedSystem;
  }

  if (state.flags.truth_found || state.flags.release_record_found || state.flags.escape_log_found) {
    return state.flags.escaped_with_evidence ? IMAGES.escapeTunnel : IMAGES.identityReveal;
  }

  if (isBasement) {
    if (state.currentScene === "basement" || state.flags.basement_experiment_found || state.flags.lucas_map_completed) {
      return IMAGES.basementCore;
    }
    if (state.currentScene === "archive") {
      return state.flags.evidence_folder_found ? IMAGES.lucasWall : IMAGES.archiveRecords;
    }
    if (state.flags.memory_trigger_found || state.currentScene === "hallway") {
      return IMAGES.hallwayMemory;
    }
    if (state.flags.found_gate_clue) {
      return IMAGES.gateTrace;
    }
    return IMAGES.gateExterior;
  }

  if (state.currentScene === "quarantine_room" || state.flags.infirmary_experiment_found || state.flags.nina_mark_sequence_found) {
    return state.currentScene === "quarantine_room" ? IMAGES.quarantineWing : IMAGES.ninaMark;
  }
  if (state.currentScene === "infirmary") {
    return state.flags.night_shift_log_found ? IMAGES.ninaMark : IMAGES.wellnessLobby;
  }
  if (state.flags.memory_trigger_found || state.currentScene === "clinic_hall") {
    return IMAGES.clinicHall;
  }
  if (state.flags.found_courtyard_clue) {
    return IMAGES.ninaMark;
  }
  return IMAGES.wellnessLobby;
}
