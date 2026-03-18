export interface RegistryCollectionUpdate<EncodedEntry> {
  i?: EncodedEntry[];
  a?: EncodedEntry[];
  c?: EncodedEntry[];
  r?: string[];
  o?: string[];
}

export const processRegistryCollectionUpdate = <EncodedEntry, DecodedEntry>(
  current: DecodedEntry[] | undefined,
  updates: RegistryCollectionUpdate<EncodedEntry>,
  decodeEntry: (entry: EncodedEntry) => DecodedEntry,
  entryId: (entry: DecodedEntry) => string,
  sortEntries?: (entry1: DecodedEntry, entry2: DecodedEntry) => number
): DecodedEntry[] => {
  let next = updates.i ? updates.i.map(decodeEntry) : [...(current ?? [])];

  for (const encodedEntry of updates.a ?? []) {
    const entry = decodeEntry(encodedEntry);
    const index = next.findIndex(
      (currentEntry) => entryId(currentEntry) === entryId(entry)
    );

    if (index === -1) {
      next.push(entry);
      continue;
    }

    next[index] = entry;
  }

  for (const encodedEntry of updates.c ?? []) {
    const entry = decodeEntry(encodedEntry);
    const index = next.findIndex(
      (currentEntry) => entryId(currentEntry) === entryId(entry)
    );

    if (index === -1) {
      next.push(entry);
      continue;
    }

    next[index] = entry;
  }

  if (updates.r?.length) {
    const removed = new Set(updates.r);
    next = next.filter((entry) => !removed.has(entryId(entry)));
  }

  if (updates.o?.length) {
    const orderedEntries = new Map(
      next.map((entry) => [entryId(entry), entry] as const)
    );
    next = updates.o
      .map((id) => orderedEntries.get(id))
      .filter((entry): entry is DecodedEntry => entry !== undefined);
  }

  if (sortEntries) {
    next = [...next].sort(sortEntries);
  }

  return next;
};
