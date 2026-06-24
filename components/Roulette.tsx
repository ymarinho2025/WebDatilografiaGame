type RouletteProps = {
  visible: boolean;
  current: number | null;
  critical: number;
  resultText: string;
};

export default function Roulette({ visible, current, critical, resultText }: RouletteProps) {
  if (!visible && !current) {
    return <div className="rouletteStatus">Roleta de risco: —</div>;
  }

  return (
    <div className="rouletteWrap">
      <div className="roulette">
        {[1, 2, 3, 4, 5, 6].map((number) => (
          <div
            key={number}
            className={`rouletteNumber ${current === number ? "active" : ""} ${
              current === number && current === critical ? "critical" : ""
            }`}
          >
            {number}
          </div>
        ))}
      </div>
      <div className="rouletteStatus">
        Roleta de risco: {current ?? "—"} {resultText ? `| ${resultText}` : ""}
      </div>
    </div>
  );
}
