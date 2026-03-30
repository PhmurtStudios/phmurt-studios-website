#!/usr/bin/env python3
"""
Fantasy World Map Generator — Python/Pillow Engine
Generates highly detailed fantasy maps with tectonic-inspired continents,
climate-aware biomes, rivers, civilizations, and hand-drawn cartographic style.
"""

import sys
import math
import random
import struct
import hashlib
from collections import deque

import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# =============================================================================
# CONFIGURATION
# =============================================================================

MAP_W = 3840  # 4K output width
MAP_H = 2560  # 4K output height
GRID_COLS = 384  # simulation grid (matches 4K at 10px/cell)
GRID_ROWS = 256
CELL_W = MAP_W / GRID_COLS
CELL_H = MAP_H / GRID_ROWS
WATER_LEVEL = 0.48  # higher = more ocean, better multi-continent balance
MARGIN = 60  # border margin pixels

# =============================================================================
# SEEDED RANDOM NUMBER GENERATOR
# =============================================================================

class SeededRNG:
    """Simple seeded PRNG for reproducible generation."""
    def __init__(self, seed):
        self.seed = seed
        self._rng = random.Random(seed)
        self._np_rng = np.random.RandomState(seed)

    def random(self):
        return self._rng.random()

    def randint(self, a, b):
        return self._rng.randint(a, b)

    def uniform(self, a, b):
        return self._rng.uniform(a, b)

    def gauss(self, mu, sigma):
        return self._rng.gauss(mu, sigma)

    def choice(self, seq):
        return self._rng.choice(seq)

    def sample(self, seq, k):
        return self._rng.sample(seq, k)

    def shuffle(self, seq):
        self._rng.shuffle(seq)

    def np_random(self, *shape):
        return self._np_rng.random_sample(shape)

# =============================================================================
# NOISE FUNCTIONS
# =============================================================================

def _hash2d(x, y, seed=0):
    """Fast hash for 2D integer coordinates."""
    n = x * 374761393 + y * 668265263 + seed * 1274126177
    n = (n ^ (n >> 13)) * 1274126177
    n = n ^ (n >> 16)
    return (n & 0x7fffffff) / 0x7fffffff


def value_noise_2d(x, y, seed=0):
    """Smooth value noise with bicubic interpolation."""
    ix = int(math.floor(x))
    iy = int(math.floor(y))
    fx = x - ix
    fy = y - iy

    # Smoothstep
    fx = fx * fx * (3 - 2 * fx)
    fy = fy * fy * (3 - 2 * fy)

    v00 = _hash2d(ix, iy, seed)
    v10 = _hash2d(ix + 1, iy, seed)
    v01 = _hash2d(ix, iy + 1, seed)
    v11 = _hash2d(ix + 1, iy + 1, seed)

    return (v00 * (1 - fx) * (1 - fy) +
            v10 * fx * (1 - fy) +
            v01 * (1 - fx) * fy +
            v11 * fx * fy)


def fractal_noise(x, y, octaves=6, persistence=0.5, lacunarity=2.0, seed=0):
    """Multi-octave fractal noise."""
    val = 0.0
    amp = 1.0
    freq = 1.0
    max_val = 0.0
    for _ in range(octaves):
        val += value_noise_2d(x * freq, y * freq, seed) * amp
        max_val += amp
        amp *= persistence
        freq *= lacunarity
    return val / max_val


def domain_warp_noise(x, y, warp_strength=0.15, octaves=4, seed=0):
    """Fractal noise with domain warping for organic shapes."""
    # First warp pass
    wx = fractal_noise(x + 50.3, y + 80.7, octaves=3, seed=seed + 100)
    wy = fractal_noise(x + 120.1, y + 200.3, octaves=3, seed=seed + 200)
    x2 = x + (wx - 0.5) * warp_strength * 4
    y2 = y + (wy - 0.5) * warp_strength * 4
    return fractal_noise(x2, y2, octaves=octaves, seed=seed)


# =============================================================================
# HEIGHTMAP GENERATION — TECTONIC-INSPIRED MULTI-CONTINENT
# =============================================================================

def generate_heightmap(rng, rows=GRID_ROWS, cols=GRID_COLS):
    """Generate a heightmap with multiple tectonic-inspired continents."""
    seed = rng.seed
    hmap = np.zeros((rows, cols), dtype=np.float64)

    # Generate base terrain noise
    for r in range(rows):
        for c in range(cols):
            nx = c / cols * 8.0
            ny = r / rows * 8.0
            hmap[r, c] = fractal_noise(nx, ny, octaves=7, persistence=0.52,
                                       lacunarity=2.1, seed=seed)

    # Create tectonic plate centers — these define continent cores
    # Use Poisson-disk-like placement for better spacing
    num_plates = rng.randint(3, 6)
    plates = []
    for i in range(num_plates * 5):  # try many candidates
        if len(plates) >= num_plates:
            break
        px = rng.uniform(0.1, 0.9)
        py = rng.uniform(0.12, 0.88)
        # Check spacing from existing plates
        too_close = False
        for ep, ey, _, _ in plates:
            if math.sqrt((px - ep)**2 + (py - ey)**2) < 0.25:
                too_close = True
                break
        if too_close:
            continue
        # Each plate has a "continental" strength (how much land it creates)
        strength = rng.uniform(0.35, 0.65)
        # Plate radius — smaller for more ocean between continents
        radius = rng.uniform(0.12, 0.25)
        plates.append((px, py, strength, radius))

    # Apply plate-based continental shaping with domain warping
    for r in range(rows):
        for c in range(cols):
            nx = c / cols
            ny = r / rows

            # Compute influence from all plates
            plate_val = 0.0
            for px, py, strength, radius in plates:
                dx = (nx - px)
                dy = (ny - py) * (rows / cols)  # aspect correction

                # Domain warp the distance for organic plate shapes
                warp_seed = seed + int(px * 1000) + int(py * 2000)
                w1 = fractal_noise(nx * 3.0, ny * 3.0, octaves=3,
                                   seed=warp_seed + 10) - 0.5
                w2 = fractal_noise(nx * 3.0, ny * 3.0, octaves=3,
                                   seed=warp_seed + 20) - 0.5
                dx += w1 * 0.18
                dy += w2 * 0.18

                # Medium-scale warp for coastline detail
                w3 = fractal_noise(nx * 7.0, ny * 7.0, octaves=2,
                                   seed=warp_seed + 30) - 0.5
                w4 = fractal_noise(nx * 7.0, ny * 7.0, octaves=2,
                                   seed=warp_seed + 40) - 0.5
                dx += w3 * 0.06
                dy += w4 * 0.06

                dist = math.sqrt(dx * dx + dy * dy)
                # Smooth falloff from plate center
                influence = max(0, 1.0 - dist / radius)
                influence = influence * influence * (3 - 2 * influence)  # smoothstep
                plate_val += influence * strength

            # Clamp plate influence
            plate_val = min(plate_val, 1.0)

            # Blend noise with plate shaping
            hmap[r, c] = hmap[r, c] * 0.45 + plate_val * 0.55

            # Edge fade — push map borders toward ocean
            edge_dist = min(nx, 1 - nx, ny, 1 - ny)
            border_noise = (fractal_noise(nx * 10, ny * 10, octaves=2,
                                          seed=seed + 500) - 0.5) * 0.03
            edge_dist += border_noise
            if edge_dist < 0.08:
                fade = max(0, edge_dist) / 0.08
                fade = fade * fade * (3 - 2 * fade)
                hmap[r, c] *= fade

    # Normalize to 0-1
    hmin, hmax = hmap.min(), hmap.max()
    if hmax > hmin:
        hmap = (hmap - hmin) / (hmax - hmin)

    # Slight gaussian blur for smoother terrain
    hmap = ndimage.gaussian_filter(hmap, sigma=1.2)

    return hmap


# =============================================================================
# CLIMATE SIMULATION
# =============================================================================

def generate_climate(hmap, rng, rows=GRID_ROWS, cols=GRID_COLS):
    """Generate temperature and moisture maps based on latitude, altitude, and noise."""
    seed = rng.seed
    temperature = np.zeros((rows, cols), dtype=np.float64)
    moisture = np.zeros((rows, cols), dtype=np.float64)

    for r in range(rows):
        for c in range(cols):
            nx = c / cols
            ny = r / rows
            h = hmap[r, c]

            # Temperature: warm at equator (center), cold at poles (top/bottom)
            lat_temp = 1.0 - abs(ny - 0.5) * 2.0  # 0-1, warmest at center
            lat_temp = lat_temp ** 0.8  # slight curve
            # Altitude cooling
            alt_cool = max(0, (h - WATER_LEVEL)) * 0.8 if h > WATER_LEVEL else 0
            # Noise variation
            temp_noise = fractal_noise(nx * 5, ny * 5, octaves=3,
                                       seed=seed + 300) * 0.15
            temperature[r, c] = max(0, min(1, lat_temp - alt_cool + temp_noise))

            # Moisture: higher near coasts and rivers, noise-driven
            moist_base = fractal_noise(nx * 6, ny * 6, octaves=4,
                                       persistence=0.45, seed=seed + 400)
            # Slight latitude influence (wetter near equator)
            lat_moist = 0.6 + 0.4 * (1.0 - abs(ny - 0.5) * 1.5)
            moisture[r, c] = max(0, min(1, moist_base * lat_moist))

    # Add coastal moisture boost via distance transform
    is_water = hmap < WATER_LEVEL
    if np.any(~is_water):
        coast_dist = ndimage.distance_transform_edt(~is_water)
        coast_dist_norm = np.minimum(coast_dist / 15.0, 1.0)  # normalize: 0 at coast, 1 far
        moisture += (1.0 - coast_dist_norm) * 0.25 * (hmap >= WATER_LEVEL).astype(float)
        moisture = np.clip(moisture, 0, 1)

    return temperature, moisture


# =============================================================================
# BIOME ASSIGNMENT
# =============================================================================

BIOMES = {
    'deep_ocean': (0.15, 0.25, 0.35),
    'ocean': (0.25, 0.35, 0.45),
    'coast_water': (0.3, 0.42, 0.5),
    'beach': (0.76, 0.7, 0.5),
    'desert': (0.72, 0.65, 0.42),
    'grassland': (0.55, 0.62, 0.35),
    'plains': (0.6, 0.58, 0.38),
    'forest': (0.3, 0.45, 0.2),
    'dense_forest': (0.2, 0.35, 0.15),
    'hills': (0.5, 0.48, 0.35),
    'mountain': (0.42, 0.4, 0.38),
    'snow_peak': (0.85, 0.85, 0.82),
    'tundra': (0.55, 0.58, 0.52),
}


def assign_biomes(hmap, temperature, moisture, rows=GRID_ROWS, cols=GRID_COLS):
    """Assign biomes based on height, temperature, and moisture."""
    biomes = np.empty((rows, cols), dtype='U15')

    for r in range(rows):
        for c in range(cols):
            h = hmap[r, c]
            t = temperature[r, c]
            m = moisture[r, c]

            if h < WATER_LEVEL * 0.6:
                biomes[r, c] = 'deep_ocean'
            elif h < WATER_LEVEL * 0.85:
                biomes[r, c] = 'ocean'
            elif h < WATER_LEVEL:
                biomes[r, c] = 'coast_water'
            elif h < WATER_LEVEL + 0.03:
                biomes[r, c] = 'beach'
            elif h > 0.82:
                biomes[r, c] = 'snow_peak'
            elif h > 0.68:
                biomes[r, c] = 'mountain'
            elif h > 0.55:
                biomes[r, c] = 'hills'
            elif t < 0.2:
                biomes[r, c] = 'tundra'
            elif m < 0.25 and t > 0.55:
                biomes[r, c] = 'desert'
            elif m > 0.6:
                biomes[r, c] = 'dense_forest'
            elif m > 0.38:
                biomes[r, c] = 'forest'
            elif m > 0.28:
                biomes[r, c] = 'grassland'
            else:
                biomes[r, c] = 'plains'

    return biomes


# =============================================================================
# RIVER GENERATION
# =============================================================================

def generate_rivers(hmap, biomes, rng, rows=GRID_ROWS, cols=GRID_COLS):
    """Generate rivers that flow from mountains downhill to the ocean."""
    rivers = []  # list of [(r,c), (r,c), ...] paths
    is_water = hmap < WATER_LEVEL

    # Find mountain/high-elevation source cells — focus on true mountains
    sources = []
    for r in range(2, rows - 2):
        for c in range(2, cols - 2):
            if is_water[r, c]:
                continue
            h = hmap[r, c]
            b = biomes[r, c]
            # Strong preference for mountain peaks
            if b in ('mountain', 'snow_peak') and rng.random() < 0.04:
                sources.append((r, c, h))
            elif h > 0.55 and b == 'hills' and rng.random() < 0.015:
                sources.append((r, c, h))
    # Sort by height so tallest sources generate first
    sources.sort(key=lambda x: -x[2])
    sources = [(r, c) for r, c, _ in sources[:80]]  # cap at 80 sources

    for sr, sc in sources:
        path = [(sr, sc)]
        visited = {(sr, sc)}
        cr, cc = sr, sc
        max_steps = 500

        for _ in range(max_steps):
            # Find lowest neighbor
            best_r, best_c, best_h = cr, cc, hmap[cr, cc]
            for dr in [-1, 0, 1]:
                for dc in [-1, 0, 1]:
                    if dr == 0 and dc == 0:
                        continue
                    nr, nc = cr + dr, cc + dc
                    if 0 <= nr < rows and 0 <= nc < cols:
                        if (nr, nc) not in visited:
                            # Prefer lower cells, with slight noise to avoid straight lines
                            nh = hmap[nr, nc] + rng.uniform(-0.005, 0.005)
                            if nh < best_h:
                                best_h = nh
                                best_r, best_c = nr, nc

            if best_r == cr and best_c == cc:
                break  # stuck at a local minimum
            cr, cc = best_r, best_c
            path.append((cr, cc))
            visited.add((cr, cc))

            if is_water[cr, cc]:
                break  # reached ocean

        if len(path) > 8:  # only keep significant rivers
            rivers.append(path)

    # Generate tributaries that join existing rivers
    river_cells = set()
    for river in rivers:
        for r, c in river:
            river_cells.add((r, c))

    tributaries = []
    for river in rivers:
        if len(river) < 15:
            continue
        # Pick a few points along the river as tributary targets
        for idx in range(len(river) // 4, len(river) * 3 // 4, max(1, len(river) // 6)):
            if rng.random() > 0.4:
                continue
            tr, tc = river[idx]
            # Find a nearby high point to start tributary from
            best_sr, best_sc, best_sh = -1, -1, -1
            for _ in range(15):
                dr = rng.randint(-12, 12)
                dc = rng.randint(-12, 12)
                sr, sc = tr + dr, tc + dc
                if (0 <= sr < rows and 0 <= sc < cols and
                        not is_water[sr, sc] and (sr, sc) not in river_cells):
                    if hmap[sr, sc] > best_sh and hmap[sr, sc] > hmap[tr, tc]:
                        best_sr, best_sc, best_sh = sr, sc, hmap[sr, sc]
            if best_sr < 0:
                continue

            # Trace downhill from tributary source to main river
            trib_path = [(best_sr, best_sc)]
            trib_visited = {(best_sr, best_sc)}
            cr, cc = best_sr, best_sc
            for _ in range(100):
                lowest_r, lowest_c, lowest_h = cr, cc, hmap[cr, cc]
                for ddr in [-1, 0, 1]:
                    for ddc in [-1, 0, 1]:
                        if ddr == 0 and ddc == 0:
                            continue
                        nr, nc = cr + ddr, cc + ddc
                        if (0 <= nr < rows and 0 <= nc < cols and
                                (nr, nc) not in trib_visited):
                            nh = hmap[nr, nc] + rng.uniform(-0.003, 0.003)
                            if nh < lowest_h:
                                lowest_h = nh
                                lowest_r, lowest_c = nr, nc
                if lowest_r == cr and lowest_c == cc:
                    break
                cr, cc = lowest_r, lowest_c
                trib_path.append((cr, cc))
                trib_visited.add((cr, cc))
                if (cr, cc) in river_cells or is_water[cr, cc]:
                    break
            if len(trib_path) > 5:
                tributaries.append(trib_path)

    rivers.extend(tributaries)
    return rivers


# =============================================================================
# COAST DISTANCE MAP
# =============================================================================

def compute_coast_distance(hmap, rows=GRID_ROWS, cols=GRID_COLS):
    """BFS-based coast distance for each land cell."""
    is_land = hmap >= WATER_LEVEL
    dist = ndimage.distance_transform_edt(is_land)
    return dist


def detect_ridgelines(hmap, biomes, rows=GRID_ROWS, cols=GRID_COLS):
    """Detect mountain ridgelines as connected chains of high-elevation cells.
    Returns list of ridgeline paths [(r,c), ...] forming continuous ranges."""
    is_mountain = np.zeros((rows, cols), dtype=bool)
    for r in range(rows):
        for c in range(cols):
            if biomes[r, c] in ('mountain', 'snow_peak'):
                is_mountain[r, c] = True

    # Label connected mountain regions
    labeled, num_regions = ndimage.label(is_mountain)

    ridgelines = []
    for region_id in range(1, num_regions + 1):
        region_cells = np.argwhere(labeled == region_id)
        if len(region_cells) < 3:
            continue

        # For each region, find the ridge path by tracing highest cells
        # Start from the highest cell, greedily walk to connected high neighbors
        heights = [(hmap[r, c], r, c) for r, c in region_cells]
        heights.sort(key=lambda x: -x[0])

        visited = set()
        for _, start_r, start_c in heights[:3]:  # try up to 3 starts per region
            if (start_r, start_c) in visited:
                continue
            path = [(start_r, start_c)]
            visited.add((start_r, start_c))

            # Trace in both directions from start
            for direction in [1, -1]:
                cr, cc = start_r, start_c
                for _ in range(200):
                    best_r, best_c, best_h = -1, -1, -1
                    for dr in [-1, 0, 1]:
                        for dc in [-1, 0, 1]:
                            if dr == 0 and dc == 0:
                                continue
                            nr, nc = cr + dr, cc + dc
                            if (0 <= nr < rows and 0 <= nc < cols and
                                    is_mountain[nr, nc] and (nr, nc) not in visited):
                                if hmap[nr, nc] > best_h:
                                    best_h = hmap[nr, nc]
                                    best_r, best_c = nr, nc
                    if best_r < 0:
                        break
                    visited.add((best_r, best_c))
                    if direction == 1:
                        path.append((best_r, best_c))
                    else:
                        path.insert(0, (best_r, best_c))
                    cr, cc = best_r, best_c

            if len(path) >= 3:
                ridgelines.append(path)

    return ridgelines


def generate_lakes(hmap, biomes, rng, rows=GRID_ROWS, cols=GRID_COLS):
    """Generate lakes in basins and valleys between mountains."""
    lakes = []  # list of (center_r, center_c, radius_cells, name)
    is_land = hmap >= WATER_LEVEL

    # Strategy: place lakes in inland areas that are relatively flat
    # No need for strict basin detection — just find good inland spots
    land_cells = []
    for r in range(8, rows - 8):
        for c in range(8, cols - 8):
            if is_land[r, c] and biomes[r, c] not in ('mountain', 'snow_peak', 'desert', 'beach'):
                land_cells.append((r, c))

    rng.shuffle(land_cells)

    for r, c in land_cells[:200]:  # check first 200 shuffled candidates
        if len(lakes) >= 8:
            break

        h = hmap[r, c]
        # Prefer lower-elevation inland areas (valleys between features)
        if h > WATER_LEVEL + 0.15:
            continue

        # Must not be too close to coast (at least 4 cells inland)
        from scipy.ndimage import distance_transform_edt
        if not hasattr(generate_lakes, '_coast_dist'):
            generate_lakes._coast_dist = distance_transform_edt(is_land)
        if generate_lakes._coast_dist[r, c] < 4:
            continue

        # Must not be too close to other lakes
        too_close = False
        for lr, lc, _ in lakes:
            if abs(r - lr) + abs(c - lc) < 20:
                too_close = True
                break
        if too_close:
            continue

        radius = rng.randint(2, 5)
        lakes.append((r, c, radius))

    return lakes


def generate_ruins(hmap, biomes, coast_dist, rng, settlements, rows=GRID_ROWS, cols=GRID_COLS):
    """Place ancient ruins, temples, and landmarks in remote locations."""
    ruins = []
    is_land = hmap >= WATER_LEVEL

    ruin_types = [
        'Ancient Ruins', 'Lost Temple', 'Abandoned Tower', 'Forgotten Shrine',
        'Sunken City', 'Dragon\'s Lair', 'Stone Circle', 'Tomb of Kings',
        'Witch\'s Tower', 'Broken Fortress', 'Elder Stones', 'Dark Spire',
    ]

    # Prefer remote locations far from settlements
    settlement_set = {(r, c) for r, c, _, _ in settlements}

    for _ in range(100):
        if len(ruins) >= 12:
            break
        r = rng.randint(5, rows - 5)
        c = rng.randint(5, cols - 5)
        if not is_land[r, c]:
            continue

        # Must be far from settlements
        too_close = False
        for sr, sc, _, _ in settlements:
            if abs(r - sr) + abs(c - sc) < 15:
                too_close = True
                break
        for rr, rc, _, _ in ruins:
            if abs(r - rr) + abs(c - rc) < 20:
                too_close = True
                break
        if too_close:
            continue

        # Prefer mountains, islands, deep wilderness
        score = 0
        b = biomes[r, c]
        if b in ('mountain', 'snow_peak'):
            score += 3
        if b == 'hills':
            score += 2
        if coast_dist[r, c] > 15:
            score += 1  # remote inland
        if coast_dist[r, c] < 3:
            score += 2  # coastal/island

        if score >= 2:
            name = rng.choice(ruin_types)
            ruins.append((r, c, name, b))

    return ruins


# =============================================================================
# NAME GENERATION
# =============================================================================

class NameGenerator:
    """Procedural fantasy name generator."""

    PREFIXES = [
        'Ae', 'Al', 'Ar', 'Ash', 'Bal', 'Bel', 'Bri', 'Cal', 'Cor', 'Crim',
        'Dal', 'Dark', 'Dor', 'Dra', 'Dun', 'El', 'Em', 'Eri', 'Ever', 'Fae',
        'Fen', 'Gal', 'Gil', 'Gol', 'Grey', 'Hal', 'High', 'Hol', 'Iron',
        'Ith', 'Kal', 'Kar', 'Keld', 'Kor', 'Lar', 'Lil', 'Lor', 'Lun',
        'Mal', 'Mar', 'Mer', 'Mid', 'Mir', 'Moon', 'Mor', 'Myr', 'Nar',
        'Neth', 'Nor', 'Old', 'Pal', 'Rae', 'Rav', 'Red', 'Ril', 'Ros',
        'Sar', 'Sel', 'Shal', 'Sil', 'Sol', 'Star', 'Ster', 'Storm',
        'Sul', 'Sun', 'Tal', 'Ther', 'Thorn', 'Tor', 'Ul', 'Val', 'Var',
        'Vel', 'Ven', 'Vol', 'War', 'West', 'White', 'Wild', 'Wind', 'Wyr',
        'Xan', 'Zan', 'Zar', 'Zeph',
    ]

    SUFFIXES_WORLD = [
        'moor', 'vale', 'reach', 'heim', 'gard', 'land', 'fall', 'hold',
        'keep', 'mere', 'shire', 'dale', 'forge', 'haven', 'mark', 'watch',
        'wood', 'gate', 'crest', 'throne', 'spire', 'light', 'shadow',
    ]

    SUFFIXES_PLACE = [
        'ton', 'burg', 'ford', 'dale', 'wick', 'haven', 'hold', 'fell',
        'moor', 'mere', 'gate', 'keep', 'bridge', 'port', 'mouth', 'cliff',
        'crest', 'holm', 'stead', 'wood', 'vale', 'well', 'field', 'cross',
        'watch', 'grove', 'shore', 'marsh', 'stone', 'tower', 'helm',
    ]

    SUFFIXES_KINGDOM = [
        'oria', 'aria', 'andia', 'heim', 'gard', 'mark', 'land', 'reach',
        'vale', 'hold', 'realm', 'dor', 'wen', 'thas', 'nar', 'mir',
    ]

    REGION_TYPES = [
        'The {} Wastes', 'The {} Wilds', 'The {} Expanse', 'The {} Reach',
        'The {} Barrens', '{} Heights', 'The {} Coast', '{} Shores',
        'The {} Marshes', 'The {} Highlands', 'The {} Lowlands',
    ]

    def __init__(self, rng):
        self.rng = rng
        self._used = set()

    def _unique(self, generator_fn):
        for _ in range(100):
            name = generator_fn()
            if name not in self._used:
                self._used.add(name)
                return name
        return generator_fn()

    def world_name(self):
        return self._unique(
            lambda: self.rng.choice(self.PREFIXES) +
                    self.rng.choice(self.SUFFIXES_WORLD)
        )

    def place_name(self):
        return self._unique(
            lambda: self.rng.choice(self.PREFIXES) +
                    self.rng.choice(self.SUFFIXES_PLACE)
        )

    def kingdom_name(self):
        return self._unique(
            lambda: self.rng.choice(self.PREFIXES) +
                    self.rng.choice(self.SUFFIXES_KINGDOM)
        )

    def region_name(self):
        prefix = self.rng.choice(self.PREFIXES)
        template = self.rng.choice(self.REGION_TYPES)
        return self._unique(lambda: template.format(prefix))

    def ocean_name(self):
        templates = [
            'The {} Sea', 'The {} Ocean', '{} Waters', 'Sea of {}',
            'The {} Deep', '{} Gulf',
        ]
        prefix = self.rng.choice(self.PREFIXES)
        template = self.rng.choice(templates)
        return self._unique(lambda: template.format(prefix))


# =============================================================================
# SETTLEMENT & CIVILIZATION PLACEMENT
# =============================================================================

def place_settlements(hmap, biomes, coast_dist, rivers, rng, namer,
                      rows=GRID_ROWS, cols=GRID_COLS):
    """Place settlements logically based on terrain suitability."""
    # Score each land cell for settlement desirability
    scores = np.zeros((rows, cols), dtype=np.float64)
    is_land = hmap >= WATER_LEVEL

    # Build river presence map
    river_cells = set()
    for path in rivers:
        for r, c in path:
            river_cells.add((r, c))
            for dr in [-1, 0, 1]:
                for dc in [-1, 0, 1]:
                    river_cells.add((r + dr, c + dc))

    for r in range(rows):
        for c in range(cols):
            if not is_land[r, c]:
                continue
            b = biomes[r, c]
            if b in ('mountain', 'snow_peak', 'deep_ocean', 'ocean'):
                continue

            score = 0.0
            # Flat, fertile land is best
            if b in ('grassland', 'plains', 'forest'):
                score += 0.4
            elif b == 'hills':
                score += 0.2
            elif b == 'beach':
                score += 0.3

            # Near coast is good (trade)
            cd = coast_dist[r, c]
            if 2 < cd < 12:
                score += 0.3
            elif cd <= 2:
                score += 0.4  # coastal settlement

            # Near river is excellent
            if (r, c) in river_cells:
                score += 0.35

            # Slight noise for variety
            score += rng.uniform(-0.1, 0.1)
            scores[r, c] = max(0, score)

    # Place settlements by score, enforcing minimum distances
    settlements = []  # (r, c, type, name)

    # Types and their counts/min distances
    types = [
        ('capital', 3, 50),   # 3 capitals, min 50 cells apart
        ('city', 8, 30),
        ('town', 18, 18),
        ('village', 35, 10),
    ]

    occupied = set()

    def too_close(r, c, min_dist):
        for sr, sc, _, _ in settlements:
            if abs(r - sr) + abs(c - sc) < min_dist:
                return True
        return False

    for stype, count, min_dist in types:
        # Get candidate cells sorted by score
        candidates = []
        for r in range(3, rows - 3):
            for c in range(3, cols - 3):
                if scores[r, c] > 0.3 and (r, c) not in occupied:
                    candidates.append((scores[r, c], r, c))
        candidates.sort(key=lambda x: -x[0])

        placed = 0
        for _, r, c in candidates:
            if placed >= count:
                break
            if too_close(r, c, min_dist):
                continue
            name = namer.place_name()
            settlements.append((r, c, stype, name))
            occupied.add((r, c))
            placed += 1

    return settlements


# =============================================================================
# ROAD NETWORK — A* PATHFINDING
# =============================================================================

def generate_roads(hmap, settlements, biomes, rows=GRID_ROWS, cols=GRID_COLS):
    """Generate roads connecting settlements via A* pathfinding."""
    import heapq

    roads = []  # list of [(r,c), ...] paths
    is_land = hmap >= WATER_LEVEL

    def path_cost(r, c, nr, nc):
        if not is_land[nr, nc]:
            return 999  # avoid water
        h_diff = abs(hmap[nr, nc] - hmap[r, c])
        base = 1.0
        b = biomes[nr, nc]
        if b == 'mountain':
            base = 5.0
        elif b == 'dense_forest':
            base = 2.5
        elif b == 'forest':
            base = 1.8
        elif b == 'hills':
            base = 1.5
        elif b == 'desert':
            base = 2.0
        return base + h_diff * 10

    def astar(sr, sc, er, ec):
        if sr == er and sc == ec:
            return []
        heap = [(0, sr, sc)]
        came_from = {}
        g_score = {(sr, sc): 0}
        visited = set()

        while heap:
            f, r, c = heapq.heappop(heap)
            if (r, c) in visited:
                continue
            visited.add((r, c))
            if r == er and c == ec:
                path = []
                while (r, c) != (sr, sc):
                    path.append((r, c))
                    r, c = came_from[(r, c)]
                path.append((sr, sc))
                path.reverse()
                return path

            for dr in [-1, 0, 1]:
                for dc in [-1, 0, 1]:
                    if dr == 0 and dc == 0:
                        continue
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < rows and 0 <= nc < cols:
                        cost = path_cost(r, c, nr, nc)
                        diag = 1.414 if (dr != 0 and dc != 0) else 1.0
                        new_g = g_score[(r, c)] + cost * diag
                        if (nr, nc) not in g_score or new_g < g_score[(nr, nc)]:
                            g_score[(nr, nc)] = new_g
                            h = math.sqrt((nr - er)**2 + (nc - ec)**2)
                            heapq.heappush(heap, (new_g + h, nr, nc))
                            came_from[(nr, nc)] = (r, c)

        return []  # no path found

    # Connect capitals to each other, cities to nearest capital, towns to nearest city
    capitals = [(r, c) for r, c, t, _ in settlements if t == 'capital']
    cities = [(r, c) for r, c, t, _ in settlements if t == 'city']
    towns = [(r, c) for r, c, t, _ in settlements if t == 'town']

    # Capital-capital connections (all pairs within range)
    for i in range(len(capitals)):
        for j in range(i + 1, len(capitals)):
            r1, c1 = capitals[i]
            r2, c2 = capitals[j]
            dist = math.sqrt((r1 - r2)**2 + (c1 - c2)**2)
            if dist < 150:
                path = astar(r1, c1, r2, c2)
                if path:
                    roads.append(('major', path))

    # Cities to nearest 2 capitals/cities
    for cr, cc in cities:
        dists = []
        for kr, kc in capitals:
            d = math.sqrt((cr - kr)**2 + (cc - kc)**2)
            dists.append((d, kr, kc))
        dists.sort()
        for d, kr, kc in dists[:2]:
            if d < 100:
                path = astar(cr, cc, kr, kc)
                if path:
                    roads.append(('road', path))

    # Cities to nearest other city
    for i in range(len(cities)):
        best_dist = 9999
        best_j = -1
        for j in range(len(cities)):
            if i == j:
                continue
            d = math.sqrt((cities[i][0] - cities[j][0])**2 + (cities[i][1] - cities[j][1])**2)
            if d < best_dist:
                best_dist = d
                best_j = j
        if best_j >= 0 and best_dist < 70:
            path = astar(cities[i][0], cities[i][1], cities[best_j][0], cities[best_j][1])
            if path:
                roads.append(('road', path))

    # Towns to nearest city or capital
    all_major = capitals + cities
    for tr, tc in towns:
        best_dist = 9999
        best_target = None
        for mr, mc in all_major:
            d = math.sqrt((tr - mr)**2 + (tc - mc)**2)
            if d < best_dist:
                best_dist = d
                best_target = (mr, mc)
        if best_target and best_dist < 60:
            path = astar(tr, tc, best_target[0], best_target[1])
            if path:
                roads.append(('trail', path))

    return roads


# =============================================================================
# KINGDOM ASSIGNMENT
# =============================================================================

def assign_kingdoms(hmap, settlements, rng, namer, rows=GRID_ROWS, cols=GRID_COLS):
    """Assign land cells to kingdoms based on capital proximity."""
    capitals = [(r, c, name) for r, c, t, name in settlements if t == 'capital']
    if not capitals:
        return {}, []

    kingdoms = []
    kingdom_map = np.full((rows, cols), -1, dtype=np.int32)
    is_land = hmap >= WATER_LEVEL

    colors = [
        (139, 58, 26), (58, 90, 139), (26, 120, 58), (139, 120, 26),
        (100, 58, 139), (139, 26, 80), (26, 139, 120),
    ]

    for i, (kr, kc, cap_name) in enumerate(capitals):
        k_name = namer.kingdom_name()
        kingdoms.append({
            'name': k_name,
            'capital': cap_name,
            'r': kr, 'c': kc,
            'color': colors[i % len(colors)],
        })

    # BFS from each capital simultaneously
    queue = deque()
    for i, (kr, kc, _) in enumerate(capitals):
        kingdom_map[kr, kc] = i
        queue.append((kr, kc, i))

    while queue:
        r, c, ki = queue.popleft()
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                if dr == 0 and dc == 0:
                    continue
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols:
                    if kingdom_map[nr, nc] == -1 and is_land[nr, nc]:
                        kingdom_map[nr, nc] = ki
                        queue.append((nr, nc, ki))

    return kingdom_map, kingdoms


# =============================================================================
# RENDERING ENGINE — PARCHMENT STYLE
# =============================================================================

class MapRenderer:
    """Renders the world map in antique parchment cartographic style."""

    def __init__(self, width=MAP_W, height=MAP_H):
        self.W = width
        self.H = height
        self.img = Image.new('RGBA', (width, height), (200, 180, 130, 255))
        self.draw = ImageDraw.Draw(self.img)

        # Load fonts
        try:
            self.font_title = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', 52)
            self.font_subtitle = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', 20)
            self.font_capital = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', 20)
            self.font_city = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', 16)
            self.font_town = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', 14)
            self.font_village = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', 11)
            self.font_kingdom = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', 32)
            self.font_legend = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', 13)
            self.font_legend_title = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', 16)
            self.font_ocean = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', 24)
        except Exception:
            self.font_title = ImageFont.load_default()
            self.font_subtitle = self.font_title
            self.font_capital = self.font_title
            self.font_city = self.font_title
            self.font_town = self.font_title
            self.font_village = self.font_title
            self.font_kingdom = self.font_title
            self.font_legend = self.font_title
            self.font_legend_title = self.font_title
            self.font_ocean = self.font_title

        # Colors
        self.parchment_base = (196, 168, 90)
        self.parchment_dark = (170, 145, 75)
        self.ink_color = (26, 16, 5)
        self.ink_light = (60, 45, 20)
        self.water_color = (165, 148, 100)
        self.water_deep = (140, 125, 85)
        self.accent_color = (139, 58, 26)

    def cell_to_screen(self, col, row):
        """Convert grid cell to screen coordinates."""
        x = MARGIN + col * (self.W - 2 * MARGIN) / GRID_COLS
        y = MARGIN + row * (self.H - 2 * MARGIN) / GRID_ROWS
        return x, y

    def render_parchment(self, rng):
        """Draw base parchment texture using numpy for speed."""
        pixels = np.array(self.img, dtype=np.float64)

        # Generate noise fields using numpy for speed
        ys, xs = np.mgrid[0:self.H, 0:self.W]
        nxs = xs / self.W
        nys = ys / self.H

        # Use vectorized random for paper grain
        grain = rng._np_rng.normal(0, 8, (self.H, self.W))
        grain = ndimage.gaussian_filter(grain, sigma=2)

        # Age stains — large blotches
        stain_x = np.sin(nxs * 3.7 + nys * 2.3) * np.cos(nxs * 1.8 - nys * 4.1)
        stain = (stain_x * 12).clip(-15, 15)

        # Vignette
        dx = (nxs - 0.5) * 2
        dy = (nys - 0.5) * 2
        vignette = np.clip(1.0 - (dx * dx + dy * dy) * 0.15, 0.7, 1.0)

        # Base parchment colors — warm golden tone (matching C# reference)
        pixels[:, :, 0] = np.clip((200 + grain + stain) * vignette, 0, 255)
        pixels[:, :, 1] = np.clip((176 + grain * 0.85 + stain * 0.8) * vignette, 0, 255)
        pixels[:, :, 2] = np.clip((95 + grain * 0.55 + stain * 0.4) * vignette, 0, 255)
        pixels[:, :, 3] = 255

        self.img = Image.fromarray(pixels.astype(np.uint8))
        self.draw = ImageDraw.Draw(self.img)

    def render_water(self, hmap, rng):
        """Render ocean as slightly darker/cooler parchment tone."""
        pixels = np.array(self.img, dtype=np.float64)

        # Upscale heightmap to pixel resolution
        hmap_px = ndimage.zoom(hmap, (
            (self.H - 2 * MARGIN) / GRID_ROWS,
            (self.W - 2 * MARGIN) / GRID_COLS
        ), order=1)

        # Clip to map area and smooth water mask for anti-aliased coastlines
        mh, mw = hmap_px.shape
        # Smooth the heightmap for softer coastline transitions
        hmap_smooth = ndimage.gaussian_filter(hmap_px, sigma=3.0)
        water_mask = hmap_smooth < WATER_LEVEL
        # Create a blended transition zone
        transition = np.clip((WATER_LEVEL - hmap_smooth) / 0.02, 0, 1)  # smooth 0-1 at coastline

        # Apply water darkening using numpy vectorization (fast)
        max_py = min(mh, self.H - 2 * MARGIN)
        max_px = min(mw, self.W - 2 * MARGIN)

        # Use transition for smooth blending at coastlines
        for py in range(max_py):
            sy = py + MARGIN
            if sy >= self.H:
                continue
            for px in range(max_px):
                sx = px + MARGIN
                if sx >= self.W:
                    continue
                t = transition[py, px]
                if t <= 0:
                    continue

                depth = (WATER_LEVEL - hmap_smooth[py, px]) / WATER_LEVEL
                depth = max(0, min(1.0, depth))

                # Darken ocean — noticeable but still warm parchment
                darken = 1.0 - t * (0.15 + depth * 0.15)  # more contrast
                pixels[sy, sx, 0] *= darken
                pixels[sy, sx, 1] *= darken
                pixels[sy, sx, 2] *= darken

        self.img = Image.fromarray(np.clip(pixels, 0, 255).astype(np.uint8))
        self.draw = ImageDraw.Draw(self.img)

    def render_coastal_glow(self, coast_dist, hmap):
        """Render warm glow around coastlines."""
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        draw_ov = ImageDraw.Draw(overlay)

        for r in range(GRID_ROWS):
            for c in range(GRID_COLS):
                if hmap[r, c] < WATER_LEVEL:
                    continue
                cd = coast_dist[r, c]
                if cd > 0 and cd < 3:
                    x, y = self.cell_to_screen(c, r)
                    radius = int(25 - cd * 6)
                    alpha = int(25 * (1 - cd / 3))
                    draw_ov.ellipse(
                        [x - radius, y - radius, x + radius, y + radius],
                        fill=(216, 192, 128, alpha)
                    )

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def render_coastlines(self, hmap, rng):
        """Render smooth coastline outlines with hachures using pixel-level contours."""
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)
        ink = (26, 16, 5)

        map_w = self.W - 2 * MARGIN
        map_h = self.H - 2 * MARGIN

        # Upscale heightmap to pixel resolution and smooth for organic coastlines
        hmap_px = ndimage.zoom(hmap, (map_h / GRID_ROWS, map_w / GRID_COLS), order=1)
        hmap_smooth = ndimage.gaussian_filter(hmap_px, sigma=4.0)

        # Extract coastline boundary at pixel level
        land_mask = hmap_smooth >= WATER_LEVEL
        # Dilate then XOR to get 1-pixel boundary
        dilated = ndimage.binary_dilation(land_mask, iterations=1)
        eroded = ndimage.binary_erosion(land_mask, iterations=1)
        coast_border = dilated & ~eroded  # coastal zone

        # Draw smooth coastline — thick ink dots along border pixels
        # Subsample to avoid drawing every single pixel (too dense)
        coast_pixels = []
        step = 2  # every 2nd pixel
        for py in range(0, min(land_mask.shape[0], map_h), step):
            for px in range(0, min(land_mask.shape[1], map_w), step):
                if coast_border[py, px]:
                    sx = px + MARGIN
                    sy = py + MARGIN
                    coast_pixels.append((sx, sy, px, py))

        # Draw main coastline — bold connected outline
        for sx, sy, px, py in coast_pixels:
            ov_draw.ellipse([sx - 1, sy - 1, sx + 2, sy + 2],
                             fill=ink + (210,))

        # Compute water direction for hachures using gradient
        # Gradient of heightmap points from water → land (uphill)
        gy_field, gx_field = np.gradient(hmap_smooth)

        # Draw hachure marks pointing seaward
        for sx, sy, px, py in coast_pixels:
            h = _hash2d(sx * 7, sy * 11, rng.seed)
            if h < 0.4:
                continue  # skip some for variation

            # Water direction = negative gradient (downhill toward water)
            if 0 <= py < gy_field.shape[0] and 0 <= px < gx_field.shape[1]:
                wx = -gx_field[py, px]
                wy = -gy_field[py, px]
                length = math.sqrt(wx * wx + wy * wy)
                if length > 0.001:
                    wx /= length
                    wy /= length
                    hlen = 4 + h * 7
                    hsx = int(sx + wx * 2)
                    hsy = int(sy + wy * 2)
                    hex_ = int(hsx + wx * hlen)
                    hey = int(hsy + wy * hlen)
                    alpha = int(80 + h * 70)
                    ov_draw.line([(hsx, hsy), (hex_, hey)],
                                  fill=ink + (alpha,), width=1)

        # Parallel shore lines (wave effect)
        for offset in [6, 12, 19]:
            for sx, sy, px, py in coast_pixels:
                h = _hash2d(sx * 5 + offset * 3, sy * 9, rng.seed + offset)
                if h > 0.45:
                    continue
                if 0 <= py < gy_field.shape[0] and 0 <= px < gx_field.shape[1]:
                    wx = -gx_field[py, px]
                    wy = -gy_field[py, px]
                    ln = math.sqrt(wx * wx + wy * wy)
                    if ln > 0.001:
                        wx /= ln
                        wy /= ln
                        osx = int(sx + wx * offset)
                        osy = int(sy + wy * offset)
                        # Perpendicular dash
                        perp_x = -wy
                        perp_y = wx
                        dl = 2 + h * 3
                        alpha = max(15, int(60 - offset * 2))
                        ov_draw.line([
                            (int(osx - perp_x * dl), int(osy - perp_y * dl)),
                            (int(osx + perp_x * dl), int(osy + perp_y * dl))
                        ], fill=ink + (alpha,), width=1)

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def _draw_peak(self, ov_draw, x, y, height, is_snow, h_val, ink):
        """Draw a single mountain peak — large, prominent triangles matching C# reference."""
        # Very large peaks matching C# reference: base 24-52px wide, 45-85px tall
        pw = int(24 + h_val * 18 + height * 16)
        ph = int(45 + h_val * 28 + height * 22)
        if is_snow:
            ph += 10

        jx = int(x + (h_val * 100 % 11 - 5))
        jy = int(y + (h_val * 100 % 7 - 3))

        left = (jx - pw, jy + 3)
        tip = (jx + int((h_val - 0.5) * 4), jy - ph)
        right = (jx + pw, jy + 3)

        # Shadow side (left face) — darker fill for prominence
        ov_draw.polygon([left, tip, (jx, jy + 3)], fill=ink + (90,))
        # Light side (right face) — subtle fill
        ov_draw.polygon([(jx, jy + 3), tip, right], fill=ink + (30,))
        # Strong outline
        ov_draw.line([left, tip, right], fill=ink + (240,), width=2)
        # Base line
        ov_draw.line([left, right], fill=ink + (140,), width=1)
        # Cross-hatch lines on shadow side — more lines for detail
        for i in range(3 + int(height * 3)):
            t = 0.2 + i * 0.15
            if t > 0.9:
                break
            hx1 = int(left[0] + (tip[0] - left[0]) * t)
            hy1 = int(left[1] + (tip[1] - left[1]) * t)
            hx2 = int(jx + (tip[0] - jx) * max(0, t - 0.05))
            hy2 = int(jy + 3 + (tip[1] - jy - 3) * max(0, t - 0.05))
            ov_draw.line([(hx1, hy1), (hx2, hy2)], fill=ink + (100,), width=1)

        if is_snow:
            snow_y = int(jy - ph + ph * 0.25)
            ov_draw.polygon([tip, (jx - int(pw * 0.3), snow_y),
                             (jx + int(pw * 0.25), snow_y)],
                            fill=(230, 225, 210, 220))

    def render_mountains(self, hmap, biomes, ridgelines, rng):
        """Draw mountain ranges as connected chains along ridgelines."""
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)
        ink = (26, 16, 5)

        # Draw mountain peaks along ridgelines — connected ranges
        drawn_positions = set()  # avoid overlapping peaks
        min_spacing = 45  # minimum pixels between peak centers (very large peaks)

        for ridge in ridgelines:
            if len(ridge) < 2:
                continue

            # Sample peaks along the ridge at regular intervals
            accumulated_dist = 0
            last_peak_x, last_peak_y = None, None

            for idx in range(len(ridge)):
                r, c = ridge[idx]
                x, y = self.cell_to_screen(c, r)

                if last_peak_x is not None:
                    dx = x - last_peak_x
                    dy = y - last_peak_y
                    accumulated_dist += math.sqrt(dx * dx + dy * dy)
                    if accumulated_dist < min_spacing:
                        continue

                # Check not too close to existing peaks
                too_close = False
                for px, py in drawn_positions:
                    if abs(x - px) + abs(y - py) < min_spacing:
                        too_close = True
                        break
                if too_close:
                    continue

                h_val = _hash2d(int(x * 7), int(y * 13), rng.seed + 50)
                height_factor = min(1.0, (hmap[r, c] - 0.55) / 0.35) if hmap[r, c] > 0.55 else 0.2
                is_snow = biomes[r, c] == 'snow_peak'

                self._draw_peak(ov_draw, x, y, height_factor, is_snow, h_val, ink)
                drawn_positions.add((x, y))
                last_peak_x, last_peak_y = x, y
                accumulated_dist = 0

            # Draw subtle ridge connection lines between peaks along this ridge
            ridge_screen = [(self.cell_to_screen(c, r)) for r, c in ridge]
            if len(ridge_screen) > 2:
                for i in range(1, len(ridge_screen)):
                    x1, y1 = ridge_screen[i - 1]
                    x2, y2 = ridge_screen[i]
                    h = _hash2d(int(x1 * 3), int(y1 * 5), rng.seed + 60)
                    if h > 0.6:  # subtle broken connection
                        ov_draw.line([(int(x1), int(y1 + 12)),
                                       (int(x2), int(y2 + 12))],
                                      fill=ink + (30,), width=1)

        # Also draw scattered hills from hill biome (not in ridgelines)
        for r in range(0, GRID_ROWS, 6):
            for c in range(0, GRID_COLS, 6):
                if biomes[r, c] != 'hills':
                    continue
                x, y = self.cell_to_screen(c, r)
                # Skip if near a ridge peak
                too_close = False
                for px, py in drawn_positions:
                    if abs(x - px) + abs(y - py) < 25:
                        too_close = True
                        break
                if too_close:
                    continue

                h = _hash2d(int(x * 7), int(y * 13), rng.seed + 55)
                if h < 0.4:
                    continue
                hw = int(6 + h * 5)
                hh = int(3 + h * 3)
                ix, iy = int(x), int(y)
                pts = [
                    (ix - hw, iy + 2),
                    (ix - int(hw * 0.3), iy - int(hh * 0.6)),
                    (ix, iy - hh),
                    (ix + int(hw * 0.3), iy - int(hh * 0.6)),
                    (ix + hw, iy + 2),
                ]
                ov_draw.line(pts, fill=ink + (90,), width=1)

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def render_forests(self, hmap, biomes, coast_dist, rng):
        """Render forest dots — dense near coast, sparse inland. C# reference style."""
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)
        is_land = hmap >= WATER_LEVEL
        ink = (26, 16, 5)

        for r in range(GRID_ROWS):
            for c in range(GRID_COLS):
                if not is_land[r, c]:
                    continue
                b = biomes[r, c]
                if b in ('snow_peak', 'desert', 'beach', 'deep_ocean', 'ocean', 'coast_water'):
                    continue

                x, y = self.cell_to_screen(c, r)
                cd = coast_dist[r, c]

                # Determine dot density — match C# reference's dense stippling
                # near coasts creating almost solid dark bands, sparser inland
                if b == 'dense_forest':
                    num_dots = 10 if cd < 3 else 8 if cd < 6 else 6 if cd < 10 else 4 if cd < 18 else 3
                    dot_alpha = 220 if cd < 3 else 190 if cd < 6 else 160 if cd < 10 else 130
                    dot_r = 2.2 if cd < 4 else 1.9 if cd < 8 else 1.6
                elif b == 'forest':
                    num_dots = 8 if cd < 3 else 6 if cd < 5 else 4 if cd < 10 else 3 if cd < 15 else 2
                    dot_alpha = 200 if cd < 3 else 170 if cd < 6 else 140 if cd < 10 else 100
                    dot_r = 2.0 if cd < 4 else 1.7 if cd < 8 else 1.5
                elif b in ('grassland', 'plains', 'hills'):
                    if cd < 3:
                        num_dots = 6
                        dot_alpha = 170
                        dot_r = 1.8
                    elif cd < 5:
                        num_dots = 4
                        dot_alpha = 140
                        dot_r = 1.6
                    elif cd < 10:
                        num_dots = 3
                        dot_alpha = 90
                        dot_r = 1.3
                    else:
                        h = _hash2d(c, r, rng.seed + 700)
                        num_dots = 1 if h > 0.4 else 0
                        dot_alpha = 50
                        dot_r = 1.1
                elif b == 'mountain':
                    h = _hash2d(c, r, rng.seed + 705)
                    num_dots = 1 if h > 0.55 else 0
                    dot_alpha = 55
                    dot_r = 1.2
                elif b == 'tundra':
                    h = _hash2d(c, r, rng.seed + 710)
                    num_dots = 1 if h > 0.6 else 0
                    dot_alpha = 55
                    dot_r = 1.2
                else:
                    continue

                for i in range(num_dots):
                    jh = _hash2d(c * 17 + i * 31, r * 23 + i * 47, rng.seed + 720)
                    jx = x + (jh - 0.5) * CELL_W * 1.5
                    jy = y + (_hash2d(c * 29 + i * 41, r * 37 + i * 53,
                                      rng.seed + 730) - 0.5) * CELL_H * 1.5
                    rr = dot_r + (jh - 0.5) * 0.6
                    ix, iy = int(jx), int(jy)

                    ov_draw.ellipse(
                        [ix - int(rr), iy - int(rr), ix + int(rr + 0.5), iy + int(rr + 0.5)],
                        fill=ink + (dot_alpha,)
                    )

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def render_rivers(self, rivers, hmap):
        """Render river paths as flowing ink lines."""
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)

        # Sort rivers by length (draw short ones first, long ones on top)
        sorted_rivers = sorted(rivers, key=lambda p: len(p))

        for path in sorted_rivers:
            if len(path) < 5:
                continue
            # Convert to screen coords
            points = []
            for r, c in path:
                x, y = self.cell_to_screen(c, r)
                points.append((int(x), int(y)))

            # Draw river — thin at source, wider at mouth
            n = len(points)
            for i in range(1, n):
                t = i / n
                width = max(1, int(1.5 + t * 4.5))  # up to 6px wide at mouth
                alpha = int(180 + t * 75)
                ov_draw.line([points[i - 1], points[i]],
                              fill=(26, 16, 5, min(255, alpha)), width=width)

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def render_roads(self, roads):
        """Render road network with dashed lines."""
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)
        ink = (26, 16, 5)

        for road_type, path in roads:
            if len(path) < 2:
                continue
            points = []
            for r, c in path:
                x, y = self.cell_to_screen(c, r)
                points.append((int(x), int(y)))

            if road_type == 'major':
                dash_len, gap_len = 8, 3
                width = 2
                alpha = 160
            elif road_type == 'road':
                dash_len, gap_len = 6, 4
                width = 2
                alpha = 130
            else:
                dash_len, gap_len = 4, 5
                width = 1
                alpha = 90

            total_dist = 0
            for i in range(1, len(points)):
                dx = points[i][0] - points[i - 1][0]
                dy = points[i][1] - points[i - 1][1]
                seg_len = math.sqrt(dx * dx + dy * dy)
                if seg_len < 0.5:
                    continue
                cycle = dash_len + gap_len
                pos_in_cycle = total_dist % cycle
                if pos_in_cycle < dash_len:
                    ov_draw.line([points[i - 1], points[i]],
                                  fill=ink + (alpha,), width=width)
                total_dist += seg_len

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def render_lakes(self, lakes, hmap, rng):
        """Render lakes as natural-looking water bodies matching ocean water color."""
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)
        ink = (26, 16, 5)

        for center_r, center_c, radius in lakes:
            cx, cy = self.cell_to_screen(center_c, center_r)
            cx, cy = int(cx), int(cy)
            rpx = int(radius * CELL_W * 1.2)
            rpy = int(radius * CELL_H * 1.0)
            if rpx < 8:
                rpx = 8
            if rpy < 8:
                rpy = 8

            # Draw organic shape with wobble points
            num_pts = 16
            points = []
            for i in range(num_pts):
                angle = 2 * math.pi * i / num_pts
                h = _hash2d(int(cx + i * 7), int(cy + i * 13), rng.seed + 800)
                wobble = 0.7 + h * 0.6  # 70%-130% of radius
                px = cx + int(rpx * wobble * math.cos(angle))
                py = cy + int(rpy * wobble * math.sin(angle))
                points.append((px, py))

            # Fill with water color — match darkened parchment tone of ocean
            lake_color = (160, 140, 100, 160)
            ov_draw.polygon(points, fill=lake_color)

            # Shore outline
            ov_draw.polygon(points, outline=ink + (140,), width=1)

            # Stipple hachure marks around shore
            for i in range(len(points)):
                px, py = points[i]
                dx = px - cx
                dy = py - cy
                d = math.sqrt(dx * dx + dy * dy) + 0.1
                # Short outward hachures
                for j in range(2):
                    hh = _hash2d(int(px + j * 11), int(py + j * 17), rng.seed + 810)
                    if hh < 0.5:
                        continue
                    ex = px + int(dx / d * (3 + hh * 4))
                    ey = py + int(dy / d * (3 + hh * 4))
                    ov_draw.line([(px, py), (ex, ey)], fill=ink + (80,), width=1)

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def render_ruins(self, ruins, rng):
        """Render ruin/landmark icons and labels on the map."""
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)
        ink = (26, 16, 5)

        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", 11)
        except IOError:
            font = ImageFont.load_default()

        parch = (215, 200, 160)

        for r, c, name, biome in ruins:
            x, y = self.cell_to_screen(c, r)
            ix, iy = int(x), int(y)

            # Draw ruin icon — small broken square
            sz = 5
            ov_draw.rectangle([ix - sz, iy - sz, ix + sz, iy + sz],
                              outline=ink + (160,), width=1)
            # Broken corners
            ov_draw.line([(ix - sz, iy - sz), (ix - sz - 2, iy - sz - 2)],
                         fill=ink + (120,), width=1)
            ov_draw.line([(ix + sz, iy - sz), (ix + sz + 2, iy - sz - 2)],
                         fill=ink + (120,), width=1)
            # Cross inside
            ov_draw.line([(ix - 2, iy - 2), (ix + 2, iy + 2)],
                         fill=ink + (100,), width=1)
            ov_draw.line([(ix + 2, iy - 2), (ix - 2, iy + 2)],
                         fill=ink + (100,), width=1)

            # Label
            bbox = font.getbbox(name)
            tw = bbox[2] - bbox[0]
            lx = ix - tw // 2
            ly = iy + sz + 3

            # Halo
            for dx in [-1, 0, 1]:
                for dy in [-1, 0, 1]:
                    ov_draw.text((lx + dx, ly + dy), name, font=font,
                                fill=parch + (200,))
            ov_draw.text((lx, ly), name, font=font, fill=ink + (150,))

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def render_settlements(self, settlements, rng):
        """Render settlement icons and labels."""
        # Draw on an overlay for proper alpha compositing
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)

        for r, c, stype, name in settlements:
            x, y = self.cell_to_screen(c, r)
            ix, iy = int(x), int(y)

            if stype == 'capital':
                s = 6
                ov_draw.rectangle([ix - s, iy - s, ix + s, iy + s],
                                   outline=(26, 16, 5, 240), width=2)
                ov_draw.rectangle([ix - s - 2, iy - s - 2, ix + s + 2, iy + s + 2],
                                   outline=(26, 16, 5, 180), width=1)
                font = self.font_capital
                label_offset = s + 8
            elif stype == 'city':
                s = 4
                ov_draw.rectangle([ix - s, iy - s, ix + s, iy + s],
                                   outline=(26, 16, 5, 220), width=1,
                                   fill=(196, 168, 90, 220))
                font = self.font_city
                label_offset = s + 6
            elif stype == 'town':
                s = 3
                ov_draw.ellipse([ix - s, iy - s, ix + s, iy + s],
                                 fill=(26, 16, 5, 180))
                font = self.font_town
                label_offset = s + 5
            else:  # village
                s = 2
                ov_draw.ellipse([ix - s, iy - s, ix + s, iy + s],
                                 fill=(26, 16, 5, 140))
                font = self.font_village
                label_offset = s + 4

            # Label with parchment halo for readability
            bbox = font.getbbox(name)
            tw = bbox[2] - bbox[0]
            lx = int(x - tw / 2)
            ly = iy + label_offset

            # Thick halo
            halo = (196, 168, 90, 230)
            for dx in range(-4, 5):
                for dy in range(-3, 4):
                    if dx * dx + dy * dy <= 20:
                        ov_draw.text((lx + dx, ly + dy), name,
                                      fill=halo, font=font)
            # Text
            ink = (26, 16, 5, 230)
            ov_draw.text((lx, ly), name, fill=ink, font=font)

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def render_kingdom_labels(self, kingdoms, hmap):
        """Render large kingdom names across their territories."""
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)

        for kingdom in kingdoms:
            x, y = self.cell_to_screen(kingdom['c'], kingdom['r'])
            name = kingdom['name'].upper()

            bbox = self.font_kingdom.getbbox(name)
            tw = bbox[2] - bbox[0]
            lx = int(x - tw / 2)
            ly = int(y - 40)

            # Thick halo
            halo = (196, 168, 90, 200)
            for dx in range(-5, 6):
                for dy in range(-4, 5):
                    if dx * dx + dy * dy <= 30:
                        ov_draw.text((lx + dx, ly + dy), name,
                                      fill=halo, font=self.font_kingdom)
            ov_draw.text((lx, ly), name,
                          fill=(26, 16, 5, 160), font=self.font_kingdom)

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def render_ocean_labels(self, hmap, rng, namer):
        """Render ocean/sea name labels in large water areas."""
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)

        is_water = hmap < WATER_LEVEL
        # Find large connected water regions
        labeled, num_features = ndimage.label(is_water)

        for i in range(1, min(num_features + 1, 8)):  # label up to 7 oceans
            region = labeled == i
            area = region.sum()
            if area < 200:  # skip tiny puddles
                continue

            # Find centroid
            ys, xs = np.where(region)
            cx = int(xs.mean())
            cy = int(ys.mean())

            # Convert to screen coords
            sx, sy = self.cell_to_screen(cx, cy)

            name = namer.ocean_name()

            bbox = self.font_ocean.getbbox(name)
            tw = bbox[2] - bbox[0]
            lx = int(sx - tw / 2)
            ly = int(sy - 8)

            # Draw with slight transparency (italic feel)
            ov_draw.text((lx, ly), name,
                          fill=(26, 16, 5, 80), font=self.font_ocean)

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def render_title_banner(self, world_name, subtitle="A World of Ancient Realms"):
        """Render decorative title banner at top with scrollwork."""
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)
        ink = self.ink_color

        # Measure title to size banner
        bbox = self.font_title.getbbox(world_name)
        tw = bbox[2] - bbox[0]
        bw = max(500, tw + 80)
        bh = 80
        bx = self.W // 2 - bw // 2
        by = 6

        # Banner background with slight taper
        banner_fill = (210, 190, 140, 240)
        ov_draw.rectangle([bx, by, bx + bw, by + bh], fill=banner_fill)
        # Double border
        ov_draw.rectangle([bx, by, bx + bw, by + bh],
                          outline=ink + (200,), width=2)
        ov_draw.rectangle([bx + 4, by + 4, bx + bw - 4, by + bh - 4],
                          outline=ink + (120,), width=1)

        # Decorative horizontal lines extending from banner
        for side in [-1, 1]:
            sx = bx + (bw if side == 1 else 0)
            ex = sx + side * 30
            mid_y = by + bh // 2
            ov_draw.line([(sx, mid_y - 8), (ex, mid_y - 8)], fill=ink + (100,), width=1)
            ov_draw.line([(sx, mid_y), (ex, mid_y)], fill=ink + (130,), width=1)
            ov_draw.line([(sx, mid_y + 8), (ex, mid_y + 8)], fill=ink + (100,), width=1)

        # Corner decorations
        corner_sz = 8
        for cx, cy in [(bx + 6, by + 6), (bx + bw - 6, by + 6),
                        (bx + 6, by + bh - 6), (bx + bw - 6, by + bh - 6)]:
            ov_draw.line([(cx - corner_sz, cy), (cx + corner_sz, cy)],
                         fill=ink + (140,), width=1)
            ov_draw.line([(cx, cy - corner_sz), (cx, cy + corner_sz)],
                         fill=ink + (140,), width=1)

        # Title text
        tx = self.W // 2 - tw // 2
        ty = by + 8
        # Halo for readability
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                ov_draw.text((tx + dx, ty + dy), world_name,
                             fill=banner_fill, font=self.font_title)
        ov_draw.text((tx, ty), world_name,
                     fill=ink + (240,), font=self.font_title)

        # Subtitle
        sub_text = "Here be Dragons & Ancient Realms"
        bbox2 = self.font_subtitle.getbbox(sub_text)
        sw = bbox2[2] - bbox2[0]
        sx = self.W // 2 - sw // 2
        sy = by + bh - 26
        ov_draw.text((sx, sy), sub_text,
                     fill=ink + (150,), font=self.font_subtitle)

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def render_compass(self, rng):
        """Render ornate compass rose in bottom-left."""
        cx = MARGIN + 60
        cy = self.H - MARGIN - 65
        radius = 48

        # Outer circle
        self.draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
                          outline=self.ink_color + (150,), width=2)
        self.draw.ellipse([cx - radius + 4, cy - radius + 4,
                           cx + radius - 4, cy + radius - 4],
                          outline=self.ink_color + (100,), width=1)

        # Cardinal directions
        dirs = [
            (0, -1, 'N', 30, True),
            (0, 1, 'S', 22, False),
            (-1, 0, 'W', 22, False),
            (1, 0, 'E', 22, False),
        ]
        for dx, dy, label, length, is_north in dirs:
            # Arrow
            ex = cx + dx * length
            ey = cy + dy * length

            # Draw diamond-shaped pointer
            if is_north:
                # North pointer — filled red-brown
                pts = [(cx, cy), (cx - 4, cy - 8), (ex, ey), (cx + 4, cy - 8)]
                self.draw.polygon(pts, fill=self.accent_color + (200,),
                                  outline=self.ink_color + (200,))
            else:
                self.draw.line([(cx, cy), (ex, ey)],
                               fill=self.ink_color + (160,), width=1)

            # Label
            lx = cx + dx * (length + 10)
            ly = cy + dy * (length + 10)
            font = self.font_legend_title if is_north else self.font_legend
            bbox = font.getbbox(label)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            color = self.accent_color + (220,) if is_north else self.ink_color + (180,)
            self.draw.text((lx - tw / 2, ly - th / 2), label,
                           fill=color, font=font)

    def render_legend(self, rng):
        """Render legend box in bottom-right."""
        lw = 190
        lh = 260
        lx = self.W - MARGIN - lw - 10
        ly = self.H - MARGIN - lh - 10

        # Background
        self.draw.rectangle([lx, ly, lx + lw, ly + lh],
                            fill=(200, 180, 120, 230),
                            outline=self.ink_color + (150,), width=1)
        self.draw.rectangle([lx + 2, ly + 2, lx + lw - 2, ly + lh - 2],
                            outline=self.ink_color + (80,), width=1)

        # Title
        self.draw.text((lx + 10, ly + 6), "Legend",
                       fill=self.ink_color + (200,), font=self.font_legend_title)

        # Entries
        entries = [
            ('Capital', 'square_double'),
            ('City', 'square'),
            ('Town', 'circle'),
            ('Village', 'dot'),
            ('Mountain', 'triangle'),
            ('Forest', 'dots'),
            ('River', 'line'),
            ('Road', 'dashed'),
        ]

        yoff = ly + 30
        for label, symbol in entries:
            ix = lx + 18
            iy = yoff + 7

            if symbol == 'square_double':
                self.draw.rectangle([ix - 4, iy - 4, ix + 4, iy + 4],
                                    outline=self.ink_color + (200,), width=1)
                self.draw.rectangle([ix - 6, iy - 6, ix + 6, iy + 6],
                                    outline=self.ink_color + (150,), width=1)
            elif symbol == 'square':
                self.draw.rectangle([ix - 4, iy - 4, ix + 4, iy + 4],
                                    outline=self.ink_color + (180,), width=1)
            elif symbol == 'circle':
                self.draw.ellipse([ix - 3, iy - 3, ix + 3, iy + 3],
                                  fill=self.ink_color + (150,))
            elif symbol == 'dot':
                self.draw.ellipse([ix - 2, iy - 2, ix + 2, iy + 2],
                                  fill=self.ink_color + (120,))
            elif symbol == 'triangle':
                self.draw.polygon([(ix, iy - 6), (ix - 5, iy + 3), (ix + 5, iy + 3)],
                                  outline=self.ink_color + (180,), width=1)
            elif symbol == 'dots':
                for di in range(4):
                    dx = ix - 4 + di * 3
                    self.draw.ellipse([dx - 1, iy - 1, dx + 1, iy + 1],
                                      fill=self.ink_color + (130,))
            elif symbol == 'line':
                self.draw.line([(ix - 6, iy), (ix + 6, iy)],
                               fill=self.ink_color + (140,), width=1)
            elif symbol == 'dashed':
                for di in range(3):
                    dx = ix - 6 + di * 5
                    self.draw.line([(dx, iy), (dx + 3, iy)],
                                   fill=self.ink_color + (100,), width=1)

            self.draw.text((lx + 38, yoff), label,
                           fill=self.ink_color + (180,), font=self.font_legend)
            yoff += 27

    def render_border(self):
        """Render ornamental border around the map with corner flourishes."""
        ink = self.ink_color
        # Outer border — thicker
        m = MARGIN - 18
        self.draw.rectangle([m, m, self.W - m, self.H - m],
                            outline=ink + (150,), width=3)
        # Inner border
        m2 = MARGIN - 8
        self.draw.rectangle([m2, m2, self.W - m2, self.H - m2],
                            outline=ink + (100,), width=1)

        # Corner ornaments — crosses with dots
        corner_sz = 15
        for cx, cy in [(m + 8, m + 8), (self.W - m - 8, m + 8),
                        (m + 8, self.H - m - 8), (self.W - m - 8, self.H - m - 8)]:
            # Cross
            self.draw.line([(cx - corner_sz, cy), (cx + corner_sz, cy)],
                           fill=ink + (130,), width=1)
            self.draw.line([(cx, cy - corner_sz), (cx, cy + corner_sz)],
                           fill=ink + (130,), width=1)
            # Diamond
            pts = [(cx, cy - 5), (cx + 5, cy), (cx, cy + 5), (cx - 5, cy)]
            self.draw.polygon(pts, outline=ink + (120,), width=1)
            # Center dot
            self.draw.ellipse([cx - 2, cy - 2, cx + 2, cy + 2],
                              fill=ink + (140,))

        # Midpoint decorations on each edge
        mid_x = self.W // 2
        mid_y = self.H // 2
        for px, py in [(mid_x, m + 4), (mid_x, self.H - m - 4),
                        (m + 4, mid_y), (self.W - m - 4, mid_y)]:
            self.draw.ellipse([px - 3, py - 3, px + 3, py + 3],
                              fill=ink + (110,))
            self.draw.ellipse([px - 6, py - 6, px + 6, py + 6],
                              outline=ink + (80,), width=1)

    def render_scale_bar(self):
        """Render scale bar at bottom center."""
        cx = self.W // 2
        cy = self.H - MARGIN + 5
        bar_w = 120

        # Scale bar segments
        sx = cx - bar_w // 2
        for i in range(6):
            x1 = sx + i * 20
            x2 = x1 + 20
            if i % 2 == 0:
                self.draw.rectangle([x1, cy, x2, cy + 6],
                                    fill=self.ink_color + (180,))
            else:
                self.draw.rectangle([x1, cy, x2, cy + 6],
                                    outline=self.ink_color + (150,), width=1)

        # Labels
        self.draw.text((sx - 2, cy + 10), "0",
                       fill=self.ink_color + (150,), font=self.font_village)
        self.draw.text((sx + bar_w - 8, cy + 10), "100 mi",
                       fill=self.ink_color + (150,), font=self.font_village)


# =============================================================================
# MAIN GENERATION PIPELINE
# =============================================================================

def generate_map(seed=42, output_path=None):
    """Full map generation pipeline."""
    print(f"Generating map with seed {seed}...")

    rng = SeededRNG(seed)
    namer = NameGenerator(rng)
    world_name = namer.world_name()
    print(f"  World: {world_name}")

    # 1. Generate heightmap with tectonic continents
    print("  Generating heightmap...")
    hmap = generate_heightmap(rng)

    # Adaptive water level: ensure 30-60% land coverage
    global WATER_LEVEL
    land_frac = (hmap >= WATER_LEVEL).sum() / hmap.size
    target_min, target_max = 0.32, 0.58
    if land_frac < target_min:
        # Too much water — lower water level
        sorted_h = np.sort(hmap.ravel())
        WATER_LEVEL = sorted_h[int(len(sorted_h) * (1 - target_min - 0.05))]
        print(f"    Adjusted water level to {WATER_LEVEL:.3f} (was too sparse: {land_frac:.1%})")
    elif land_frac > target_max:
        # Too much land — raise water level
        sorted_h = np.sort(hmap.ravel())
        WATER_LEVEL = sorted_h[int(len(sorted_h) * (1 - target_max + 0.05))]
        print(f"    Adjusted water level to {WATER_LEVEL:.3f} (was too dense: {land_frac:.1%})")
    land_frac = (hmap >= WATER_LEVEL).sum() / hmap.size
    print(f"    Land coverage: {land_frac:.1%}")

    # 2. Climate simulation
    print("  Simulating climate...")
    temperature, moisture = generate_climate(hmap, rng)

    # 3. Biome assignment
    print("  Assigning biomes...")
    biomes = assign_biomes(hmap, temperature, moisture)

    # 4. Coast distance
    coast_dist = compute_coast_distance(hmap)

    # 5. Rivers
    print("  Generating rivers...")
    rivers = generate_rivers(hmap, biomes, rng)
    print(f"    {len(rivers)} rivers generated")

    # 6. Ridgelines
    print("  Detecting ridgelines...")
    ridgelines = detect_ridgelines(hmap, biomes)
    print(f"    {len(ridgelines)} ridgelines detected")

    # 7. Lakes
    print("  Generating lakes...")
    lakes = generate_lakes(hmap, biomes, rng)
    print(f"    {len(lakes)} lakes generated")

    # 8. Settlements
    print("  Placing settlements...")
    settlements = place_settlements(hmap, biomes, coast_dist, rivers, rng, namer)
    print(f"    {len(settlements)} settlements placed")

    # 9. Ruins
    print("  Placing ruins and landmarks...")
    ruins = generate_ruins(hmap, biomes, coast_dist, rng, settlements)
    print(f"    {len(ruins)} ruins placed")

    # 10. Roads
    print("  Building road network...")
    roads = generate_roads(hmap, settlements, biomes)
    print(f"    {len(roads)} road segments")

    # 11. Kingdoms
    print("  Assigning kingdoms...")
    kingdom_map, kingdoms = assign_kingdoms(hmap, settlements, rng, namer)
    print(f"    {len(kingdoms)} kingdoms")

    # 9. Render
    print("  Rendering map...")
    renderer = MapRenderer()

    print("    Parchment texture...")
    renderer.render_parchment(rng)

    print("    Water...")
    renderer.render_water(hmap, rng)

    print("    Coastal glow...")
    renderer.render_coastal_glow(coast_dist, hmap)

    print("    Coastlines...")
    renderer.render_coastlines(hmap, rng)

    print("    Forests...")
    renderer.render_forests(hmap, biomes, coast_dist, rng)

    print("    Mountains...")
    renderer.render_mountains(hmap, biomes, ridgelines, rng)

    print("    Lakes...")
    renderer.render_lakes(lakes, hmap, rng)

    print("    Rivers...")
    renderer.render_rivers(rivers, hmap)

    print("    Roads...")
    renderer.render_roads(roads)

    print("    Ruins...")
    renderer.render_ruins(ruins, rng)

    print("    Settlements...")
    renderer.render_settlements(settlements, rng)

    print("    Kingdom labels...")
    renderer.render_kingdom_labels(kingdoms, hmap)

    print("    Ocean labels...")
    renderer.render_ocean_labels(hmap, rng, namer)

    print("    Decorative elements...")
    renderer.render_title_banner(world_name)
    renderer.render_compass(rng)
    renderer.render_legend(rng)
    renderer.render_border()
    renderer.render_scale_bar()

    # Save
    if output_path is None:
        output_path = f'fantasy_map_seed{seed}.png'
    # Convert to RGB for PNG save
    final = renderer.img.convert('RGB')
    final.save(output_path, 'PNG')
    print(f"  Saved to {output_path}")

    return output_path


# =============================================================================
# CLI ENTRY POINT
# =============================================================================

if __name__ == '__main__':
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 42
    out_dir = '/sessions/happy-intelligent-cerf/mnt/peanut/peanut shell'
    output_path = f'{out_dir}/fantasy_map_seed{seed}.png'
    generate_map(seed=seed, output_path=output_path)
