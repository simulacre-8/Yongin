#!/usr/bin/env python3
"""Split seed_adoms.sql into small transactional INSERT chunks for remote MCP execution."""
from __future__ import annotations

import argparse
import re
import shutil
from pathlib import Path

INSERT_RE = re.compile(
    r"(?P<header>insert\s+into\s+public\.(?P<table>[a-z_]+)\s*\([^;]+?\)\s*values\s*)"
    r"(?P<values>.*?)"
    r"(?P<conflict>on\s+conflict\s+.*?;)",
    re.IGNORECASE | re.DOTALL,
)


def split_tuples(value_block: str) -> list[str]:
    tuples: list[str] = []
    start: int | None = None
    depth = 0
    in_string = False
    i = 0
    while i < len(value_block):
        char = value_block[i]
        if in_string:
            if char == "\\":
                i += 2
                continue
            if char == "'":
                if i + 1 < len(value_block) and value_block[i + 1] == "'":
                    i += 2
                    continue
                in_string = False
            i += 1
            continue
        if char == "'":
            in_string = True
        elif char == "(":
            if depth == 0:
                start = i
            depth += 1
        elif char == ")":
            depth -= 1
            if depth == 0 and start is not None:
                tuples.append(value_block[start : i + 1].strip())
                start = None
        i += 1
    if in_string or depth != 0 or start is not None:
        raise ValueError("Unbalanced SQL tuple block")
    return tuples


def chunk_rows(rows: list[str], max_rows: int, max_chars: int) -> list[list[str]]:
    chunks: list[list[str]] = []
    current: list[str] = []
    current_size = 0
    for row in rows:
        if current and (len(current) >= max_rows or current_size + len(row) > max_chars):
            chunks.append(current)
            current = []
            current_size = 0
        current.append(row)
        current_size += len(row)
    if current:
        chunks.append(current)
    return chunks


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--max-rows", type=int, default=30)
    parser.add_argument("--max-chars", type=int, default=60000)
    args = parser.parse_args()

    source = args.source.read_text(encoding="utf-8-sig")
    if args.output.exists():
        shutil.rmtree(args.output)
    args.output.mkdir(parents=True)

    manifest: list[str] = []
    sequence = 1
    total_rows = 0
    for match in INSERT_RE.finditer(source):
        table = match.group("table")
        rows = split_tuples(match.group("values"))
        total_rows += len(rows)
        chunks = chunk_rows(rows, args.max_rows, args.max_chars)
        for chunk_number, rows_chunk in enumerate(chunks, 1):
            filename = f"{sequence:03d}_{table}_{chunk_number:02d}.sql"
            sql = (
                "begin;\n"
                + match.group("header").strip()
                + "\n"
                + ",\n".join(rows_chunk)
                + "\n"
                + match.group("conflict").strip()
                + "\ncommit;\n"
                + f"select '{table}:{chunk_number}/{len(chunks)}' as applied limit 1;\n"
            )
            (args.output / filename).write_text(sql, encoding="utf-8")
            manifest.append(f"{filename}\t{len(rows_chunk)}\t{len(sql.encode('utf-8'))}")
            sequence += 1

    if total_rows != 880:
        raise ValueError(f"Expected 880 seed rows, found {total_rows}")
    (args.output / "manifest.tsv").write_text(
        "file\trows\tbytes\n" + "\n".join(manifest) + "\n", encoding="utf-8"
    )
    print(f"Created {len(manifest)} chunks with {total_rows} total rows")


if __name__ == "__main__":
    main()
