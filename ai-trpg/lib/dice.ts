import { DiceResult } from "@/types/game";

export function rollD20(modifier = 0): DiceResult {
  const raw = Math.floor(Math.random() * 20) + 1;
  const total = raw + modifier;

  let outcome: DiceResult["outcome"] = "fail";

  if (raw === 20 || total >= 18) {
    outcome = "great_success";
  } else if (raw !== 1 && total >= 10) {
    outcome = "success";
  }

  return {
    expression: `1d20${modifier >= 0 ? "+" : ""}${modifier}`,
    raw,
    modifier,
    total,
    outcome,
  };
}
