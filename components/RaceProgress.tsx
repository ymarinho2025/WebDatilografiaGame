export type RaceMarker = {
  kind: "self" | "opponent" | "bot";
  label: string;
  name: string;
  progress: number;
  wpm?: number;
  cpm?: number;
  score?: number;
  lives?: number;
};

type RaceProgressProps = {
  markers: RaceMarker[];
};

export default function RaceProgress({ markers }: RaceProgressProps) {
  return (
    <section className="raceBox" aria-label="Progresso da frase">
      <div className="raceLabel">
        <span>corrida da frase</span>
        <span>fim</span>
      </div>

      <div className="raceLine">
        {markers.map((marker) => {
          const left = `${Math.max(0, Math.min(100, marker.progress * 100))}%`;
          return (
            <div
              key={`${marker.kind}-${marker.name}-${marker.label}`}
              className={`raceMarker ${marker.kind}`}
              style={{ left }}
              title={`${marker.name} - ${(marker.progress * 100).toFixed(0)}%`}
            >
              {marker.label}
            </div>
          );
        })}
      </div>

      <div className="raceNames">
        {markers.map((marker) => (
          <span key={`${marker.kind}-${marker.name}-name`} className={marker.kind}>
            {marker.label}: {marker.name}
          </span>
        ))}
      </div>
    </section>
  );
}
