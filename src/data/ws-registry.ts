import type { Connection, MessageBase } from "home-assistant-js-websocket";
import { getCollection } from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";

export interface RegistryCollectionUpdate<EncodedEntry> {
  i?: EncodedEntry[];
  u?: EncodedEntry;
  r?: string;
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

  if (updates.u) {
    const entry = decodeEntry(updates.u);
    const index = next.findIndex(
      (currentEntry) => entryId(currentEntry) === entryId(entry)
    );

    if (index === -1) {
      next.push(entry);
    } else {
      next[index] = entry;
    }
  }

  if (updates.r) {
    next = next.filter((entry) => entryId(entry) !== updates.r);
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

export const createCollectionSubscription =
  <State, Update, SubscribeMessage extends MessageBase>(
    collectionKey: string,
    subscribeMessage: SubscribeMessage,
    processUpdate: (current: State | undefined, update: Update) => State
  ) =>
  (conn: Connection, onChange: (state: State) => void) =>
    getCollection(
      conn,
      collectionKey,
      undefined,
      (conn2: Connection, store: Store<State>) =>
        conn2.subscribeMessage<Update>(
          (update) => store.setState(processUpdate(store.state, update), true),
          subscribeMessage
        )
    ).subscribe(onChange);

export const createRegistryCollection = <
  EncodedEntry,
  DecodedEntry,
  SubscribeMessage extends MessageBase,
>(
  collectionKey: string,
  subscribeMessage: SubscribeMessage,
  decodeEntry: (entry: EncodedEntry) => DecodedEntry,
  entryId: (entry: DecodedEntry) => string,
  sortEntries?: (entry1: DecodedEntry, entry2: DecodedEntry) => number
) =>
  createCollectionSubscription<
    DecodedEntry[],
    RegistryCollectionUpdate<EncodedEntry>,
    SubscribeMessage
  >(collectionKey, subscribeMessage, (current, updates) =>
    processRegistryCollectionUpdate(
      current,
      updates,
      decodeEntry,
      entryId,
      sortEntries
    )
  );
