export type SignalTone = "positive" | "watch" | "risk";

export function marketSignal(input: { probability: number; fairValue: number; confidence: number }): { label: string; tone: SignalTone } {
  const edge = input.fairValue - input.probability;
  if (input.confidence >= 0.65 && edge >= 0.05) return { label: "Enter", tone: "positive" };
  if (input.confidence < 0.65 || Math.abs(edge) < 0.05) return { label: "Watch", tone: "watch" };
  return { label: "Avoid", tone: "risk" };
}
