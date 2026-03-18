import type { Connection } from "home-assistant-js-websocket";
import type { EntityRegistryDisplayEntryResponse } from "./entity/entity_registry";
import {
  createCollectionSubscription,
  type RegistryCollectionUpdate,
  processRegistryCollectionUpdate,
} from "./ws-registry";

interface EntityRegistryDisplayUpdate extends RegistryCollectionUpdate<
  EntityRegistryDisplayEntryResponse["entities"][number]
> {
  ec?: EntityRegistryDisplayEntryResponse["entity_categories"];
}

const processEntityRegistryDisplayUpdate = (
  current: EntityRegistryDisplayEntryResponse | undefined,
  updates: EntityRegistryDisplayUpdate
): EntityRegistryDisplayEntryResponse => {
  const entityCategories = updates.ec ?? current?.entity_categories ?? {};
  const entities = processRegistryCollectionUpdate(
    current?.entities,
    updates,
    (entry) => entry,
    (entry) => entry.ei
  );

  return {
    entities,
    entity_categories: entityCategories,
  };
};

const subscribeEntityRegistryDisplayUpdates = createCollectionSubscription(
  "_entityRegistryDisplay",
  { type: "config/entity_registry/subscribe_for_display" },
  processEntityRegistryDisplayUpdate
);

export const subscribeEntityRegistryDisplay = (
  conn: Connection,
  onChange: (entities: EntityRegistryDisplayEntryResponse) => void
) => subscribeEntityRegistryDisplayUpdates(conn, onChange);
