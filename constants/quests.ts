export type SideQuest = { id: string; text: string; tier: 'easy' | 'medium' | 'hard' };

/** Curated pool — IDs stable for persistence. Order is the rotation: day N+1 takes the next unused quest, then loops. */
export const SIDE_QUESTS: SideQuest[] = [
  {
    id: 'q1',
    text: 'Learn to do a backflip and record yourself doing it on camera.',
    tier: 'hard',
  },
  {
    id: 'q2',
    text: 'Touch Nature.',
    tier: 'easy',
  },
  {
    id: 'q3',
    text: 'Bottle flip challenge! Flip a water bottle 2 times in a row. If you fail then start from the beginning.',
    tier: 'medium',
  },
];

export function questById(id: string): SideQuest | undefined {
  return SIDE_QUESTS.find((q) => q.id === id);
}

/** Points awarded when a side quest is voted passed (by difficulty). */
export const QUEST_COMPLETION_POINTS: Record<SideQuest['tier'], number> = {
  easy: 3,
  medium: 6,
  hard: 10,
};

export function questCompletionPoints(tier: SideQuest['tier'] | undefined | null): number {
  if (tier === 'easy' || tier === 'hard') return QUEST_COMPLETION_POINTS[tier];
  return QUEST_COMPLETION_POINTS.medium;
}
