import { system, world } from "@minecraft/server";

// Bee Bomb: a small blast that releases a swarm of angry bees. The bees attack
// every mob and player nearby except whoever threw the bomb, and are removed
// after 30 seconds. Only bees from a Bee Bomb are removed, never other bees.

const BEE_BOMB = "thecoberto:bee_bomb_entity";
const SWARM_BEE = "thecoberto:swarm_bee";

const BLAST_RADIUS = 2;
const BEE_COUNT = 6;
const BEE_LIFETIME_TICKS = 30 * 20; // matches minecraft:timer in entities/swarm_bee.json

// The swarm bee entity has one target filter per "owner slot", each ignoring
// players with the tag thecoberto:bee_owner_<slot>. A thrower borrows a slot
// while their bees are alive. SLOTS must match the groups in swarm_bee.json.
const SLOTS = 8;
const OWNER_TAG = "thecoberto:bee_owner_";
const slots = new Array(SLOTS).fill(null); // { playerId, expiresAt }

world.afterEvents.projectileHitBlock.subscribe((event) => burst(event));
world.afterEvents.projectileHitEntity.subscribe((event) => burst(event));

function burst({ projectile, dimension, location, source }) {
  let type;
  try {
    type = projectile.typeId;
  } catch {
    return; // The projectile is already gone.
  }
  if (type !== BEE_BOMB) return;

  try {
    projectile.remove(); // so it can't go off twice
  } catch {}

  try {
    dimension.createExplosion(location, BLAST_RADIUS, { breaksBlocks: false, causesFire: false, source });
  } catch {}

  const slot = source?.typeId === "minecraft:player" ? claimSlot(source) : undefined;
  for (let i = 0; i < BEE_COUNT; i++) {
    const at = {
      x: location.x + (Math.random() - 0.5) * 2,
      y: location.y + 1 + Math.random(),
      z: location.z + (Math.random() - 0.5) * 2,
    };
    try {
      const bee = dimension.spawnEntity(SWARM_BEE, at);
      // Not thrown by a player (a dispenser, say): use slot 0's filter, which spares at most one player.
      bee.triggerEvent(`thecoberto:owner_${slot ?? 0}`);
      // The entity's own timer removes it too; this is a backup in case the timer was paused.
      const id = bee.id;
      system.runTimeout(() => world.getEntity(id)?.remove(), BEE_LIFETIME_TICKS + 20);
    } catch {} // Unloaded chunk or no room.
  }
}

// Gives the player an owner slot (their existing one if they have one) for as
// long as their newest bees live.
function claimSlot(player) {
  const now = system.currentTick;
  const expiresAt = now + BEE_LIFETIME_TICKS + 20;

  let slot = slots.findIndex((s) => s?.playerId === player.id);
  if (slot === -1) slot = slots.findIndex((s) => s === null);
  if (slot === -1) {
    // All slots busy: take the one that frees up soonest.
    slot = slots.reduce((best, s, i) => (s.expiresAt < slots[best].expiresAt ? i : best), 0);
    releaseSlot(slot);
  }

  slots[slot] = { playerId: player.id, expiresAt };
  try {
    player.addTag(OWNER_TAG + slot);
  } catch {}

  system.runTimeout(() => {
    if (slots[slot]?.expiresAt === expiresAt) releaseSlot(slot);
  }, expiresAt - now);
  return slot;
}

function releaseSlot(slot) {
  const held = slots[slot];
  slots[slot] = null;
  if (!held) return;
  try {
    world.getEntity(held.playerId)?.removeTag(OWNER_TAG + slot);
  } catch {}
}

// Tags left behind by a player who logged off, or by a world reload, would
// make them safe from other people's bees. Clear them when they join.
world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (!initialSpawn) return;
  for (const tag of player.getTags()) {
    if (!tag.startsWith(OWNER_TAG)) continue;
    const slot = Number(tag.slice(OWNER_TAG.length));
    if (slots[slot]?.playerId !== player.id) player.removeTag(tag);
  }
});
