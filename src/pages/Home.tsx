import {
  IonBadge,
  IonButton,
  IonCard,
  IonChip,
  IonContent,
  IonIcon,
  IonPage,
  IonPopover,
} from "@ionic/react";
import {
  alertCircleOutline,
  closeCircleOutline,
  exitOutline,
  gameControllerOutline,
  informationCircleOutline,
  pauseCircleOutline,
  playCircleOutline,
  refresh,
  trophyOutline,
} from "ionicons/icons";
import "./Home.css";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { ScreenOrientation } from "@capacitor/screen-orientation";
import {
  MAZE_LEVEL_MAP,
  MAZE_LEVELS,
  type MazeDirection,
  type MazeExercise,
  type MazePosition,
} from "../data/mazeLevels";

const lockLandscape = async () => {
  try {
    await ScreenOrientation.lock({ orientation: "landscape" });
  } catch {
    try {
      const browserOrientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: "landscape") => Promise<void>;
      };

      await browserOrientation.lock?.("landscape");
    } catch {
      // not supported in this environment
    }
  }
};

const unlockOrientation = async () => {
  try {
    await ScreenOrientation.unlock();
  } catch {
    try {
      screen.orientation.unlock();
    } catch {
      // not supported in this environment
    }
  }
};

type Difficulty = "basic" | "intermediate" | "advanced";

export interface PlayProps {
  difficulty?: Difficulty;
}

export interface GameConfig {
  totalExercises: number;
  pointsCorrect: number;
  attemptsPerExercise: number;
  exercises: MazeExercise[];
}

const MAZE_ATTEMPTS_BY_DIFFICULTY: Record<Difficulty, number> = {
  basic: 3,
  intermediate: 2,
  advanced: 1,
};

type ConfettiPiece = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
};

type LaberintoRuntimeConfig = {
  nivel?: string;
  autor?: string;
  version?: string;
  fecha?: string;
  descripcion?: string;
  nombreApp?: string;
  plataformas?: string[];
};

const MAZE_TOOL_BLOCKS = [
  {
    id: "advance",
    variable: "N",
    command: "Avanzar N pasos;",
  },
  {
    id: "turn-left",
    variable: "L",
    command: "Girar a la izquierda y avanzar L pasos;",
  },
  {
    id: "turn-right",
    variable: "R",
    command: "Girar a la derecha y avanzar R pasos;",
  },
] as const;

const INITIAL_MAZE_SEQUENCE_SLOT_COUNT = 2;
const MAZE_STEP_DELAY_MS = 900;
const MAZE_TURN_DELAY_MS = 760;
const MAZE_JUMP_DELAY_MS = 900;
const MAZE_RESULT_DELAY_MS = 1700;

type MazeToolId = (typeof MAZE_TOOL_BLOCKS)[number]["id"];
type MazeToolBlock = (typeof MAZE_TOOL_BLOCKS)[number];
type MazeCharacterAction =
  | "greeting"
  | "walking"
  | "turn-right"
  | "turn-left"
  | "jumping";
type MazeCommand = {
  id: MazeToolId;
  value: number | null;
};
type MazeSequenceSlot = MazeCommand | null;

type MazeRuntime = MazePosition & {
  direction: MazeDirection;
  action: MazeCharacterAction;
  visited: MazePosition[];
  message: string;
};

type MazeVisualPosition = {
  x: number;
  y: number;
};

type MazePointerDrag = {
  toolId: MazeToolId;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;
};

const createEmptyMazeSequence = (): MazeSequenceSlot[] =>
  Array.from({ length: INITIAL_MAZE_SEQUENCE_SLOT_COUNT }, () => null);

const ensureTrailingEmptyMazeSlot = (
  sequence: MazeSequenceSlot[],
): MazeSequenceSlot[] =>
  sequence.length === 0 || sequence[sequence.length - 1] !== null
    ? [...sequence, null]
    : sequence;

const MAZE_DIRECTIONS: MazeDirection[] = ["up", "right", "down", "left"];

const MAZE_DIRECTION_DELTAS: Record<MazeDirection, MazePosition> = {
  up: { row: -1, col: 0 },
  right: { row: 0, col: 1 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
};

const MAZE_CHARACTER_GIFS: Record<MazeCharacterAction, string> = {
  greeting: "/assets/laberinto-saludando.gif",
  walking: "/assets/laberinto-caminando.gif",
  "turn-right": "/assets/laberinto-girando-derecha.gif",
  "turn-left": "/assets/laberinto-girando-izquierda.gif",
  jumping: "/assets/laberinto-brincando.gif",
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const createMazeRuntime = (exercise: MazeExercise): MazeRuntime => ({
  row: exercise.start.row,
  col: exercise.start.col,
  direction: exercise.start.direction,
  action: "greeting",
  visited: [{ row: exercise.start.row, col: exercise.start.col }],
  message: "Listo para ejecutar",
});

const getMazeVisualPositionForCell = (
  exercise: MazeExercise,
  row: number,
  col: number,
): MazeVisualPosition => {
  const rows = Math.max(exercise.grid.length, 1);
  const columns = Math.max(exercise.grid[0]?.length ?? 1, 1);
  const clampedRow = Math.min(Math.max(row, 0), rows - 1);
  const clampedCol = Math.min(Math.max(col, 0), columns - 1);

  return {
    x: ((clampedCol + 0.5) / columns) * 100,
    y: ((clampedRow + 0.5) / rows) * 100,
  };
};

const getPositionKey = ({ row, col }: MazePosition) => `${row}:${col}`;

const turnMazeDirection = (
  direction: MazeDirection,
  turn: "left" | "right",
) => {
  const currentIndex = MAZE_DIRECTIONS.indexOf(direction);
  const offset = turn === "left" ? -1 : 1;
  return MAZE_DIRECTIONS[
    (currentIndex + offset + MAZE_DIRECTIONS.length) % MAZE_DIRECTIONS.length
  ];
};

const Home: React.FC<PlayProps> = ({ difficulty = "basic" }) => {
  const initialMazeExercise =
    MAZE_LEVELS[MAZE_LEVEL_MAP[difficulty]].exercises[0];
  const showTypeInstructions = false;
  const [showStartScreen, setShowStartScreen] = useState<boolean>(true);
  const [appNombreJuego, setAppNombreJuego] = useState<string>("STEAM-G");
  const [difficultyConfig, setDifficultyConfig] =
    useState<Difficulty>(difficulty);
  const [showInformation, setShowInformation] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(5);
  const [showCountdown, setShowCountdown] = useState<boolean>(false);
  const [appDescripcion, setAppDescripcion] = useState<string>(
    "Juego de encriptación y desencriptación de mensajes",
  );
  const [appFecha, setAppFecha] = useState<string>("2 de Diciembre del 2025");
  const [appVersion, setAppVersion] = useState<string>("1.0");
  const [appPlataformas, setAppPlataformas] = useState<string>("android");
  const [, setAppAutor] = useState<string>("Valeria C. Z.");
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [pausado, setPausado] = useState<boolean>(false);
  const [activeButtonIndex, setActiveButtonIndex] = useState<number | null>(
    null,
  );
  const [isComplete, setisComplete] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [score, setScore] = useState<number>(0);
  const [maxScore, setMaxScore] = useState<number>(0);
  const [, setShowExitModal] = useState<boolean>(false);
  const [, setConfigLoaded] = useState<boolean>(false);

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number>(0);
  const [totalCorrect, setTotalCorrect] = useState<number>(0);
  const [totalAnswered, setTotalAnswered] = useState<number>(0);
  const [mazeAttemptsLeft, setMazeAttemptsLeft] = useState<number>(
    MAZE_ATTEMPTS_BY_DIFFICULTY[difficulty],
  );
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [mazeSequence, setMazeSequence] = useState<MazeSequenceSlot[]>(
    createEmptyMazeSequence,
  );
  const [draggedMazeToolId, setDraggedMazeToolId] =
    useState<MazeToolId | null>(null);
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState<number | null>(
    null,
  );
  const [isSequenceDragOver, setIsSequenceDragOver] =
    useState<boolean>(false);
  const [mazePointerDrag, setMazePointerDrag] =
    useState<MazePointerDrag | null>(null);
  const [mazeRuntime, setMazeRuntime] = useState<MazeRuntime>(() =>
    createMazeRuntime(initialMazeExercise),
  );
  const [mazeVisualPosition, setMazeVisualPosition] =
    useState<MazeVisualPosition>(() =>
      getMazeVisualPositionForCell(
        initialMazeExercise,
        initialMazeExercise.start.row,
        initialMazeExercise.start.col,
      ),
    );
  const [mazeNotice, setMazeNotice] = useState<{
    msg: string;
    type: "info" | "success" | "error";
  } | null>(null);
  const [isExecutingMaze, setIsExecutingMaze] = useState<boolean>(false);
  const mazeNoticeTimer = useRef<number | null>(null);
  const mazeVisualPositionRef = useRef<MazeVisualPosition>(
    getMazeVisualPositionForCell(
      initialMazeExercise,
      initialMazeExercise.start.row,
      initialMazeExercise.start.col,
    ),
  );
  const mazeAnimationTimer = useRef<number | null>(null);

  useEffect(() => {
    const cargarConfig = async () => {
      try {
        const res = await fetch("/config/laberinto-config.json");

        if (!res.ok) {
          setConfigLoaded(true);
          return;
        }

        const data: LaberintoRuntimeConfig = await res.json();

        if (data.nivel) {
          setDifficultyConfig(normalizarNivelConfig(data.nivel));
        }

        if (data.autor) setAppAutor(data.autor);
        if (data.version) setAppVersion(data.version);
        if (data.fecha) setAppFecha(formatearFechaLarga(data.fecha));
        if (data.descripcion) setAppDescripcion(data.descripcion);
        if (data.plataformas) setAppPlataformas(data.plataformas.join(", "));
        if (data.nombreApp) setAppNombreJuego(data.nombreApp);
      } catch (err) {
        console.error("No se pudo cargar laberinto-config.json", err);
      } finally {
        setConfigLoaded(true);
      }
    };

    cargarConfig();
  }, []);

  useEffect(() => {
    return () => {
      if (mazeNoticeTimer.current !== null) {
        window.clearTimeout(mazeNoticeTimer.current);
      }

      if (mazeAnimationTimer.current !== null) {
        window.clearInterval(mazeAnimationTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const levelCfg = MAZE_LEVELS[MAZE_LEVEL_MAP[difficultyConfig]];
    const exercise =
      levelCfg.exercises[currentExerciseIndex] ?? levelCfg.exercises[0];
    const visualPosition = getMazeVisualPositionForCell(
      exercise,
      exercise.start.row,
      exercise.start.col,
    );

    if (mazeAnimationTimer.current !== null) {
      window.clearInterval(mazeAnimationTimer.current);
      mazeAnimationTimer.current = null;
    }

    mazeVisualPositionRef.current = visualPosition;
    setMazeRuntime(createMazeRuntime(exercise));
    setMazeVisualPosition(visualPosition);
    setMazeSequence(createEmptyMazeSequence());
    setMazeAttemptsLeft(MAZE_ATTEMPTS_BY_DIFFICULTY[difficultyConfig]);
    setMazeNotice(null);
    setMazePointerDrag(null);
    resetMazeDragState();
  }, [difficultyConfig, currentExerciseIndex]);

  useEffect(() => {
    if (showCountdown && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (showCountdown && countdown === 0) {
      setTimeout(() => {
        setShowCountdown(false);
        startGameLogic();
      }, 500);
    }
  }, [countdown, showCountdown]);

  const getInstructions = (): string => {
    return 'Ordena las instrucciones y asigna los valores correctos para completar el laberinto. Básico otorga 10 puntos, Intermedio 15 puntos y Avanzado 20 puntos. Si una instrucción es incorrecta se indicará cuál es y verás el mensaje "Inténtalo de nuevo".';
  };

  const formatRemainingMazeAttempts = (attempts: number) =>
    attempts === 1
      ? "Te queda 1 oportunidad."
      : `Te quedan ${attempts} oportunidades.`;

  const getDifficultyLabel = (nivel: Difficulty): string => {
    const labels: Record<Difficulty, string> = {
      basic: "Básico",
      intermediate: "Intermedio",
      advanced: "Avanzado",
    };
    return labels[nivel] ?? nivel;
  };

  const generarConfeti = (cantidad = 60): ConfettiPiece[] => {
    const colores = ["#ff6b6b", "#feca57", "#48dbfb", "#1dd1a1", "#5f27cd"];

    return Array.from({ length: cantidad }, (_, id) => ({
      id,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 2.5 + Math.random() * 2.5,
      color: colores[Math.floor(Math.random() * colores.length)],
    }));
  };

  const formatPlataforma = (texto: string): string => {
    const mapa: Record<string, string> = {
      android: "Android",
      ios: "iOS",
      web: "Web",
    };
    return texto
      .split(/,\s*/)
      .map(
        (p) => mapa[p.toLowerCase()] ?? p.charAt(0).toUpperCase() + p.slice(1),
      )
      .join(", ");
  };

  const normalizarNivelConfig = (nivel: string): Difficulty => {
    const limpio = nivel.toLowerCase();
    const mapa: Record<string, Difficulty> = {
      basico: "basic",
      basic: "basic",
      intermedio: "intermediate",
      intermediate: "intermediate",
      avanzado: "advanced",
      advanced: "advanced",
    };
    return mapa[limpio] ?? "basic";
  };

  const formatearFechaLarga = (isoDate?: string) => {
    if (!isoDate) return appFecha;
    const [year, month, day] = isoDate.split("-");
    const meses = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];

    const mesIndex = Number(month) - 1;
    if (mesIndex < 0 || mesIndex > 11) return isoDate;

    return `${Number(day)} de ${meses[mesIndex]} del ${year}`;
  };

  const getGameConfig = (difficulty: Difficulty): GameConfig => {
    const levelCfg = MAZE_LEVELS[MAZE_LEVEL_MAP[difficulty]];

    return {
      totalExercises: levelCfg.exercises.length,
      pointsCorrect: levelCfg.pointsCorrect,
      attemptsPerExercise: MAZE_ATTEMPTS_BY_DIFFICULTY[difficulty],
      exercises: levelCfg.exercises,
    };
  };

  const startGameLogic = () => {
    const config = getGameConfig(difficultyConfig);
    setCurrentExerciseIndex(0);
    setTotalCorrect(0);
    setTotalAnswered(0);
    setScore(0);
    setMaxScore(config.totalExercises * config.pointsCorrect);
    setMazeAttemptsLeft(config.attemptsPerExercise);
    setGameActive(true);
  };

  const endGame = () => {
    setGameActive(false);
    setShowSummary(true);
  };

  const advanceAfterFeedback = (shouldAdvance = true) => {
    setShowFeedback(false);

    if (!shouldAdvance) {
      const exercise =
        getGameConfig(difficultyConfig).exercises[currentExerciseIndex] ??
        MAZE_LEVELS[MAZE_LEVEL_MAP[difficultyConfig]].exercises[0];

      setMazeRuntime(createMazeRuntime(exercise));
      syncVisualMazePosition(exercise, exercise.start.row, exercise.start.col);
      setMazeSequence(createEmptyMazeSequence());
      setMazeNotice(null);
      setMazePointerDrag(null);
      resetMazeDragState();
      return;
    }

    setCurrentExerciseIndex((prev) => {
      const next = prev + 1;
      if (next >= getGameConfig(difficultyConfig).totalExercises) {
        endGame();
        return prev;
      }
      return next;
    });
  };

  const handleFinalizeCurrentGame = () => {
    setPausado(false);
    setIsPaused(false);
    endGame();
  };

  const handleExitApp = async () => {
    await unlockOrientation();
    try {
      await App.exitApp();
    } catch {
      window.close();
    }
  };

  const handleStartGame = () => {
    lockLandscape();
    setShowStartScreen(false);
    resetGame();
  };

  const handleInformation = () => {
    setShowInformation(!showInformation);
  };

  const handlePausar = () => {
    if (
      showStartScreen ||
      showCountdown ||
      showSummary ||
      showInstructions ||
      showFeedback ||
      isExecutingMaze ||
      pausado
    )
      return;

    setPausado(true);
    setIsPaused(true);
  };

  const handleEjecutar = async () => {
    if (
      isExecutingMaze ||
      !gameActive ||
      isPaused ||
      showCountdown ||
      showFeedback ||
      showSummary ||
      showInstructions ||
      pausado
    ) {
      return;
    }

    await executeMazeSequence();
  };

  const handleResume = () => {
    setShowExitModal(false);
    setIsPaused(false);
    setPausado(false);
  };

  const resetGame = () => {
    const exercise =
      getGameConfig(difficultyConfig).exercises[0] ??
      MAZE_LEVELS[MAZE_LEVEL_MAP[difficultyConfig]].exercises[0];

    setCountdown(5);
    setShowCountdown(true);
    setActiveButtonIndex(null);
    setisComplete(true);
    setScore(0);
    setMaxScore(0);
    setCurrentExerciseIndex(0);
    setTotalCorrect(0);
    setTotalAnswered(0);
    setMazeAttemptsLeft(MAZE_ATTEMPTS_BY_DIFFICULTY[difficultyConfig]);
    setGameActive(false);
    setMazeRuntime(createMazeRuntime(exercise));
    syncVisualMazePosition(exercise, exercise.start.row, exercise.start.col);
    setMazeSequence(createEmptyMazeSequence());
    setMazePointerDrag(null);
    setMazeNotice(null);
    setIsExecutingMaze(false);
    resetMazeDragState();
    setShowSummary(false);
    setShowFeedback(false);
  };

  const currentGameConfig = getGameConfig(difficultyConfig);
  const currentMazeExercise =
    currentGameConfig.exercises[currentExerciseIndex] ??
    currentGameConfig.exercises[0];
  const mazeGridColumnCount = currentMazeExercise.grid[0]?.length ?? 1;
  const mazeGridRowCount = currentMazeExercise.grid.length;
  const mazeGridStyle = {
    gridTemplateColumns: `repeat(${mazeGridColumnCount}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${mazeGridRowCount}, minmax(0, 1fr))`,
    aspectRatio: `${mazeGridColumnCount} / ${mazeGridRowCount}`,
    "--maze-cols": mazeGridColumnCount,
    "--maze-rows": mazeGridRowCount,
  } as CSSProperties;
  const mazeCharacterStyle = {
    "--maze-character-x": `${mazeVisualPosition.x}%`,
    "--maze-character-y": `${mazeVisualPosition.y}%`,
  } as CSSProperties;
  const visitedMazePositions = new Set(
    mazeRuntime.visited.map(getPositionKey),
  );

  const cancelMazeAnimation = () => {
    if (mazeAnimationTimer.current !== null) {
      window.clearInterval(mazeAnimationTimer.current);
      mazeAnimationTimer.current = null;
    }
  };

  const syncVisualMazePosition = (
    exercise: MazeExercise,
    row: number,
    col: number,
  ) => {
    cancelMazeAnimation();

    const visualPosition = getMazeVisualPositionForCell(exercise, row, col);
    mazeVisualPositionRef.current = visualPosition;
    setMazeVisualPosition(visualPosition);
  };

  const animateVisualMazeTo = (
    exercise: MazeExercise,
    row: number,
    col: number,
    duration = MAZE_STEP_DELAY_MS,
  ) =>
    new Promise<void>((resolve) => {
      cancelMazeAnimation();

      const startPosition = mazeVisualPositionRef.current;
      const targetPosition = getMazeVisualPositionForCell(exercise, row, col);
      const deltaX = targetPosition.x - startPosition.x;
      const deltaY = targetPosition.y - startPosition.y;

      if (deltaX === 0 && deltaY === 0) {
        resolve();
        return;
      }

      const totalSteps = Math.max(
        Math.ceil(Math.hypot(deltaX, deltaY)),
        1,
      );
      const intervalMs = duration / totalSteps;
      let currentStep = 0;

      mazeAnimationTimer.current = window.setInterval(() => {
        currentStep += 1;
        const progress = Math.min(currentStep / totalSteps, 1);
        const nextPosition = {
          x: startPosition.x + deltaX * progress,
          y: startPosition.y + deltaY * progress,
        };

        mazeVisualPositionRef.current = nextPosition;
        setMazeVisualPosition(nextPosition);

        if (progress >= 1) {
          cancelMazeAnimation();
          resolve();
        }
      }, intervalMs);
    });

  const getMazeToolById = (toolId: string | null): MazeToolBlock | undefined =>
    MAZE_TOOL_BLOCKS.find((block) => block.id === toolId);

  const showMazeNotice = (
    msg: string,
    type: "info" | "success" | "error" = "info",
  ) => {
    if (mazeNoticeTimer.current !== null) {
      window.clearTimeout(mazeNoticeTimer.current);
    }

    setMazeNotice({ msg, type });
    mazeNoticeTimer.current = window.setTimeout(() => {
      setMazeNotice(null);
      mazeNoticeTimer.current = null;
    }, 2600);
  };

  const renderMazeCommandText = (
    block: MazeToolBlock,
    value?: number | null,
  ) => block.command.replace(block.variable, value ? String(value) : block.variable);

  const getMazeCommandDescription = (command: MazeCommand) => {
    const block = getMazeToolById(command.id);
    if (!block) return "Comando no reconocido";

    return renderMazeCommandText(block, command.value).replace(/;\s*$/, "");
  };

  const trimMazeSentence = (message: string) =>
    message.trim().replace(/[.\s]+$/, "");

  const getIncorrectMazeInstructionMessage = (
    command: MazeCommand,
    slotIndex: number,
    detail: string,
  ) =>
    `Instrucción ${slotIndex + 1} incorrecta: ${getMazeCommandDescription(
      command,
    )}. ${trimMazeSentence(detail)}. Inténtalo de nuevo.`;

  const renderMazeCodeBlockContent = (
    block: MazeToolBlock,
    value?: number | null,
    onValueChange?: (value: number | null) => void,
  ) => (
    <>
      <span className="maze-code-line">
        <span className="maze-code-variable">{block.variable}</span> &lt;-{" "}
        {onValueChange ? (
          <input
            aria-label={`Valor para ${block.variable}`}
            className="maze-code-input"
            inputMode="numeric"
            maxLength={2}
            onChange={(event) => {
              const rawValue = event.target.value.replace(/\D/g, "");
              onValueChange(
                rawValue === "" ? null : Number.parseInt(rawValue, 10),
              );
            }}
            onClick={(event) => event.stopPropagation()}
            pattern="[0-9]*"
            type="text"
            value={value ?? ""}
          />
        ) : (
          <span className="maze-code-input">__</span>
        )}
        ;
      </span>
      <span className="maze-code-line">
        {renderMazeCommandText(block, value)}
      </span>
    </>
  );

  const resetMazeDragState = () => {
    setDraggedMazeToolId(null);
    setDragOverSlotIndex(null);
    setIsSequenceDragOver(false);
  };

  const addToolToSequence = (
    toolId: string | null,
    preferredIndex?: number,
  ) => {
    const block = getMazeToolById(toolId);
    if (!block) return;
    const command: MazeCommand = { id: block.id, value: null };

    setMazeSequence((prev) => {
      const next = [...prev];

      if (typeof preferredIndex === "number") {
        while (next.length <= preferredIndex) {
          next.push(null);
        }

        next[preferredIndex] = command;
        return ensureTrailingEmptyMazeSlot(next);
      }

      const firstEmptyIndex = next.findIndex((slot) => slot === null);
      if (firstEmptyIndex === -1) {
        next.push(command);
        return ensureTrailingEmptyMazeSlot(next);
      }

      next[firstEmptyIndex] = command;
      return ensureTrailingEmptyMazeSlot(next);
    });
  };

  const updateMazeCommandValue = (slotIndex: number, value: number | null) => {
    setMazeSequence((prev) => {
      const next = [...prev];
      const slot = next[slotIndex];

      if (slot) {
        next[slotIndex] = { ...slot, value };
      }

      return ensureTrailingEmptyMazeSlot(next);
    });
  };

  const removeMazeCommand = (slotIndex: number) => {
    setMazeSequence((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return ensureTrailingEmptyMazeSlot(next);
    });
  };

  const readDraggedMazeToolId = (
    event: React.DragEvent<HTMLElement>,
  ): MazeToolId | null => {
    const toolId =
      event.dataTransfer.getData("application/x-maze-tool") ||
      event.dataTransfer.getData("text/plain") ||
      draggedMazeToolId;

    return getMazeToolById(toolId)?.id ?? null;
  };

  const handleMazeToolDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    toolId: MazeToolId,
  ) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-maze-tool", toolId);
    event.dataTransfer.setData("text/plain", toolId);
    setDraggedMazeToolId(toolId);
  };

  const handleSequencePanelDragOver = (
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsSequenceDragOver(true);
    setDragOverSlotIndex(null);
  };

  const handleSequencePanelDragLeave = (
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    setIsSequenceDragOver(false);
    setDragOverSlotIndex(null);
  };

  const handleSequencePanelDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    addToolToSequence(readDraggedMazeToolId(event));
    resetMazeDragState();
  };

  const handleSequenceSlotDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    slotIndex: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setIsSequenceDragOver(true);
    setDragOverSlotIndex(slotIndex);
  };

  const handleSequenceSlotDragLeave = (
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    setDragOverSlotIndex(null);
  };

  const handleSequenceSlotDrop = (
    event: React.DragEvent<HTMLDivElement>,
    slotIndex: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    addToolToSequence(readDraggedMazeToolId(event), slotIndex);
    resetMazeDragState();
  };

  const getMazeDropTargetFromPoint = (x: number, y: number) => {
    const target = document.elementFromPoint(x, y);
    if (!(target instanceof Element)) {
      return { panelElement: null, slotIndex: null };
    }

    const slotElement = target.closest<HTMLElement>(
      "[data-maze-sequence-slot]",
    );
    const panelElement = target.closest<HTMLElement>(".maze-sequence-panel");

    if (!panelElement) {
      return { panelElement: null, slotIndex: null };
    }

    const slotIndex =
      slotElement?.dataset.mazeSequenceSlot === undefined
        ? null
        : Number(slotElement.dataset.mazeSequenceSlot);

    return {
      panelElement,
      slotIndex: Number.isInteger(slotIndex) ? slotIndex : null,
    };
  };

  const updatePointerDragTarget = (x: number, y: number) => {
    const { panelElement, slotIndex } = getMazeDropTargetFromPoint(x, y);
    setIsSequenceDragOver(Boolean(panelElement));
    setDragOverSlotIndex(slotIndex);
  };

  const dropMazeToolAtPoint = (toolId: MazeToolId, x: number, y: number) => {
    const { panelElement, slotIndex } = getMazeDropTargetFromPoint(x, y);
    if (!panelElement) return;

    addToolToSequence(toolId, slotIndex ?? undefined);
  };

  const handleMazeToolPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    toolId: MazeToolId,
  ) => {
    if (event.pointerType === "mouse" || event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggedMazeToolId(toolId);
    setMazePointerDrag({
      toolId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      active: false,
    });
  };

  const handleMazeToolPointerMove = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (!mazePointerDrag || mazePointerDrag.pointerId !== event.pointerId) {
      return;
    }

    const movement = Math.hypot(
      event.clientX - mazePointerDrag.startX,
      event.clientY - mazePointerDrag.startY,
    );
    const active = mazePointerDrag.active || movement > 6;

    if (active) {
      event.preventDefault();
      updatePointerDragTarget(event.clientX, event.clientY);
    }

    setMazePointerDrag({
      ...mazePointerDrag,
      x: event.clientX,
      y: event.clientY,
      active,
    });
  };

  const handleMazeToolPointerUp = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (!mazePointerDrag || mazePointerDrag.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (mazePointerDrag.active) {
      event.preventDefault();
      dropMazeToolAtPoint(
        mazePointerDrag.toolId,
        event.clientX,
        event.clientY,
      );
    }

    setMazePointerDrag(null);
    resetMazeDragState();
  };

  const handleMazeToolPointerCancel = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (!mazePointerDrag || mazePointerDrag.pointerId !== event.pointerId) {
      return;
    }

    setMazePointerDrag(null);
    resetMazeDragState();
  };

  const executeMazeSequence = async () => {
    const commands = mazeSequence.reduce<
      Array<{ command: MazeCommand; slotIndex: number }>
    >((acc, slot, slotIndex) => {
      if (slot !== null) {
        acc.push({ command: slot, slotIndex });
      }

      return acc;
    }, []);

    if (commands.length === 0) {
      showMazeNotice(
        "Falta agregar la instrucción 1. Inténtalo de nuevo.",
        "error",
      );
      return;
    }

    const missingValue = commands.find(
      ({ command }) => !command.value || command.value < 1,
    );

    if (missingValue) {
      showMazeNotice(
        getIncorrectMazeInstructionMessage(
          missingValue.command,
          missingValue.slotIndex,
          "Asigna un valor mayor a 0",
        ),
        "error",
      );
      return;
    }

    setIsExecutingMaze(true);

    const startRuntime = createMazeRuntime(currentMazeExercise);
    let row = startRuntime.row;
    let col = startRuntime.col;
    let direction = startRuntime.direction;
    let visited = [...startRuntime.visited];
    let success = true;
    let resultMessage = "La secuencia terminó fuera de la meta";
    let failedInstruction:
      | { command: MazeCommand; slotIndex: number }
      | null = null;

    setMazeRuntime(startRuntime);
    syncVisualMazePosition(currentMazeExercise, row, col);
    await sleep(240);

    const walkMazeSteps = async (
      steps: number,
      command: MazeCommand,
      slotIndex: number,
    ): Promise<boolean> => {
      const delta = MAZE_DIRECTION_DELTAS[direction];

      for (let step = 0; step < steps; step += 1) {
        const nextRow = row + delta.row;
        const nextCol = col + delta.col;
        const nextCell = currentMazeExercise.grid[nextRow]?.[nextCol];

        if (!nextCell || nextCell === "#") {
          success = false;
          failedInstruction = { command, slotIndex };
          resultMessage =
            nextCell === "#"
              ? "El personaje chocó contra un muro"
              : "El personaje salió del tablero";
          setMazeRuntime({
            row,
            col,
            direction,
            action: "greeting",
            visited,
            message: resultMessage,
          });
          return false;
        }

        row = nextRow;
        col = nextCol;
        visited = [...visited, { row, col }];
        setMazeRuntime({
          row,
          col,
          direction,
          action: "walking",
          visited,
          message: "Avanzando",
        });
        await animateVisualMazeTo(
          currentMazeExercise,
          row,
          col,
          MAZE_STEP_DELAY_MS,
        );
      }

      return true;
    };

    for (const { command, slotIndex } of commands) {
      const value = command.value ?? 0;

      if (command.id === "turn-left" || command.id === "turn-right") {
        const turn = command.id === "turn-left" ? "left" : "right";

        direction = turnMazeDirection(direction, turn);
        setMazeRuntime({
          row,
          col,
          direction,
          action: command.id,
          visited,
          message:
            turn === "left"
              ? "Girando a la izquierda"
              : "Girando a la derecha",
        });
        await sleep(MAZE_TURN_DELAY_MS);

        if (!(await walkMazeSteps(value, command, slotIndex))) break;

        continue;
      }

      if (!(await walkMazeSteps(value, command, slotIndex))) break;
    }

    const reachedGoal = currentMazeExercise.grid[row]?.[col] === "E";

    if (success && reachedGoal) {
      const points = currentGameConfig.pointsCorrect;
      setScore((prev) => prev + points);
      setTotalCorrect((prev) => prev + 1);
      setTotalAnswered((prev) => prev + 1);
      setMazeRuntime((prev) => ({
        ...prev,
        action: "jumping",
        message: "Meta alcanzada",
      }));
      setFeedbackMessage(`Correcto! +${points} puntos`);
      await sleep(MAZE_JUMP_DELAY_MS);
    } else {
      failedInstruction ??= commands[commands.length - 1] ?? null;
      const failureDetail = success
        ? "No llegaste a la meta"
        : resultMessage;
      const failureMessage = failedInstruction
        ? getIncorrectMazeInstructionMessage(
            failedInstruction.command,
            failedInstruction.slotIndex,
            failureDetail,
          )
        : `Lista de instrucciones incorrecta: ${failureDetail}. Inténtalo de nuevo.`;
      const nextAttemptsLeft = Math.max(mazeAttemptsLeft - 1, 0);
      const shouldAdvance = nextAttemptsLeft === 0;

      setMazeAttemptsLeft(nextAttemptsLeft);
      if (shouldAdvance) {
        setTotalAnswered((prev) => prev + 1);
      }
      setMazeRuntime((prev) => ({
        ...prev,
        action: "greeting",
        message: failureMessage,
      }));
      setFeedbackMessage(
        shouldAdvance
          ? `${failureMessage} Sin oportunidades.`
          : `${failureMessage} ${formatRemainingMazeAttempts(
              nextAttemptsLeft,
            )}`,
      );
    }

    const shouldAdvanceAfterFeedback = success && reachedGoal
      ? true
      : mazeAttemptsLeft <= 1;

    setShowFeedback(true);
    setIsExecutingMaze(false);

    window.setTimeout(() => {
      advanceAfterFeedback(shouldAdvanceAfterFeedback);
    }, MAZE_RESULT_DELAY_MS);
  };

  return (
    <IonPage>
      {showCountdown && countdown > 0 && (
        <div className="countdown-overlay">
          <div className="countdown-number">{countdown}</div>
        </div>
      )}

      {showFeedback && (
        <div className="feedback-overlay">
          <div className="feedback-text">{feedbackMessage}</div>
        </div>
      )}

      {showSummary && (
        <div className="summary-overlay">
          <div className="summary-message">
            {(() => {
              const total = totalAnswered;
              const correctas = totalCorrect;
              const incorrectas = Math.max(total - correctas, 0);
              const porcentaje =
                total > 0 ? Math.round((correctas / total) * 100) : 0;
              const etiqueta =
                correctas === total
                  ? "PERFECTO!"
                  : porcentaje >= 70
                    ? "Excelente!"
                    : porcentaje >= 50
                      ? "Buen trabajo!"
                      : "Sigue practicando!";

              return (
                <>
                  <h2>Juego Terminado</h2>

                  <div className="resumen-final">
                    <h3>Resultados Finales</h3>

                    <p>
                      <strong>Correctos:</strong> {correctas}
                    </p>
                    <p>
                      <strong>Incorrectos:</strong> {incorrectas}
                    </p>
                    <p>
                      <strong>Puntuación total:</strong> {score} / {maxScore}
                    </p>

                    <IonBadge className="badge">{etiqueta}</IonBadge>
                  </div>

                  <IonButton
                    id="finalize"
                    expand="block"
                    onClick={handleStartGame}
                  >
                    <IonIcon icon={refresh} slot="start" />
                    Iniciar juego nuevo
                  </IonButton>

                  <IonButton
                    id="exit"
                    expand="block"
                    onClick={handleExitApp}
                    style={{ marginTop: "15px" }}
                  >
                    <IonIcon slot="start" icon={exitOutline}></IonIcon>
                    Finalizar juego
                  </IonButton>
                </>
              );
            })()}
          </div>

          <div className="confetti-container">
            {generarConfeti().map((c) => (
              <div
                key={c.id}
                className="confetti"
                style={{
                  left: `${c.left}%`,
                  animationDelay: `${c.delay}s`,
                  animationDuration: `${c.duration}s`,
                  backgroundColor: c.color,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {showInstructions && (
        <div className="ins-overlay" onClick={() => setShowInstructions(false)}>
          <div className="ins-card" onClick={(e) => e.stopPropagation()}>
            <div className="ins-title">
              <h2
                style={{ margin: 0, fontWeight: "bold", color: "var(--dark)" }}
              >
                Reglas Básicas
              </h2>
              <IonIcon
                icon={closeCircleOutline}
                style={{ fontSize: "26px", color: "var(--dark)" }}
                onClick={() => setShowInstructions(false)}
              />
            </div>

            <div className="ins-stats">
              <p style={{ textAlign: "justify" }}>
                <strong>{getInstructions()}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {showInformation && (
        <div className="info-modal-background">
          <div className="info-modal">
            <div className="header">
              <h2 style={{ color: "var(--color-primary)", fontWeight: "bold" }}>
                {appNombreJuego}
              </h2>
              <p
                style={{
                  color: "#8b8b8bff",
                  marginTop: "5px",
                  textAlign: "center",
                }}
              >
                Actividad configurada desde la plataforma Steam-G
              </p>
            </div>
            <div className="cards-info">
              <div className="card">
                <p className="title">VERSIÓN</p>
                <p className="data">{appVersion}</p>
              </div>
              <div className="card">
                <p className="title">FECHA DE CREACIÓN</p>
                <p className="data">{appFecha}</p>
              </div>
              <div className="card">
                <p className="title">PLATAFORMAS</p>
                <p className="data">{formatPlataforma(appPlataformas)}</p>
              </div>
              <div className="card">
                <p className="title">NÚMERO DE EJERCICIOS</p>
                <p className="data">
                  {currentGameConfig.totalExercises}
                </p>
              </div>
              <div className="card">
                <p className="title">OPORTUNIDADES POR LABERINTO</p>
                <p className="data">
                  {currentGameConfig.attemptsPerExercise}
                </p>
              </div>
              <div className="card description">
                <p className="title">DESCRIPCIÓN</p>
                <p className="data">{appDescripcion}</p>
              </div>
            </div>
            <div className="button">
              <IonButton expand="full" onClick={handleInformation}>
                Cerrar
              </IonButton>
            </div>
          </div>
        </div>
      )}

      {pausado && (
        <div className="pause-overlay">
          <div className="pause-card">
            <h2>Juego en pausa</h2>
            <p>Tu progreso esta pausado.</p>

            <IonButton
              expand="block"
              id="resume"
              style={{ marginTop: "16px" }}
              onClick={handleResume}
            >
              <IonIcon slot="start" icon={playCircleOutline}></IonIcon>
              Reanudar
            </IonButton>

            <IonButton
              expand="block"
              id="finalize"
              style={{ marginTop: "10px" }}
              onClick={handleFinalizeCurrentGame}
            >
              <IonIcon slot="start" icon={exitOutline}></IonIcon>
              Finalizar juego
            </IonButton>

            <IonButton
              expand="block"
              id="exit"
              style={{ marginTop: "10px" }}
              onClick={handleExitApp}
            >
              <IonIcon slot="start" icon={exitOutline}></IonIcon>
              Cerrar aplicación
            </IonButton>
          </div>
        </div>
      )}

      <IonContent fullscreen className="ion-padding">
        {showStartScreen ? (
          <div className="inicio-container">
            <div className="header-game ion-no-border">
              <div className="toolbar-game">
                <div className="titles start-page">
                  <h1>{appNombreJuego}</h1>
                </div>
              </div>
            </div>

            <div className="info-juego">
              <div className="info-item">
                <IonChip>
                  <strong>Nivel: {getDifficultyLabel(difficultyConfig)}</strong>
                </IonChip>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
              className="page-start-btns"
            >
              <IonButton onClick={handleStartGame} className="play">
                <IonIcon slot="start" icon={playCircleOutline}></IonIcon>
                Iniciar juego
              </IonButton>
              <IonButton onClick={handleInformation} className="info">
                <IonIcon slot="start" icon={informationCircleOutline}></IonIcon>
                Información
              </IonButton>
            </div>
          </div>
        ) : (
          <>
            <div className="header-game ion-no-border">
              <div className="toolbar-game">
                <div className="titles">
                  <h1>STEAM-G</h1>
                  <IonIcon
                    icon={alertCircleOutline}
                    size="small"
                    id="info-icon"
                  />
                  <IonPopover
                    trigger="info-icon"
                    side="bottom"
                    alignment="center"
                  >
                    <IonCard className="filter-card ion-no-margin">
                      <div className="section header-section">
                        <h2>{appNombreJuego}</h2>
                      </div>

                      <div className="section description-section">
                        <p>{appDescripcion}</p>
                      </div>

                      <div className="section footer-section">
                        <span>{appFecha}</span>
                      </div>
                    </IonCard>
                  </IonPopover>
                </div>
                <span>
                  <strong>{appNombreJuego}</strong>
                </span>
              </div>
            </div>

            <div className="instructions-exercises">
              <div className="num-words play">
                {showTypeInstructions ? (
                  <>
                    <IonIcon icon={gameControllerOutline} className="icono" />
                    <strong>
                      {currentExerciseIndex + 1} de {currentGameConfig.totalExercises}
                    </strong>
                  </>
                ) : (
                  <strong>
                    Juego {currentExerciseIndex + 1} de {currentGameConfig.totalExercises}
                  </strong>
                )}
              </div>

              <div className="opportunities">
                <IonIcon icon={gameControllerOutline} className="icono" />
                <h5 className="opportunities-display">
                  Oportunidades: {mazeAttemptsLeft}/
                  {currentGameConfig.attemptsPerExercise}
                </h5>
              </div>

              <div className="num-words score">
                {showTypeInstructions ? (
                  <>
                    <IonIcon icon={trophyOutline} className="icono" />
                    <strong>{score}</strong>
                  </>
                ) : (
                  <strong>Puntuación: {score}</strong>
                )}
              </div>

              <div className="num-words rules">
                <strong onClick={() => setShowInstructions(true)}>
                  Reglas Básicas
                </strong>
              </div>
            </div>

            <div className="videogame">
              <div
                className={`maze-sequence-panel${
                  isSequenceDragOver ? " is-drag-over" : ""
                }`}
                aria-label="Secuencia"
                onDragLeave={handleSequencePanelDragLeave}
                onDragOver={handleSequencePanelDragOver}
                onDrop={handleSequencePanelDrop}
              >
                <div className="pseudocode-title">
                  <strong>Pseudocodigo</strong>
                </div>

                <div className="pseudocode-editor">
                  <div className="pseudocode-line">
                    <span className="pseudocode-line-number">1</span>
                    <code>
                      <span className="pseudocode-keyword">INICIO</span>
                    </code>
                  </div>

                  {mazeSequence.map((slot, index) => {
                    const block = slot ? getMazeToolById(slot.id) : undefined;

                    return (
                      <div
                        className={`pseudocode-slot${
                          slot ? ` filled ${slot.id}` : ""
                        }${
                          dragOverSlotIndex === index ? " is-drag-over" : ""
                        }`}
                        data-maze-sequence-slot={index}
                        key={index}
                        onDragLeave={handleSequenceSlotDragLeave}
                        onDragOver={(event) =>
                          handleSequenceSlotDragOver(event, index)
                        }
                        onDrop={(event) =>
                          handleSequenceSlotDrop(event, index)
                        }
                      >
                        <span className="pseudocode-line-number">
                          {index + 2}
                        </span>
                        <code>
                          {slot && block ? (
                            <>
                              {renderMazeCodeBlockContent(
                                block,
                                slot.value,
                                (value) => updateMazeCommandValue(index, value),
                              )}
                              <button
                                aria-label="Quitar comando"
                                className="maze-slot-remove"
                                onClick={() => removeMazeCommand(index)}
                                type="button"
                              >
                                x
                              </button>
                            </>
                          ) : (
                            "..."
                          )}
                        </code>
                      </div>
                    );
                  })}

                  <div className="pseudocode-line">
                    <span className="pseudocode-line-number">
                      {mazeSequence.length + 2}
                    </span>
                    <code>
                      <span className="pseudocode-keyword">FIN</span>
                    </code>
                  </div>
                </div>
              </div>

              <div className="maze-tools-panel" aria-label="Herramientas">
                {/* <div className="maze-tools-title">
                  <strong>Bloques</strong>
                </div> */}

                <div className="maze-tool-list">
                  {MAZE_TOOL_BLOCKS.map((block) => (
                    <button
                      className={`maze-code-block ${block.id}`}
                      draggable
                      key={block.id}
                      onClick={() => addToolToSequence(block.id)}
                      onDragEnd={() => resetMazeDragState()}
                      onDragStart={(event) =>
                        handleMazeToolDragStart(event, block.id)
                      }
                      onPointerCancel={handleMazeToolPointerCancel}
                      onPointerDown={(event) =>
                        handleMazeToolPointerDown(event, block.id)
                      }
                      onPointerMove={handleMazeToolPointerMove}
                      onPointerUp={handleMazeToolPointerUp}
                      type="button"
                    >
                      {renderMazeCodeBlockContent(block)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="maze-board-panel">
                <div className="maze-board-stage">
                  <div
                    className="maze-grid"
                    style={mazeGridStyle}
                  >
                    {currentMazeExercise.grid.map((row, rowIndex) =>
                      row.map((cell, colIndex) => {
                        const position = { row: rowIndex, col: colIndex };
                        const cellType =
                          cell === "#"
                            ? "empty"
                            : cell === "S"
                              ? "start"
                              : cell === "E"
                                ? "end"
                                : "path";
                        const isCharacter =
                          mazeRuntime.row === rowIndex &&
                          mazeRuntime.col === colIndex;
                        const isVisited = visitedMazePositions.has(
                          getPositionKey(position),
                        );

                        return (
                          <div
                            className={`maze-cell maze-cell--${cellType}${
                              isVisited ? " is-visited" : ""
                            }${isCharacter ? " is-character" : ""}`}
                            key={`${rowIndex}-${colIndex}`}
                          >
                            {cell === "S" && !isCharacter && <span>INICIO</span>}
                            {cell === "E" && !isCharacter && <span>META</span>}
                          </div>
                        );
                      }),
                    )}
                    <img
                      alt="Personaje"
                      className={`maze-character maze-character--${mazeRuntime.direction}`}
                      draggable={false}
                      src={MAZE_CHARACTER_GIFS[mazeRuntime.action]}
                      style={mazeCharacterStyle}
                    />
                  </div>
                </div>

                {mazeNotice && (
                  <div className={`maze-notice maze-notice--${mazeNotice.type}`}>
                    {mazeNotice.msg}
                  </div>
                )}
              </div>
            </div>

            {mazePointerDrag?.active && (
              (() => {
                const previewBlock = getMazeToolById(mazePointerDrag.toolId);
                if (!previewBlock) return null;

                return (
                  <div
                    className="maze-drag-preview"
                    style={{
                      left: `${mazePointerDrag.x}px`,
                      top: `${mazePointerDrag.y}px`,
                    }}
                  >
                    {renderMazeCodeBlockContent(previewBlock)}
                  </div>
                );
              })()
            )}

            <div className="button game">
              <IonButton
                shape="round"
                expand="full"
                onClick={handlePausar}
                disabled={
                  showCountdown ||
                  showFeedback ||
                  showSummary ||
                  showInstructions ||
                  pausado ||
                  activeButtonIndex !== null ||
                  !isComplete ||
                  isExecutingMaze
                }
              >
                <IonIcon slot="start" icon={pauseCircleOutline} />
                Pausar
              </IonButton>

              <IonButton
                shape="round"
                expand="full"
                onClick={handleEjecutar}
                disabled={
                  !gameActive ||
                  isExecutingMaze ||
                  isPaused ||
                  showCountdown ||
                  showFeedback ||
                  showSummary ||
                  showInstructions ||
                  pausado
                }
              >
                <IonIcon slot="start" icon={playCircleOutline} />
                Ejecutar
              </IonButton>
            </div>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Home;
