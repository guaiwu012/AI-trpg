export type Role = "detective" | "hacker" | "priest";
export type Skill = "observation" | "persuasion" | "willpower";
export type ScenarioId = "basement_case" | "infirmary_case";
export type GameMode = "short" | "long";

export type SceneId =
  | "gate"
  | "hallway"
  | "archive"
  | "basement"
  | "courtyard"
  | "clinic_hall"
  | "infirmary"
  | "quarantine_room";

export type MessageRole = "system" | "narrator" | "npc" | "player";

export type Message = {
  role: MessageRole;
  text: string;
};

export type DiceOutcome = "fail" | "success" | "great_success";

export type DiceResult = {
  expression: string;
  raw: number;
  modifier: number;
  total: number;
  outcome: DiceOutcome;
};

export type Character = {
  role: Role;
  name: string;
  hp: number;
  observation: number;
  persuasion: number;
  willpower: number;
  inventory: string[];
};

export type SummaryOutcome = "extracted" | "truth_found" | "overwhelmed" | "unfinished";

export type SessionSummary = {
  title: string;
  outcome: SummaryOutcome;
  storySummary: string;
  keyFindings: string[];
};

export type GameState = {
  sessionId: string;
  world: string;
  scenario: ScenarioId;
  gameMode: GameMode;
  currentScene: SceneId;
  character: Character;
  flags: Record<string, boolean>;
  log: Message[];
  lastRoll?: DiceResult;
  isFinished: boolean;
  turnCount: number;
  danger: number;
  maxDanger: number;
  summary?: SessionSummary;
};

export type ActionCheck = {
  requiresRoll: boolean;
  skill?: Skill;
  reason?: string;
};
