type TypewriterSceneProps = {
  title: string;
  source: string;
  lines: string[];
  lineIndex: number;
  typedLine: string;
  wrongChar: string | null;
  lineReady: boolean;
  carriageLeft: boolean;
};

export default function TypewriterScene({
  title,
  source,
  lines,
  lineIndex,
  typedLine,
  wrongChar,
  lineReady,
  carriageLeft
}: TypewriterSceneProps) {
  const blockStart = Math.floor(lineIndex / 3) * 3;
  const visibleLines = lines.slice(blockStart, blockStart + 3);

  return (
    <section className="scene">
      <div className="stars" />

      <div className="farol">
        <div className="roof" />
        <div className="tower">
          <span />
        </div>
        <div className="beam" />
      </div>

      <div className="desk">
        <div className={`paper ${lineReady ? "ready" : ""} ${carriageLeft ? "leftReturn" : ""}`}>
          <div className="phaseTitle">FASE: {title.toUpperCase()}</div>
          <div className="phaseSource">{source}</div>

          <div className="paperLines">
            {visibleLines.map((line, localIndex) => {
              const realIndex = blockStart + localIndex;
              const finished = realIndex < lineIndex;
              const current = realIndex === lineIndex;

              if (!current) {
                return (
                  <div key={realIndex} className={`line ${finished ? "done" : ""}`}>
                    {line}
                  </div>
                );
              }

              return (
                <div key={realIndex} className="line current">
                  {line.split("").map((char, index) => {
                    let cls = "pending";
                    let display = char;

                    if (index < typedLine.length) cls = "typed";
                    else if (index === typedLine.length && wrongChar) {
                      cls = "wrong";
                      display = wrongChar;
                    } else if (index === typedLine.length) cls = "next";

                    return (
                      <span key={`${index}-${char}`} className={cls}>
                        {display}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {lineReady && <div className="paperDots">...</div>}
        </div>

        <div className="typewriter">
          <div className="roller" />
          <div className="machineText">A MÁQUINA ESCUTA CADA TOQUE</div>
          <Keyboard />
        </div>
      </div>
    </section>
  );
}

function Keyboard() {
  const rows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
  return (
    <div className="keyboard">
      {rows.map((row) => (
        <div className="keyRow" key={row}>
          {row.split("").map((key) => (
            <span className="key" key={key}>
              {key.toUpperCase()}
            </span>
          ))}
        </div>
      ))}
      <div className="spaceKey">ESPAÇO</div>
    </div>
  );
}
