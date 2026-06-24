"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Hud from "@/components/Hud";
import RaceProgress, { RaceMarker } from "@/components/RaceProgress";
import Roulette from "@/components/Roulette";
import TypewriterScene from "@/components/TypewriterScene";
import { BONUS_PHRASE, PHRASES, Phrase } from "@/lib/phrases";
import { botSnapshots, createBots } from "@/lib/bots";
import {
  applyOrder,
  completedChars,
  normalizeKey,
  shuffleOrder,
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
  stopSuspenseLoop,
  unlockAudio
} from "@/lib/audio";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import {
  createOnlineRoom,
  getRoom,
  listPlayers,
  makePlayerId,
  orderedPhrases,
  RemotePlayer,
  Room,
  upsertPlayer
} from "@/lib/multiplayer";

type GameStatus = "menu" | "playing" | "double" | "fake-loss" | "lost" | "won";
type Mode = "solo" | "online";

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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const phaseStartedAt = useRef(Date.now());
  const lineTimeLimitRef = useRef(20);

  const [mobileInput, setMobileInput] = useState("");
  const [status, setStatus] = useState<GameStatus>("menu");
  const [mode, setMode] = useState<Mode>("solo");
  const [playerId] = useState(() => makePlayerId());
  const [playerName, setPlayerName] = useState("Jogador");
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [remotePlayers, setRemotePlayers] = useState<RemotePlayer[]>([]);
  const [onlineMessage, setOnlineMessage] = useState("");

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

  const bots = useMemo(() => createBots(), []);

  const currentPhrase = phrases[phaseIndex] ?? PHRASES[0];
  const currentLine = lines[lineIndex] ?? "";
  const phraseTotal = totalChars(lines);
  const phraseCompleted = completedChars(lines, lineIndex, typedLine);
  const playerProgress = phraseTotal > 0 ? phraseCompleted / phraseTotal : 0;

  const botStats = bots
    .map((bot) => `${bot.name}: ${bot.wpm.toFixed(2)} WPM / ${bot.cpm.toFixed(2)} CPM`)
    .join(" | ");

  const focusTyping = useCallback(() => {
    if (!inputRef.current) return;
    inputRef.current.focus({ preventScroll: true });
  }, []);

  const focusTypingSoon = useCallback(() => {
    window.setTimeout(() => focusTyping(), 60);
    window.setTimeout(() => focusTyping(), 350);
  }, [focusTyping]);

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
      focusTypingSoon();
    },
    [focusTypingSoon, resetTimerForLine]
  );

  const refreshPlayers = useCallback(
    async (roomCode: string) => {
      const players = await listPlayers(roomCode);
      setRemotePlayers(players.filter((player) => player.player_id !== playerId));
    },
    [playerId]
  );

  const subscribeToRoom = useCallback(
    (roomCode: string) => {
      if (!supabase) return;

      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase
        .channel(`room-${roomCode}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "room_players",
            filter: `room_code=eq.${roomCode}`
          },
          () => {
            void refreshPlayers(roomCode);
          }
        )
        .subscribe();

      channelRef.current = channel;
      void refreshPlayers(roomCode);
    },
    [refreshPlayers]
  );

  const sendSnapshot = useCallback(
    async (nextStatus = "playing") => {
      if (!room) return;

      await upsertPlayer({
        room_code: room.code,
        player_id: playerId,
        name: playerName || "Jogador",
        progress: playerProgress,
        score,
        lives,
        phase_index: phaseIndex,
        status: nextStatus
      });
    },
    [lives, phaseIndex, playerId, playerName, playerProgress, room, score]
  );

  const beginGame = useCallback(
    (sourcePhrases: Phrase[], critical: number, nextRoom: Room | null, nextMode: Mode) => {
      setMode(nextMode);
      setRoom(nextRoom);
      setPhrases(sourcePhrases);
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
      setRemotePlayers([]);

      unlockAudio();
      startSuspenseLoop();
      focusTyping();
      loadPhrase(0, sourcePhrases);
    },
    [focusTyping, loadPhrase]
  );

  const startSolo = useCallback(() => {
    const order = shuffleOrder(PHRASES.length);
    const shuffled = applyOrder(PHRASES, order);
    const critical = Math.floor(Math.random() * 6) + 1;
    beginGame(shuffled, critical, null, "solo");
  }, [beginGame]);

  const createRoom = useCallback(async () => {
    if (!hasSupabaseConfig) {
      setOnlineMessage("Configure o Supabase no .env.local e na Vercel para usar salas online.");
      return;
    }

    try {
      setOnlineMessage("Criando sala...");
      const newRoom = await createOnlineRoom();
      const sourcePhrases = orderedPhrases(newRoom);

      setOnlineMessage(`Sala criada: ${newRoom.code}`);
      subscribeToRoom(newRoom.code);
      beginGame(sourcePhrases, newRoom.critical_number, newRoom, "online");

      window.setTimeout(() => {
        void upsertPlayer({
          room_code: newRoom.code,
          player_id: playerId,
          name: playerName || "Jogador",
          progress: 0,
          score: 0,
          lives: MAX_LIVES,
          phase_index: 0,
          status: "playing"
        });
      }, 400);
    } catch (error) {
      setOnlineMessage(error instanceof Error ? error.message : "Erro ao criar sala.");
    }
  }, [beginGame, playerId, playerName, subscribeToRoom]);

  const joinRoom = useCallback(async () => {
    if (!hasSupabaseConfig) {
      setOnlineMessage("Configure o Supabase no .env.local e na Vercel para usar salas online.");
      return;
    }

    try {
      const code = joinCode.trim().toUpperCase();
      if (!code) {
        setOnlineMessage("Digite o código da sala.");
        return;
      }

      setOnlineMessage("Entrando na sala...");
      const foundRoom = await getRoom(code);
      const sourcePhrases = orderedPhrases(foundRoom);

      subscribeToRoom(foundRoom.code);
      beginGame(sourcePhrases, foundRoom.critical_number, foundRoom, "online");
      setOnlineMessage(`Você entrou na sala ${foundRoom.code}.`);

      window.setTimeout(() => {
        void upsertPlayer({
          room_code: foundRoom.code,
          player_id: playerId,
          name: playerName || "Jogador",
          progress: 0,
          score: 0,
          lives: MAX_LIVES,
          phase_index: 0,
          status: "playing"
        });
      }, 400);
    } catch (error) {
      setOnlineMessage(error instanceof Error ? error.message : "Não encontrei a sala.");
    }
  }, [beginGame, joinCode, playerId, playerName, subscribeToRoom]);

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
      void sendSnapshot("won");
      return;
    }

    setPhaseIndex(nextIndex);
    loadPhrase(nextIndex, phrases);
  }, [inBonus, loadPhrase, phaseIndex, phrases, sendSnapshot]);

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
      focusTypingSoon();
    }, 1000);
  }, [
    currentLine.length,
    focusTypingSoon,
    goNextPhase,
    lineIndex,
    lineStartedAt,
    lines,
    multiplier,
    resetTimerForLine
  ]);

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
                void sendSnapshot("lost");
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
          focusTypingSoon();
        }, 1400);
      }
    }, 75);
  }, [criticalNumber, currentLine, focusTypingSoon, resetTimerForLine, sendSnapshot]);

  const handleWrong = useCallback(
    (char: string) => {
      setWrongChar(char);
      playError();
      spinRoulette();
    },
    [spinRoulette]
  );

  const typeCharacter = useCallback(
    (rawKey: string) => {
      if (status !== "playing" || locked) return;

      const key = normalizeKey(rawKey);
      if (!key) return;

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
          window.setTimeout(completeLine, 0);
        }

        return;
      }

      handleWrong(key);
    },
    [completeLine, currentLine, handleWrong, locked, status, typedLine]
  );

  const handleBackspace = useCallback(() => {
    if (status !== "playing" || locked) return;
    setTypedLine((old) => old.slice(0, -1));
    playSpace();
  }, [locked, status]);

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
  }, [lineStartedAt, locked, spinRoulette, status]);

  useEffect(() => {
    if (status !== "playing") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (document.activeElement === inputRef.current) return;

      if (["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "Escape"].includes(event.key)) return;

      if (event.key === "Backspace") {
        event.preventDefault();
        handleBackspace();
        return;
      }

      if (event.key.length !== 1) return;
      typeCharacter(event.key);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleBackspace, status, typeCharacter]);

  useEffect(() => {
    if (status !== "playing" || !room) return;
    if (tick % 4 !== 0) return;
    void sendSnapshot("playing");
  }, [room, sendSnapshot, status, tick]);

  useEffect(() => {
    return () => {
      stopSuspenseLoop();
      if (supabase && channelRef.current) {
        void supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const accuracy = totalKeys === 0 ? 100 : (correctKeys / totalKeys) * 100;
  const wpm = calcWpm(completedTotalChars + typedLine.length, startedAt);
  const cpm = calcCpm(completedTotalChars + typedLine.length, startedAt);

  const markers: RaceMarker[] = useMemo(() => {
    const botMarkers = botSnapshots(bots, phaseStartedAt.current, phraseTotal);

    const opponents: RaceMarker[] = remotePlayers.map((player, index) => {
      let progress = player.progress ?? 0;
      if (player.phase_index > phaseIndex) progress = 1;
      if (player.phase_index < phaseIndex) progress = 0;

      return {
        kind: "opponent",
        label: `${index + 1}`,
        name: player.name,
        progress,
        score: player.score,
        lives: player.lives
      };
    });

    const sortedOpponents = opponents.sort((a, b) => b.progress - a.progress).map((item, index) => ({
      ...item,
      label: `${index + 1}`
    }));

    return [
      {
        kind: "self",
        label: "EU",
        name: playerName || "Você",
        progress: playerProgress,
        score,
        lives
      },
      ...sortedOpponents,
      ...botMarkers
    ];
  }, [bots, lives, phaseIndex, phraseTotal, playerName, playerProgress, remotePlayers, score, tick]);

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

  const onMobileChange = (value: string) => {
    if (!value) return;
    for (const char of value.split("")) {
      typeCharacter(char);
    }
    setMobileInput("");
    focusTypingSoon();
  };

  const roomCode = room?.code ?? null;

  return (
    <>
      <input
        ref={inputRef}
        className="typingInput"
        value={mobileInput}
        onChange={(event) => onMobileChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Backspace") {
            event.preventDefault();
            handleBackspace();
          }
        }}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        enterKeyHint="done"
        aria-label="Campo de digitação do jogo"
      />

      {status === "menu" && (
        <main className="menuScreen">
          <div className="menuCard">
            <h1>Cartas para o Farol Online</h1>
            <p>
              Jogue sozinho, crie uma sala online ou entre na sala de um amigo. No celular,
              toque em iniciar e o teclado virtual será chamado como em uma pesquisa.
            </p>

            <label className="fieldLabel">
              Seu nome
              <input
                className="menuInput"
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                placeholder="Seu nome"
              />
            </label>

            <div className="buttonGrid">
              <button onClick={startSolo}>Jogar sozinho</button>
              <button onClick={createRoom}>Criar sala online</button>
            </div>

            <div className="joinBox">
              <input
                className="menuInput"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="Código da sala: FAROL-1234"
              />
              <button onClick={joinRoom}>Entrar na sala</button>
            </div>

            {!hasSupabaseConfig && (
              <p className="warningText">
                Multiplayer online precisa das variáveis NEXT_PUBLIC_SUPABASE_URL e
                NEXT_PUBLIC_SUPABASE_ANON_KEY.
              </p>
            )}

            {onlineMessage && <p className="onlineMessage">{onlineMessage}</p>}
          </div>
        </main>
      )}

      {status === "double" && (
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
      )}

      {status === "fake-loss" && (
        <main className="lossScreen">
          <h1>VOCÊ PERDEU</h1>
          <p>pegadinha...</p>
        </main>
      )}

      {status === "lost" && (
        <main className="lossScreen">
          <h1>VOCÊ PERDEU</h1>
          <p>As três vidas acabaram.</p>
          <button onClick={startSolo}>Tentar novamente</button>
        </main>
      )}

      {status === "won" && (
        <main className="menuScreen">
          <div className="menuCard">
            <h1>Vitória!</h1>
            <p>A última folha saiu da máquina. O farol acendeu e a carta chegou ao destino.</p>
            <p>Pontuação final: {score}</p>
            <button onClick={startSolo}>Jogar novamente</button>
          </div>
        </main>
      )}

      {status === "playing" && (
        <main className="gameScreen" onPointerDown={focusTyping}>
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
            roomCode={roomCode}
            playerName={playerName || "Jogador"}
          />

          {roomCode && (
            <div className="shareRoom">
              Compartilhe este código com seu amigo: <strong>{roomCode}</strong>
            </div>
          )}

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

          <button className="mobileFocusButton" onClick={focusTyping}>
            Toque aqui para digitar
          </button>

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
            <button onClick={startSolo}>Reiniciar solo</button>
          </div>

          {mode === "online" && (
            <div className="onlineFooter">
              Online ativo. Jogadores reais aparecem em vermelho na linha de progresso.
            </div>
          )}
        </main>
      )}
    </>
  );
}
