import type { Connection } from "home-assistant-js-websocket";
import { getCollection } from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";
import type { EntityRegistryDisplayEntryResponse } from "./entity/entity_registry";
import type { RegistryCollectionUpdate } from "./ws-registry";
import { processRegistryCollectionUpdate } from "./ws-registry";

interface EntityRegistryDisplayUpdate extends RegistryCollectionUpdate<
  EntityRegistryDisplayEntryResponse["entities"][number]
> {
  ec?: EntityRegistryDisplayEntryResponse["entity_categories"];
}

const processEntityRegistryDisplayUpdate = (
  store: Store<EntityRegistryDisplayEntryResponse>,
  updates: EntityRegistryDisplayUpdate
) => {
  const entityCategories = updates.ec ?? store.state?.entity_categories ?? {};
  const entities = processRegistryCollectionUpdate(
    store.state?.entities,
    updates,
    (entry) => entry,
    (entry) => entry.ei
  );

  store.setState(
    {
      entities,
      entity_categories: entityCategories,
    },
    true
  );
};

const subscribeEntityRegistryDisplayUpdates = (
  conn: Connection,
  store: Store<EntityRegistryDisplayEntryResponse>
) =>
  conn.subscribeMessage<EntityRegistryDisplayUpdate>(
    (updates) => processEntityRegistryDisplayUpdate(store, updates),
    {
      type: "config/entity_registry/subscribe_for_display",
    }
  );

export const subscribeEntityRegistryDisplay = (
  conn: Connection,
  onChange: (entities: EntityRegistryDisplayEntryResponse) => void
) =>
  getCollection(
    conn,
    "_entityRegistryDisplay",
    undefined,
    subscribeEntityRegistryDisplayUpdates
  ).subscribe(onChange);
