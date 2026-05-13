export type MazeCell = "S" | "." | "#" | "E";
export type MazeDirection = "up" | "right" | "down" | "left";

export interface MazePosition {
  row: number;
  col: number;
}

export interface MazeExercise {
  id: number;
  grid: MazeCell[][];
  start: MazePosition & { direction: MazeDirection };
}

export interface MazeLevelConfig {
  label: string;
  pointsCorrect: number;
  exercises: MazeExercise[];
}

type MazeLevelKey = "basico" | "intermedio" | "avanzado";

export const MAZE_LEVEL_MAP: Record<string, MazeLevelKey> = {
  basic: "basico",
  intermediate: "intermedio",
  advanced: "avanzado",
};

export const MAZE_LEVELS = {
  basico: {
    label: "Basico",
    pointsCorrect: 10,
    exercises: [
      {
        id: 1,
        start: { row: 1, col: 0, direction: "right" },
        grid: [
          [".", "#", ".", ".", ".", "#", "."],
          ["S", ".", ".", "#", ".", ".", "E"],
          [".", "#", ".", ".", ".", "#", "."],
        ],
      },
      {
        id: 2,
        start: { row: 2, col: 0, direction: "right" },
        grid: [
          [".", "#", ".", "#", ".", ".", "E"],
          [".", "#", ".", ".", ".", "#", "."],
          ["S", ".", ".", "#", "#", ".", "."],
        ],
      },
      {
        id: 3,
        start: { row: 0, col: 0, direction: "right" },
        grid: [
          ["S", ".", ".", ".", "#", ".", "."],
          ["#", "#", "#", ".", ".", ".", "#"],
          [".", ".", ".", "#", ".", ".", "E"],
        ],
      },
    ],
  },
  intermedio: {
    label: "Intermedio",
    pointsCorrect: 15,
    exercises: [
      {
        id: 4,
        start: { row: 2, col: 0, direction: "right" },
        grid: [
          [".", ".", "#", ".", ".", ".", ".", "E"],
          [".", ".", "#", ".", "#", "#", ".", "#"],
          ["S", ".", ".", ".", ".", ".", ".", "."],
        ],
      },
      {
        id: 5,
        start: { row: 0, col: 0, direction: "right" },
        grid: [
          ["S", ".", ".", "#", ".", ".", ".", "."],
          ["#", "#", ".", ".", ".", "#", "#", "."],
          [".", ".", ".", "#", ".", ".", ".", "E"],
        ],
      },
      {
        id: 6,
        start: { row: 1, col: 0, direction: "right" },
        grid: [
          [".", "#", ".", ".", ".", "#", ".", "."],
          ["S", ".", ".", "#", ".", ".", ".", "E"],
          ["#", ".", ".", "#", "#", ".", "#", "."],
        ],
      },
      {
        id: 7,
        start: { row: 2, col: 7, direction: "left" },
        grid: [
          ["E", ".", ".", ".", "#", ".", ".", "."],
          ["#", "#", "#", ".", ".", ".", "#", "."],
          [".", ".", ".", ".", "#", ".", ".", "S"],
        ],
      },
    ],
  },
  avanzado: {
    label: "Avanzado",
    pointsCorrect: 20,
    exercises: [
      {
        id: 8,
        start: { row: 2, col: 0, direction: "right" },
        grid: [
          [".", ".", ".", "#", ".", ".", ".", ".", "E"],
          [".", "#", ".", ".", ".", "#", "#", ".", "#"],
          ["S", ".", ".", "#", ".", ".", ".", ".", "."],
        ],
      },
      {
        id: 9,
        start: { row: 0, col: 8, direction: "down" },
        grid: [
          [".", ".", ".", ".", "#", ".", ".", ".", "S"],
          [".", "#", "#", ".", "#", ".", "#", ".", "."],
          ["E", ".", ".", ".", ".", ".", "#", ".", "."],
        ],
      },
      {
        id: 10,
        start: { row: 1, col: 0, direction: "right" },
        grid: [
          [".", ".", ".", ".", ".", "#", ".", ".", "E"],
          ["S", ".", "#", ".", ".", ".", ".", "#", "."],
          ["#", ".", ".", ".", "#", ".", ".", ".", "."],
        ],
      },
      {
        id: 11,
        start: { row: 2, col: 8, direction: "left" },
        grid: [
          ["E", ".", ".", ".", ".", "#", ".", ".", "."],
          ["#", "#", ".", "#", ".", ".", ".", "#", "."],
          [".", ".", ".", ".", ".", "#", ".", ".", "S"],
        ],
      },
      {
        id: 12,
        start: { row: 0, col: 0, direction: "right" },
        grid: [
          ["S", ".", ".", ".", "#", ".", ".", ".", "."],
          ["#", "#", "#", ".", ".", ".", "#", "#", "."],
          [".", ".", ".", ".", "#", ".", ".", ".", "E"],
        ],
      },
    ],
  },
} satisfies Record<MazeLevelKey, MazeLevelConfig>;
