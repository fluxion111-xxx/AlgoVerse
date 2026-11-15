import type { KnowledgeTopic } from "@/lib/knowledge";

export type Teaching = NonNullable<KnowledgeTopic["teaching"]>;
type Exercise = {
  id: string;
  prompt: string;
  options: readonly string[];
  answer: number;
  explanation: string;
};

export function lesson(
  difficulty: Teaching["difficulty"], objective: string, example: string, misconception: string,
  exercise: Exercise, reference?: Teaching["reference"],
): Teaching {
  return { difficulty, objectives: [objective], examples: [example], misconceptions: [misconception], exercises: [exercise], reference };
}
