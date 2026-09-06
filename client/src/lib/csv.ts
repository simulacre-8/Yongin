export type CsvColumn<Row> = {
  header: string;
  value: (row: Row, index: number) => unknown;
};

function neutralizeSpreadsheetFormula(value: string) {
  const firstMeaningful = value.search(/[^\u0000-\u0020]/);
  if (firstMeaningful < 0) return value;
  return /^[=+\-@]/.test(value.slice(firstMeaningful)) ? `'${value}` : value;
}

function escapeCsvCell(value: unknown) {
  const text = neutralizeSpreadsheetFormula(String(value ?? ""));
  return `"${text.replace(/"/g, '""')}"`;
}

export function serializeCsv<Row>(
  rows: Row[],
  columns: CsvColumn<Row>[]
): string {
  const header = columns.map(column => escapeCsvCell(column.header)).join(",");
  const body = rows.map((row, index) =>
    columns.map(column => escapeCsvCell(column.value(row, index))).join(",")
  );
  return `\uFEFF${[header, ...body].join("\r\n")}\r\n`;
}

export function downloadCsv(csv: string, fileName: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function csvDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
