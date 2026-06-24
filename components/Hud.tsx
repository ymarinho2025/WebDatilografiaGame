type HudProps = {
  lives: number;
  score: number;
  phaseTitle: string;
  phaseNumber: number;
  totalPhases: number;
  wpm: number;
  cpm: number;
  accuracy: number;
  timeLeft: number;
  botStats: string;
  roomCode: string | null;
  playerName: string;
};

export default function Hud({
  lives,
  score,
  phaseTitle,
  phaseNumber,
  totalPhases,
  wpm,
  cpm,
  accuracy,
  timeLeft,
  botStats,
  roomCode,
  playerName
}: HudProps) {
  const hearts = "❤ ".repeat(lives) + "♡ ".repeat(Math.max(0, 3 - lives));

  return (
    <header className="hud">
      <div className="hudTop">
        <span className="danger">Vidas: {hearts}</span>
        <span>Pontos: {score}</span>
        <span>
          Fase {phaseNumber}/{totalPhases} | {phaseTitle}
        </span>
        <span>{playerName}</span>
        {roomCode && <span className="roomBadge">Sala: {roomCode}</span>}
        <span className="timer">Tempo: {Math.max(0, Math.ceil(timeLeft))}s</span>
      </div>

      <div className="hudStats">
        <span>Velocidade: {wpm.toFixed(1)} WPM</span>
        <span>{cpm.toFixed(1)} CPM</span>
        <span>Precisão: {accuracy.toFixed(1)}%</span>
        <span>{botStats}</span>
      </div>
    </header>
  );
}
