import { MAZE_LEVELS, type MazeCell, type MazePosition } from "./mazeLevels";

const DIRECTIONS: MazePosition[] = [
  { row: -1, col: 0 },
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
];

const isWalkableCell = (cell: MazeCell | undefined) =>
  cell !== undefined && cell !== "#";

const findCells = (grid: MazeCell[][], target: MazeCell) => {
  const cells: MazePosition[] = [];

  grid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell === target) {
        cells.push({ row: rowIndex, col: colIndex });
      }
    });
  });

  return cells;
};

const countSimplePaths = (
  grid: MazeCell[][],
  start: MazePosition,
  end: MazePosition,
) => {
  let paths = 0;
  const visited = new Set<string>();

  const walk = (position: MazePosition) => {
    if (paths > 1) return;

    if (position.row === end.row && position.col === end.col) {
      paths += 1;
      return;
    }

    const key = `${position.row}:${position.col}`;
    visited.add(key);

    DIRECTIONS.forEach((direction) => {
      const next = {
        row: position.row + direction.row,
        col: position.col + direction.col,
      };
      const nextKey = `${next.row}:${next.col}`;

      if (
        isWalkableCell(grid[next.row]?.[next.col]) &&
        !visited.has(nextKey)
      ) {
        walk(next);
      }
    });

    visited.delete(key);
  };

  walk(start);

  return paths;
};

describe("MAZE_LEVELS", () => {
  test("each exercise has exactly one valid path from start to goal", () => {
    const errors: string[] = [];

    Object.entries(MAZE_LEVELS).forEach(([levelKey, level]) => {
      level.exercises.forEach((exercise) => {
        const width = exercise.grid[0]?.length ?? 0;
        const starts = findCells(exercise.grid, "S");
        const ends = findCells(exercise.grid, "E");
        const exerciseName = `${levelKey} ${exercise.id}`;

        exercise.grid.forEach((row, rowIndex) => {
          if (row.length !== width) {
            errors.push(`${exerciseName}: row ${rowIndex} has a different width`);
          }
        });

        if (starts.length !== 1) {
          errors.push(`${exerciseName}: expected one start, found ${starts.length}`);
          return;
        }

        if (ends.length !== 1) {
          errors.push(`${exerciseName}: expected one goal, found ${ends.length}`);
          return;
        }

        const [start] = starts;
        const [end] = ends;

        if (
          start.row !== exercise.start.row ||
          start.col !== exercise.start.col
        ) {
          errors.push(`${exerciseName}: start metadata does not match S cell`);
        }

        const pathCount = countSimplePaths(exercise.grid, start, end);

        if (pathCount !== 1) {
          errors.push(`${exerciseName}: expected one path, found ${pathCount}`);
        }
      });
    });

    expect(errors).toEqual([]);
  });
});
