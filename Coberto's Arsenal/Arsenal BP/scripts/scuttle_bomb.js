import { Direction, system, world } from "@minecraft/server";

// Scuttle Bomb: a thrown mine on legs.
// - A direct hit on a mob or player explodes straight away.
// - Landing on a block turns it into a walking Scuttle Bomb (entities/scuttle_bomb.json).
//   That entity runs at the nearest hostile mob or player (never its thrower) within
//   16 blocks and arms itself when it gets close (event thecoberto:arm); this file then
//   sets off the blast after a short fuse. Until it finds a target it sits still and
//   can be picked back up.

const THROWN = "thecoberto:scuttle_bomb_entity";
const WALKER = "thecoberto:scuttle_bomb";

const BLAST_POWER = 3;
const FUSE_TICKS = 15;

// Each thrower gets a permanent owner slot: a tag the walker's target filter skips.
// SLOTS must match the thecoberto:owner_<n> groups in entities/scuttle_bomb.json.
// With more than SLOTS throwers in a world, two of them share a slot and so are
// safe from each other's bombs.
const SLOTS = 8;
const OWNER_TAG = "thecoberto:scuttle_owner_";
const SLOT_PROPERTY = "thecoberto:scuttle_slot";
const NEXT_SLOT_PROPERTY = "thecoberto:scuttle_next_slot";

// How far out from the face it hit the walker is placed, so it doesn't spawn inside the block.
const FACE_OFFSET = {
  [Direction.North]: { x: 0, y: 0, z: -0.3 },
  [Direction.South]: { x: 0, y: 0, z: 0.3 },
  [Direction.West]: { x: -0.3, y: 0, z: 0 },
  [Direction.East]: { x: 0.3, y: 0, z: 0 },
  [Direction.Down]: { x: 0, y: -0.5, z: 0 },
};

world.afterEvents.projectileHitEntity.subscribe((event) => {
  if (!isThrownBomb(event.projectile)) return;
  const { dimension, location, source } = event;
  remove(event.projectile);
  explode(dimension, location, source);
});

world.afterEvents.projectileHitBlock.subscribe((event) => {
  if (!isThrownBomb(event.projectile)) return;
  const { dimension, location, source } = event;
  remove(event.projectile);

  let at = location;
  try {
    const { block, face } = event.getBlockHit();
    if (face === Direction.Up) {
      at = { x: location.x, y: block.location.y + 1, z: location.z };
    } else {
      const o = FACE_OFFSET[face] ?? { x: 0, y: 0, z: 0 };
      at = { x: location.x + o.x, y: location.y + o.y, z: location.z + o.z };
    }
  } catch {}

  try {
    const walker = dimension.spawnEntity(WALKER, at);
    const slot = source?.typeId === "minecraft:player" ? ownerSlot(source) : undefined;
    walker.triggerEvent(slot === undefined ? "thecoberto:owner_none" : `thecoberto:owner_${slot}`);
  } catch {} // Unloaded chunk.
});

const armed = new Set();

world.afterEvents.dataDrivenEntityTrigger.subscribe(
  ({ entity, eventId }) => {
    if (eventId !== "thecoberto:arm") return;
    let id;
    try {
      if (entity.typeId !== WALKER) return;
      id = entity.id;
      entity.dimension.playSound("random.fuse", entity.location);
    } catch {
      return;
    }
    if (armed.has(id)) return; // already counting down
    armed.add(id);

    system.runTimeout(() => {
      armed.delete(id);
      const walker = world.getEntity(id);
      if (!walker?.isValid) return;
      const { dimension, location } = walker;
      remove(walker);
      explode(dimension, location);
    }, FUSE_TICKS);
  },
  { entityTypes: [WALKER], eventTypes: ["thecoberto:arm"] }
);

// The player's owner slot, giving them one (and its tag) the first time they throw.
function ownerSlot(player) {
  try {
    let slot = player.getDynamicProperty(SLOT_PROPERTY);
    if (typeof slot !== "number" || slot < 0 || slot >= SLOTS) {
      const next = world.getDynamicProperty(NEXT_SLOT_PROPERTY);
      slot = typeof next === "number" ? next % SLOTS : 0;
      world.setDynamicProperty(NEXT_SLOT_PROPERTY, slot + 1);
      player.setDynamicProperty(SLOT_PROPERTY, slot);
    }
    if (!player.hasTag(OWNER_TAG + slot)) player.addTag(OWNER_TAG + slot);
    return slot;
  } catch {
    return undefined;
  }
}

function isThrownBomb(projectile) {
  try {
    return projectile.typeId === THROWN;
  } catch {
    return false; // Already gone.
  }
}

function remove(entity) {
  try {
    entity.remove();
  } catch {}
}

function explode(dimension, location, source) {
  try {
    dimension.createExplosion(location, BLAST_POWER, { breaksBlocks: false, causesFire: false, source });
  } catch {}
  try {
    const { x, y, z } = location;
    dimension.runCommand(`execute positioned ${x} ${y} ${z} run function effect/explosion`);
  } catch {}
}
