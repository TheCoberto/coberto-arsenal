# coberto-arsenal

**Coberto's Arsenal** is a Minecraft Bedrock add-on with every TheCoberto weapon in one pack.

Requires Minecraft Bedrock **1.21.100** or newer. No experiments needed.

> Use Arsenal **instead of** Rocket Launcher (fat-man), Skeleton Variants (stronger-skeletons) and Bow Variants, not alongside them. The item IDs match those add-ons, so you can swap one for the other in an existing world and keep your items.

## Weapons

| Weapon | What it does |
| --- | --- |
| **Fat Man** | Rocket launcher. Fires Mini-Nukes and Napalm Bombs. |
| **Mini-Nuke** | One huge explosion (radius 20) with a mushroom cloud. |
| **Napalm Bomb** | A small blast, then sets everything within 8 blocks on fire. |
| **Explosive Bow** + **Explosive Arrow** | Arrows explode on impact. |
| **Levitation Bow** + **Levitation Arrow** | Arrows make whatever they hit float. |
| **Creeper Bomb** | Throwable grenade that explodes on impact without breaking blocks. |
| **Bee Bomb** | Throwable bomb that bursts into 6 angry bees. They attack every mob and player nearby except the thrower, don't die when they sting, and fly off after 30 seconds. Only Bee Bomb bees go away; other bees are never touched. |

### Bee Bomb recipe

```
 . H T      H = Honeycomb
 H G H      T = Tripwire Hook
 G H G      G = Gunpowder
```

## Settings

Operators can run `/thecoberto:fatman` in chat to choose whether Fat Man explosions break blocks and Napalm Bombs start fires.

## Where the files come from

- The Fat Man files started as a copy of [fat-man](https://github.com/TheCoberto/fat-man).
- The bows, arrows and Creeper Bomb are edited in [stronger-skeletons](https://github.com/TheCoberto/stronger-skeletons) and copied here with `sync.ps1` (see `sync.json`):

```powershell
powershell -ExecutionPolicy Bypass -File ..\bedrock-tools\sync.ps1
```

- The Bee Bomb and swarm bee live only here.

## Building

Use `package.ps1` from [bedrock-tools](https://github.com/TheCoberto/bedrock-tools), cloned next to this repo:

```powershell
powershell -ExecutionPolicy Bypass -File ..\bedrock-tools\package.ps1
```
