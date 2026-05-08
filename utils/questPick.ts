import { SIDE_QUESTS } from '@/constants/quests';

/**
 * Picks the next side quest in catalog order, skipping ids already used this round.
 * When every quest has been used, clears the round and starts again from the first quest.
 */
export function pickQuestForDay(
  _dayKey: string,
  _assigneeId: string,
  used: Set<string>,
): { questId: string; questText: string; questTier: 'easy' | 'medium' | 'hard'; nextUsed: string[] } {
  if (!SIDE_QUESTS.length) {
    throw new Error('No side quests configured.');
  }

  let nextUsed = [...used];
  let quest = SIDE_QUESTS.find((q) => !used.has(q.id)) ?? null;

  if (!quest) {
    nextUsed = [];
    quest = SIDE_QUESTS[0];
  }

  if (!nextUsed.includes(quest.id)) {
    nextUsed.push(quest.id);
  }

  return { questId: quest.id, questText: quest.text, questTier: quest.tier, nextUsed };
}
