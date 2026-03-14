import type { RawMapping } from "./rewrite";

function lineColToOffset(text: string, line: number, col: number): number {
  let offset = 0;
  let currentLine = 1;
  while (currentLine < line) {
    const nl = text.indexOf("\n", offset);
    if (nl === -1) return text.length;
    offset = nl + 1;
    currentLine++;
  }
  return offset + col;
}

function buildOffsetIndex(text: string, mappings: RawMapping[], useGenerated: boolean): { offset: number; mappingIdx: number }[] {
  const index: { offset: number; mappingIdx: number }[] = [];
  for (let i = 0; i < mappings.length; i++) {
    const m = mappings[i];
    const pos = useGenerated ? m.generated : m.original;
    if (!pos) continue;
    index.push({ offset: lineColToOffset(text, pos.line, pos.column), mappingIdx: i });
  }
  index.sort((a, b) => a.offset - b.offset);
  return index;
}

function findMappingAtOffset(index: { offset: number; mappingIdx: number }[], offset: number): number {
  let lo = 0;
  let hi = index.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (index[mid].offset <= offset) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result >= 0 ? index[result].mappingIdx : -1;
}

export interface CharRange {
  start: number;
  end: number;
}

export function mapGeneratedRangeToOriginal(
  rewritten: string,
  original: string,
  mappings: RawMapping[],
  genStart: number,
  genEnd: number,
): CharRange | null {
  const genIndex = buildOffsetIndex(rewritten, mappings, true);
  const origIndex = buildOffsetIndex(original, mappings, false);

  const startMappingIdx = findMappingAtOffset(genIndex, genStart);
  const endMappingIdx = findMappingAtOffset(genIndex, genEnd);

  if (startMappingIdx === -1) return null;

  const startOrigPos = mappings[startMappingIdx].original;
  if (!startOrigPos) return null;
  const origStart = lineColToOffset(original, startOrigPos.line, startOrigPos.column);

  let origEnd: number;
  if (endMappingIdx !== -1 && endMappingIdx !== startMappingIdx) {
    const endOrigPos = mappings[endMappingIdx].original;
    if (endOrigPos) {
      const endBase = lineColToOffset(original, endOrigPos.line, endOrigPos.column);
      const genEndBase = genIndex.find(e => e.mappingIdx === endMappingIdx)!.offset;
      const genTrail = genEnd - genEndBase;
      origEnd = endBase + genTrail;
    } else {
      origEnd = origStart + (genEnd - genStart);
    }
  } else {
    origEnd = origStart + (genEnd - genStart);
  }

  return { start: Math.min(origStart, origEnd), end: Math.max(origStart, origEnd) };
}

export function mapOriginalRangeToGenerated(
  rewritten: string,
  original: string,
  mappings: RawMapping[],
  origStart: number,
  origEnd: number,
): CharRange | null {
  const genIndex = buildOffsetIndex(rewritten, mappings, true);
  const origIndex = buildOffsetIndex(original, mappings, false);

  const startMappingIdx = findMappingAtOffset(origIndex, origStart);
  const endMappingIdx = findMappingAtOffset(origIndex, origEnd);

  if (startMappingIdx === -1) return null;

  const startGenPos = mappings[startMappingIdx].generated;
  const genStart = lineColToOffset(rewritten, startGenPos.line, startGenPos.column);

  let genEnd: number;
  if (endMappingIdx !== -1 && endMappingIdx !== startMappingIdx) {
    const endGenPos = mappings[endMappingIdx].generated;
    const endBase = lineColToOffset(rewritten, endGenPos.line, endGenPos.column);
    const origEndBase = origIndex.find(e => e.mappingIdx === endMappingIdx)!.offset;
    const origTrail = origEnd - origEndBase;
    genEnd = endBase + origTrail;
  } else {
    genEnd = genStart + (origEnd - origStart);
  }

  return { start: Math.min(genStart, genEnd), end: Math.max(genStart, genEnd) };
}
