export type Bot = {
  id: string;
  name: string;
  wpm: number;
  cpm: number;
  delay: number;
  variation: number;
};

export type BotSnapshot = {
  kind: "bot";
  id: string;
  label: string;
  name: string;
  progress: number;
  wpm: number;
  cpm: number;
};

export function createBots(): Bot[] {
  return [
    {
      id: "ana",
      name: "NPC Ana",
      wpm: 12.55,
      cpm: 62.75,
      delay: 0.8,
      variation: 1
    },
    {
      id: "yuri",
      name: "NPC Yuri",
      wpm: 25.1,
      cpm: 125.5,
      delay: 0.5,
      variation: 1
    }
  ];
}

export function botSnapshots(bots: Bot[], phaseStartedAt: number, totalChars: number): BotSnapshot[] {
  const now = Date.now();
  const safeTotal = Math.max(1, totalChars);

  return bots.map((bot, index) => {
    const elapsed = Math.max(0, (now - phaseStartedAt) / 1000 - bot.delay);
    const charsDone = bot.cpm * bot.variation * (elapsed / 60);
    const progress = Math.max(0, Math.min(1, charsDone / safeTotal));

    return {
      kind: "bot",
      id: bot.id,
      label: `B${index + 1}`,
      name: bot.name,
      progress,
      wpm: bot.wpm,
      cpm: bot.cpm
    };
  });
}
