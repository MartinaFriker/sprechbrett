// Simple maths question that guards the parent area from the child.

// Map a random number in [0, 1) onto an integer in [min, max].
const pick = (rand, min, max) => min + Math.floor(rand() * (max - min + 1));

export function makeChallenge(rand = Math.random) {
  if (rand() < 0.5) {
    const a = pick(rand, 2, 9);
    const b = pick(rand, 2, 9);
    return { question: `${a} + ${b} = ?`, answer: a + b };
  }
  const a = pick(rand, 2, 6);
  const b = pick(rand, 2, 6);
  return { question: `${a} × ${b} = ?`, answer: a * b };
}
