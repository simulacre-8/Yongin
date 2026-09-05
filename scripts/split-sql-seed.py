#!/usr/bin/env python3
"""Split INSERT ... VALUES ... ON CONFLICT statements into bounded SQL chunks."""
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
    rows: list[str] = []
    start: int | None = None
    depth = 0
    in_string = False
    index = 0
    while index < len(value_block):
        char = value_block[index]
        if in_string:
            if char == "'":
                if index + 1 < len(value_block) and value_block[index + 1] == "'":
                    index += 2
                    continue
                in_string = False
            index += 1
            continue
        if char == "'":
            in_string = True
        elif char == "(":
            if depth == 0:
                start = index
            depth += 1
        elif char == ")":
            depth -= 1
            if depth == 0 and start is not None:
                rows.append(value_block[start : index + 1].strip())
                start = None
        index += 1
    if in_string or depth != 0 or start is not None:
        raise ValueError("Unbalanced SQL tuple block")
    return rows


def chunk_rows(rows: list[str], max_rows: int, max_chars: int) -> list[list[str]]:
    chunks: list[list[str]] = []
    current: list[str] = []
    size = 0
    for row in rows:
        if current and (len(current) >= max_rows or size + len(row) > max_chars):
            chunks.append(current)
            current = []
            size = 0
        current.append(row)
        size += len(row)
    if current:
        chunks.append(current)
    return chunks


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--max-rows", type=int, default=30)
    parser.add_argument("--max-chars", type=int, default=55000)
    parser.add_argument("--expected-rows", type=int)
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
        for chunk_number, row_chunk in enumerate(chunks, 1):
            filename = f"{sequence:03d}_{table}_{chunk_number:03d}.sql"
            sql = (
                "begin;\n"
                + match.group("header").strip()
                + "\n"
                + ",\n".join(row_chunk)
                + "\n"
                + match.group("conflict").strip()
                + "\ncommit;\n"
                + f"select '{table}:{chunk_number}/{len(chunks)}' as applied limit 1;\n"
            )
            (args.output / filename).write_text(sql, encoding="utf-8")
            manifest.append(f"{filename}\t{len(row_chunk)}\t{len(sql.encode('utf-8'))}")
            sequence += 1

    if args.expected_rows is not None and total_rows != args.expected_rows:
        raise ValueError(f"Expected {args.expected_rows} rows, found {total_rows}")
    if not manifest:
        raise ValueError("No INSERT ... VALUES ... ON CONFLICT statements found")

    (args.output / "manifest.tsv").write_text(
        "file\trows\tbytes\n" + "\n".join(manifest) + "\n", encoding="utf-8"
    )
    print(f"Created {len(manifest)} chunks with {total_rows} total rows")


if __name__ == "__main__":
    main()
