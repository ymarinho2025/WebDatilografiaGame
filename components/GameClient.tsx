"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Hud from "@/components/Hud";
import RaceProgress, { RaceMarker } from "@/components/RaceProgress";
import Roulette from "@/components/Roulette";
import TypewriterScene from "@/components/TypewriterScene";
import { BONUS_PHRASE, PHRASES, Phrase } from "@/lib/phrases";
import { botSnapshots, createBots } from "@/lib/bots";
import {
  completedChars,
  normalizeKey,
  shuffleArray,
  splitIntoLines,
  totalChars
} from "@/lib/text";
import {
  playError,
  playKey,
  playLifeLoss,
  playReturn,
  playRouletteTick,
  playSpace,
  playSuccess,
  startSuspenseLoop,
  stopSuspenseLoop
} from "@/lib/audio";

type GameStatus = "menu" | "playing" | "double" | "fake-loss" | "lost" | "won";

const MAX_LIVES = 3;

function lineTimeLimit(line: string): number {
  return Math.max(14, line.length * 0.35 + 6);
}

function calcWpm(chars: number, startedAt: number): number {
  const minutes = Math.max((Date.now() - startedAt) / 60000, 1 / 60);
  return chars / 5 / minutes;
}

function calcCpm(chars: number, startedAt: number): number {
  const minutes = Math.max((Date.now() - startedAt) / 60000, 1 / 60);
  return chars / minutes;
}

export default function GameClient() {
  const [status, setStatus] = useState<GameStatus>("menu");
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [typedLine, setTypedLine] = useState("");
  const [wrongChar, setWrongChar] = useState<string | null>(null);

  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [criticalNumber, setCriticalNumber] = useState(1);
  const [rouletteVisible, setRouletteVisible] = useState(false);
  const [rouletteCurrent, setRouletteCurrent] = useState<number | null>(null);
  const [rouletteText, setRouletteText] = useState("");

  const [locked, setLocked] = useState(false);
  const [lineReady, setLineReady] = useState(false);
  const [carriageLeft, setCarriageLeft] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [inBonus, setInBonus] = useState(false);

  const [correctKeys, setCorrectKeys] = useState(0);
  const [totalKeys, setTotalKeys] = useState(0);
  const [completedTotalChars, setCompletedTotalChars] = useState(0);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [lineStartedAt, setLineStartedAt] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(20);
  const [tick, setTick] = useState(0);

  const phaseStartedAt = useRef(Date.now());
  const bots = useMemo(() => createBots(), []);
  const lineTimeLimitRef = useRef(20);

  const currentPhrase = phrases[phaseIndex] ?? PHRASES[0];
  const currentLine = lines[lineIndex] ?? "";
  const phraseTotal = totalChars(lines);
  const phraseCompleted = completedChars(lines, lineIndex, typedLine);
  const playerProgress = phraseTotal > 0 ? phraseCompleted / phraseTotal : 0;

  const botStats = bots.map((bot) => `${bot.name}: ${bot.wpm.toFixed(2)} WPM / ${bot.cpm.toFixed(2)} CPM`).join(" | ");

  const markers: RaceMarker[] = useMemo(() => {
    const botMarkers = botSnapshots(bots, phaseStartedAt.current, phraseTotal);
    return [
      {
        kind: "self",
        label: "EU",
        name: "Você",
        progress: playerProgress
      },
      ...botMarkers
    ];
  }, [bots, phraseTotal, playerProgress, tick]);

  const resetTimerForLine = useCallback((line: string) => {
    const limit = lineTimeLimit(line);
    lineTimeLimitRef.current = limit;
    setTimeLeft(limit);
    setLineStartedAt(Date.now());
  }, []);

  const loadPhrase = useCallback(
    (index: number, sourcePhrases: Phrase[]) => {
      const phrase = sourcePhrases[index];
      const nextLines = splitIntoLines(phrase.text);

      setLines(nextLines);
      setLineIndex(0);
      setTypedLine("");
      setWrongChar(null);
      setLocked(false);
      setLineReady(false);
      setCarriageLeft(false);
      phaseStartedAt.current = Date.now();
      resetTimerForLine(nextLines[0] ?? "");
    },
    [resetTimerForLine]
  );

  const startGame = useCallback(() => {
    const shuffled = shuffleArray(PHRASES);
    const critical = Math.floor(Math.random() * 6) + 1;

    setPhrases(shuffled);
    setPhaseIndex(0);
    setLives(MAX_LIVES);
    setScore(0);
    setCriticalNumber(critical);
    setStatus("playing");
    setMultiplier(1);
    setInBonus(false);
    setCorrectKeys(0);
    setTotalKeys(0);
    setCompletedTotalChars(0);
    setStartedAt(Date.now());
    setRouletteVisible(false);
    setRouletteCurrent(null);
    setRouletteText("");

    startSuspenseLoop();
    loadPhrase(0, shuffled);
  }, [loadPhrase]);

  const goNextPhase = useCallback(() => {
    const nextIndex = phaseIndex + 1;

    if (nextIndex >= phrases.length && !inBonus) {
      setStatus("double");
      setLocked(true);
      return;
    }

    if (nextIndex >= phrases.length && inBonus) {
      setStatus("won");
      setLocked(true);
      stopSuspenseLoop();
      return;
    }

    setPhaseIndex(nextIndex);
    loadPhrase(nextIndex, phrases);
  }, [phaseIndex, phrases, inBonus, loadPhrase]);

  const completeLine = useCallback(() => {
    const elapsed = Math.max((Date.now() - lineStartedAt) / 1000, 0.1);
    const gained = Math.round((110 + currentLine.length * 4 + Math.max(0, 12 - elapsed) * 10) * multiplier);

    setScore((old) => old + gained);
    setCompletedTotalChars((old) => old + currentLine.length);
    playSuccess();

    const nextLineIndex = lineIndex + 1;
    if (nextLineIndex >= lines.length) {
      setLocked(true);
      window.setTimeout(goNextPhase, 800);
      return;
    }

    setLineIndex(nextLineIndex);
    setTypedLine("");
    setWrongChar(null);
    setLocked(true);
    setLineReady(true);
    setCarriageLeft(true);
    playReturn();

    window.setTimeout(() => {
      setLineReady(false);
      setCarriageLeft(false);
      setLocked(false);
      resetTimerForLine(lines[nextLineIndex] ?? "");
    }, 1000);
  }, [currentLine.length, lineIndex, lines, lineStartedAt, multiplier, goNextPhase, resetTimerForLine]);

  const spinRoulette = useCallback(() => {
    setLocked(true);
    setRouletteVisible(true);
    setRouletteText("");

    const finalNumber = Math.floor(Math.random() * 6) + 1;
    let step = 0;
    const totalSteps = 18 + Math.floor(Math.random() * 10);

    const interval = window.setInterval(() => {
      step += 1;
      const value = ((step - 1) % 6) + 1;
      setRouletteCurrent(value);
      playRouletteTick();

      if (step >= totalSteps) {
        window.clearInterval(interval);
        setRouletteCurrent(finalNumber);

        if (finalNumber === criticalNumber) {
          playLifeLoss();
          setLives((old) => {
            const next = Math.max(0, old - 1);
            if (next <= 0) {
              setRouletteText("VOCÊ PERDEU UMA VIDA");
              window.setTimeout(() => {
                setStatus("lost");
                stopSuspenseLoop();
              }, 900);
              return next;
            }
            return next;
          });
          setRouletteText("VOCÊ PERDEU UMA VIDA");
        } else {
          setRouletteText("seguro");
        }

        window.setTimeout(() => {
          setRouletteVisible(false);
          setRouletteCurrent(null);
          setRouletteText("");
          setWrongChar(null);
          setTypedLine("");
          setLocked(false);
          resetTimerForLine(currentLine);
        }, 1400);
      }
    }, 75);
  }, [criticalNumber, currentLine, resetTimerForLine]);

  const handleWrong = useCallback(
    (char: string) => {
      setWrongChar(char);
      playError();
      spinRoulette();
    },
    [spinRoulette]
  );

  useEffect(() => {
    if (status !== "playing") return;

    const id = window.setInterval(() => {
      setTick((old) => old + 1);

      if (!locked) {
        const elapsed = (Date.now() - lineStartedAt) / 1000;
        const nextLeft = Math.max(0, lineTimeLimitRef.current - elapsed);
        setTimeLeft(nextLeft);

        if (nextLeft <= 0) {
          setLocked(true);
          playError();
          spinRoulette();
        }
      }
    }, 250);

    return () => window.clearInterval(id);
  }, [status, locked, lineStartedAt, spinRoulette]);

  useEffect(() => {
    if (status !== "playing") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (locked) return;

      if (
        ["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "Escape"].includes(event.key)
      ) {
        return;
      }

      if (event.key === "Backspace") {
        setTypedLine((old) => old.slice(0, -1));
        playSpace();
        return;
      }

      if (event.key.length !== 1) return;

      const key = normalizeKey(event.key);
      const expected = currentLine[typedLine.length];

      if (!expected) return;

      setTotalKeys((old) => old + 1);

      if (key === expected) {
        if (key === " ") playSpace();
        else playKey();

        setCorrectKeys((old) => old + 1);

        const nextTyped = typedLine + key;
        setTypedLine(nextTyped);

        if (nextTyped === currentLine) {
          completeLine();
        }

        return;
      }

      handleWrong(key);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status, locked, currentLine, typedLine, completeLine, handleWrong]);

  const accuracy = totalKeys === 0 ? 100 : (correctKeys / totalKeys) * 100;
  const wpm = calcWpm(completedTotalChars + typedLine.length, startedAt);
  const cpm = calcCpm(completedTotalChars + typedLine.length, startedAt);

  const acceptBonus = () => {
    const nextPhrases = [...phrases, BONUS_PHRASE];
    setPhrases(nextPhrases);
    setPhaseIndex(nextPhrases.length - 1);
    setMultiplier(2);
    setInBonus(true);
    setStatus("playing");
    loadPhrase(nextPhrases.length - 1, nextPhrases);
  };

  const refuseBonus = () => {
    setStatus("fake-loss");
    window.setTimeout(() => {
      acceptBonus();
    }, 3000);
  };

  if (status === "menu") {
    return (
      <main className="menuScreen">
        <div className="menuCard">
          <h1>Cartas para o Farol</h1>
          <p>
            Jogo web de datilografia com máquina de escrever, roleta, bots e corrida de progresso.
          </p>
          <button onClick={startGame}>Iniciar jogo</button>
        </div>
      </main>
    );
  }

  if (status === "double") {
    return (
      <main className="menuScreen">
        <div className="menuCard">
          <h1>Quer prosseguir pelo dobro do prêmio?</h1>
          <p>Se continuar, a próxima carta vale o dobro. Se recusar, talvez a máquina não aceite.</p>
          <div className="buttonRow">
            <button onClick={acceptBonus}>Sim, continuar</button>
            <button onClick={refuseBonus}>Não</button>
          </div>
        </div>
      </main>
    );
  }

  if (status === "fake-loss") {
    return (
      <main className="lossScreen">
        <h1>VOCÊ PERDEU</h1>
        <p>pegadinha...</p>
      </main>
    );
  }

  if (status === "lost") {
    return (
      <main className="lossScreen">
        <h1>VOCÊ PERDEU</h1>
        <p>As três vidas acabaram.</p>
        <button onClick={startGame}>Tentar novamente</button>
      </main>
    );
  }

  if (status === "won") {
    return (
      <main className="menuScreen">
        <div className="menuCard">
          <h1>Vitória!</h1>
          <p>A última folha saiu da máquina. O farol acendeu e a carta chegou ao destino.</p>
          <p>Pontuação final: {score}</p>
          <button onClick={startGame}>Jogar novamente</button>
        </div>
      </main>
    );
  }

  return (
    <main className="gameScreen">
      <Hud
        lives={lives}
        score={score}
        phaseTitle={currentPhrase.title}
        phaseNumber={phaseIndex + 1}
        totalPhases={phrases.length}
        wpm={wpm}
        cpm={cpm}
        accuracy={accuracy}
        timeLeft={timeLeft}
        botStats={botStats}
      />

      <TypewriterScene
        title={currentPhrase.title}
        source={currentPhrase.source}
        lines={lines}
        lineIndex={lineIndex}
        typedLine={typedLine}
        wrongChar={wrongChar}
        lineReady={lineReady}
        carriageLeft={carriageLeft}
      />

      <div className="statusText">
        {lineReady ? "O papel voltou. Prepare a próxima linha." : "Continue digitando..."}
      </div>

      <RaceProgress markers={markers} />

      <Roulette
        visible={rouletteVisible}
        current={rouletteCurrent}
        critical={criticalNumber}
        resultText={rouletteText}
      />

      <div className="bottomButtons">
        <button onClick={startGame}>Reiniciar</button>
      </div>
    </main>
  );
}
