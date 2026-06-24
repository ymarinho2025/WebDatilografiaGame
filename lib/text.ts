export const MAX_CHARS_PER_LINE = 55;

export function removeAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeText(value: string): string {
  return removeAccents(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeKey(value: string): string {
  if (!value) return "";
  if (value === " ") return " ";
  return normalizeText(value).slice(0, 1);
}

export function splitIntoLines(text: string, maxChars = MAX_CHARS_PER_LINE): string[] {
  const normalized = normalizeText(text);
  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      if (word.length <= maxChars) {
        current = word;
      } else {
        for (let i = 0; i < word.length; i += maxChars) {
          lines.push(word.slice(i, i + maxChars));
        }
      }
      continue;
    }

    const candidate = `${current} ${word}`;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      lines.push(current);
      if (word.length <= maxChars) {
        current = word;
      } else {
        current = "";
        for (let i = 0; i < word.length; i += maxChars) {
          const chunk = word.slice(i, i + maxChars);
          if (chunk.length === maxChars) lines.push(chunk);
          else current = chunk;
        }
      }
    }
  }

  if (current) lines.push(current);
  return lines;
}

export function totalChars(lines: string[]): number {
  return lines.reduce((sum, line) => sum + line.length, 0);
}

export function completedChars(lines: string[], lineIndex: number, typedLine: string): number {
  const completed = lines.slice(0, lineIndex).reduce((sum, line) => sum + line.length, 0);
  return completed + typedLine.length;
}

export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
