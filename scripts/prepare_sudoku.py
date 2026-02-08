#!/usr/bin/env python3
"""Sample sudoku puzzles from the master collection, solve each, and output JSON."""

import json
import random
import os

COLLECTION_DIR = os.path.join(os.path.dirname(__file__), "..", "SUDOKU Master collection")
OUTPUT = os.path.join(os.path.dirname(__file__), "..", "data", "sudoku.json")

FILES = {
    "easy": "Sudoku_easy.txt",
    "medium": "Sudoku_medium.txt",
    "hard": "Sudoku_hard.txt",
    "diabolical": "Sudoku_diabolical.txt",
}

SAMPLES_PER_DIFFICULTY = 30


def solve(puzzle):
    """Solve a sudoku puzzle string (81 chars, 0=empty) using backtracking with MRV."""
    grid = [int(c) for c in puzzle]

    rows = [set() for _ in range(9)]
    cols = [set() for _ in range(9)]
    boxes = [set() for _ in range(9)]

    empties = []
    for i in range(81):
        r, c = divmod(i, 9)
        b = (r // 3) * 3 + c // 3
        if grid[i] != 0:
            rows[r].add(grid[i])
            cols[c].add(grid[i])
            boxes[b].add(grid[i])
        else:
            empties.append(i)

    def candidates(idx):
        r, c = divmod(idx, 9)
        b = (r // 3) * 3 + c // 3
        return set(range(1, 10)) - rows[r] - cols[c] - boxes[b]

    def bt(pos):
        if pos == len(empties):
            return True
        # MRV: pick the empty cell with fewest candidates
        best = pos
        best_count = 10
        for j in range(pos, len(empties)):
            cnt = len(candidates(empties[j]))
            if cnt < best_count:
                best_count = cnt
                best = j
            if cnt == 0:
                return False
        empties[pos], empties[best] = empties[best], empties[pos]

        idx = empties[pos]
        r, c = divmod(idx, 9)
        b = (r // 3) * 3 + c // 3
        for val in candidates(idx):
            grid[idx] = val
            rows[r].add(val)
            cols[c].add(val)
            boxes[b].add(val)
            if bt(pos + 1):
                return True
            grid[idx] = 0
            rows[r].discard(val)
            cols[c].discard(val)
            boxes[b].discard(val)

        empties[pos], empties[best] = empties[best], empties[pos]
        return False

    if bt(0):
        return "".join(str(d) for d in grid)
    return None


def load_puzzles(filepath):
    """Load 81-char puzzle strings from a file (one per line)."""
    puzzles = []
    with open(filepath) as f:
        for line in f:
            line = line.strip()
            if len(line) == 81 and all(c in "0123456789" for c in line):
                puzzles.append(line)
    return puzzles


def main():
    random.seed(42)
    result = {"difficulties": []}

    for diff_name in ["easy", "medium", "hard", "diabolical"]:
        filepath = os.path.join(COLLECTION_DIR, FILES[diff_name])
        all_puzzles = load_puzzles(filepath)
        print(f"{diff_name}: {len(all_puzzles)} puzzles available")

        sampled = random.sample(all_puzzles, min(SAMPLES_PER_DIFFICULTY, len(all_puzzles)))
        entries = []

        for i, puzzle in enumerate(sampled):
            solution = solve(puzzle)
            if solution is None:
                print(f"  WARNING: could not solve {diff_name}-{i+1:03d}")
                continue
            entries.append({
                "id": f"{diff_name}-{i+1:03d}",
                "puzzle": puzzle,
                "solution": solution,
            })
            print(f"  solved {diff_name}-{i+1:03d}")

        result["difficulties"].append({
            "name": diff_name,
            "puzzles": entries,
        })

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(result, f, separators=(",", ":"))

    print(f"\nWrote {OUTPUT}")


if __name__ == "__main__":
    main()
