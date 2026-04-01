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

MAP_W = 4800  # 5K output width
MAP_H = 3200  # 5K output height
GRID_COLS = 384  # simulation grid — 12.5px/cell at 5K
GRID_ROWS = 256
CELL_W = MAP_W / GRID_COLS
CELL_H = MAP_H / GRID_ROWS
WATER_LEVEL = 0.48  # higher = more ocean, better multi-continent balance
MARGIN = 75  # border margin pixels

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

                # Medium-scale warp for coastline detail (fjords, peninsulas)
                w3 = fractal_noise(nx * 7.0, ny * 7.0, octaves=2,
                                   seed=warp_seed + 30) - 0.5
                w4 = fractal_noise(nx * 7.0, ny * 7.0, octaves=2,
                                   seed=warp_seed + 40) - 0.5
                dx += w3 * 0.10
                dy += w4 * 0.10

                # Fine-scale warp for micro-bays, inlets, and fractal coastline detail
                w5 = fractal_noise(nx * 15.0, ny * 15.0, octaves=3,
                                   seed=warp_seed + 50) - 0.5
                w6 = fractal_noise(nx * 15.0, ny * 15.0, octaves=3,
                                   seed=warp_seed + 60) - 0.5
                dx += w5 * 0.045
                dy += w6 * 0.045

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

            # Moisture: noise-driven base, with latitude influence
            moist_base = fractal_noise(nx * 6, ny * 6, octaves=4,
                                       persistence=0.50, seed=seed + 400)
            # Second large-scale noise layer creates interior wet/dry bands
            # independent of coast — reproduces continental climate variation
            moist_continental = fractal_noise(nx * 2.5, ny * 2.5, octaves=3,
                                              persistence=0.55, seed=seed + 450) * 0.30
            # Slight latitude influence (wetter near equator)
            lat_moist = 0.65 + 0.35 * (1.0 - abs(ny - 0.5) * 1.5)
            # Elevation-driven orographic rainfall: high land forces precipitation
            elev_moist = max(0.0, (h - WATER_LEVEL) * 0.55) if h > WATER_LEVEL else 0.0
            moisture[r, c] = max(0, min(1, (moist_base + moist_continental) * lat_moist
                                         + elev_moist))

    # Mild coastal moisture boost (reduced from 0.25 → 0.12 so interior isn't starved)
    is_water = hmap < WATER_LEVEL
    if np.any(~is_water):
        coast_dist = ndimage.distance_transform_edt(~is_water)
        coast_dist_norm = np.minimum(coast_dist / 15.0, 1.0)
        moisture += (1.0 - coast_dist_norm) * 0.12 * (hmap >= WATER_LEVEL).astype(float)
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


def assign_biomes(hmap, temperature, moisture, coast_dist=None,
                  rows=GRID_ROWS, cols=GRID_COLS):
    """Assign biomes based on height, temperature, and moisture.
    coast_dist: if provided, used to boost interior forest coverage."""
    biomes = np.empty((rows, cols), dtype='U15')

    for r in range(rows):
        for c in range(cols):
            h = hmap[r, c]
            t = temperature[r, c]
            m = moisture[r, c]
            cd = coast_dist[r, c] if coast_dist is not None else 0

            if h < WATER_LEVEL * 0.6:
                biomes[r, c] = 'deep_ocean'
            elif h < WATER_LEVEL * 0.85:
                biomes[r, c] = 'ocean'
            elif h < WATER_LEVEL:
                biomes[r, c] = 'coast_water'
            elif h < WATER_LEVEL + 0.03:
                biomes[r, c] = 'beach'
            elif h > 0.80:
                biomes[r, c] = 'snow_peak'
            elif h > 0.63:
                biomes[r, c] = 'mountain'
            elif h > 0.52:
                biomes[r, c] = 'hills'
            elif t < 0.2:
                biomes[r, c] = 'tundra'
            elif m < 0.22 and t > 0.58:
                biomes[r, c] = 'desert'  # only true hot desert
            elif m > 0.48:
                biomes[r, c] = 'dense_forest'
            elif m > 0.24:
                biomes[r, c] = 'forest'
            elif m > 0.17:
                biomes[r, c] = 'grassland'
            elif cd > 6 and m > 0.09 and t < 0.82:
                # Interior: moderate moisture anywhere inland becomes forest
                biomes[r, c] = 'forest'
            elif cd > 18 and m > 0.06 and t < 0.85:
                # Deep interior: even fairly dry land gets sparse forest cover
                biomes[r, c] = 'forest'
            else:
                biomes[r, c] = 'plains'

    return biomes


# =============================================================================
# RIVER SYSTEM — FULL HYDROLOGICAL PIPELINE
# =============================================================================
#
# Architecture (in call order):
#
#   _fill_depressions()          — Priority-flood sink removal (Barnes 2014)
#   _build_perturb_map()         — Domain-warp noise for organic meanders
#   _compute_d8_flow()           — Slope-weighted D8 flow direction
#   _compute_flow_accumulation() — Topological-sort catchment accumulation
#   _compute_strahler_orders()   — Hierarchical stream classification
#   _classify_reach()            — Per-river character (torrent/stream/meander…)
#   _add_sinuosity()             — Post-process path to add natural sinuosity
#   _build_braided_section()     — Braid flat high-flow sections
#   generate_rivers()            — Full orchestrator
#
#   _catmull_rom_arc()           — Arc-length–even centripetal CR spline
#   _draw_bank_stipple()         — Perpendicular bank texture dots
#   _draw_rapids_marks()         — Hash marks on steep gradient sections
#   _draw_delta_fan()            — Distributary channels at ocean mouth
#   _draw_river_segment()        — 5-layer per-segment renderer
#   render_rivers()              — Full multi-pass renderer
#
# =============================================================================


# ─── STEP 0: Depression filling ──────────────────────────────────────────────

def _fill_depressions(hmap, rows=GRID_ROWS, cols=GRID_COLS):
    """Remove topographic depressions using the Priority-Flood algorithm.

    Every depression (local minimum surrounded by higher terrain) is filled
    to the lowest of its surrounding pour-points so that flow can always
    continue downhill to the ocean.  Without this step rivers get trapped
    in micro-basins and never reach the coast.

    Uses the variant described in:
        Barnes, R., Lehman, C., Mulla, D. (2014) Priority-flood: An optimal
        depression-filling and watershed-labeling algorithm for digital
        elevation models. Computers & Geosciences, 62, pp.117-127.

    Parameters
    ----------
    hmap : 2-D float64 array  — original elevation (0-1 normalised)

    Returns
    -------
    hmap_filled : 2-D float64 array  — depression-free elevation
    """
    import heapq
    EPS   = 1e-5        # infinitesimal slope away from fill level
    OPEN  = 0           # heap state flags
    CLOSED = 1

    hf    = hmap.copy().astype(np.float64)
    state = np.zeros((rows, cols), dtype=np.int8)

    pq = []   # (elevation, r, c)

    # Seed the priority queue with all ocean-adjacent land cells
    # (the "outlet" cells — guaranteed to be the lowest possible exits)
    is_water = hmap < WATER_LEVEL
    for r in range(rows):
        for c in range(cols):
            if is_water[r, c]:
                state[r, c] = CLOSED
            else:
                # Check for water neighbour
                for dr in [-1, 0, 1]:
                    for dc in [-1, 0, 1]:
                        if dr == 0 and dc == 0:
                            continue
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < rows and 0 <= nc < cols and is_water[nr, nc]:
                            if state[r, c] == OPEN:
                                heapq.heappush(pq, (hf[r, c], r, c))
                                state[r, c] = CLOSED
                            break

    # Process cells in elevation order — lowest exit first
    while pq:
        h, r, c = heapq.heappop(pq)
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                if dr == 0 and dc == 0:
                    continue
                nr, nc = r + dr, c + dc
                if not (0 <= nr < rows and 0 <= nc < cols):
                    continue
                if state[nr, nc] == CLOSED:
                    continue
                if is_water[nr, nc]:
                    state[nr, nc] = CLOSED
                    continue
                # Fill if neighbour is lower than current fill level
                new_h = max(hf[nr, nc], h + EPS)
                hf[nr, nc] = new_h
                state[nr, nc] = CLOSED
                heapq.heappush(pq, (new_h, nr, nc))

    return hf


# ─── STEP 1: Domain-warp perturbation ────────────────────────────────────────

def _build_perturb_map(hmap_filled, rng, rows=GRID_ROWS, cols=GRID_COLS):
    """Add smooth low-frequency warp noise to the filled DEM.

    Two octave layers at different scales produce S-bends and meander loops
    without creating energy-violating uphill steps (the perturbation amplitude
    is kept small relative to the regional slope).

    Returns
    -------
    hmap_p : 2-D float64  — perturbed elevation for flow-direction use only
    """
    seed = rng.seed
    perturb = np.zeros((rows, cols), dtype=np.float64)
    for r in range(rows):
        for c in range(cols):
            nx = c / cols * 6.0
            ny = r / rows * 6.0
            # Primary warp: gentle valley bending
            p1 = fractal_noise(nx,       ny,       octaves=3, persistence=0.40,
                               seed=seed + 910) * 0.020
            # Secondary warp: smaller ripples for kinks
            p2 = fractal_noise(nx * 2.2, ny * 2.2, octaves=2, persistence=0.50,
                               seed=seed + 953) * 0.008
            # Tertiary: very fine detail only in lowlands
            h = hmap_filled[r, c]
            low_factor = max(0.0, 1.0 - (h - WATER_LEVEL) / 0.18)
            p3 = fractal_noise(nx * 4.5, ny * 4.5, octaves=2, persistence=0.45,
                               seed=seed + 997) * 0.005 * low_factor
            perturb[r, c] = p1 + p2 + p3

    return hmap_filled + perturb


# ─── STEP 2: D8 flow direction ────────────────────────────────────────────────

def _compute_d8_flow(hmap_p, rows=GRID_ROWS, cols=GRID_COLS):
    """Compute D8 flow direction using maximum-slope criterion.

    For each land cell we pick the steepest-descent neighbour, accounting
    for the longer diagonal distance so slope values are comparable.  Cells
    with no downhill neighbour (flat summits, ocean) get direction (-1, -1).

    Returns
    -------
    flow_r, flow_c : int16 arrays  — row/col of downstream neighbour
    grad           : float32 array — local slope magnitude at each cell
    """
    SQRT2      = math.sqrt(2.0)
    is_water   = hmap_p < WATER_LEVEL
    flow_r     = np.full((rows, cols), -1, dtype=np.int16)
    flow_c     = np.full((rows, cols), -1, dtype=np.int16)
    grad       = np.zeros((rows, cols), dtype=np.float32)

    for r in range(1, rows - 1):
        for c in range(1, cols - 1):
            if is_water[r, c]:
                continue
            h0         = hmap_p[r, c]
            best_slope = 0.0
            best_r, best_c = -1, -1
            for dr in [-1, 0, 1]:
                for dc in [-1, 0, 1]:
                    if dr == 0 and dc == 0:
                        continue
                    nr, nc = r + dr, c + dc
                    dist  = SQRT2 if (dr != 0 and dc != 0) else 1.0
                    slope = (h0 - hmap_p[nr, nc]) / dist
                    if slope > best_slope:
                        best_slope = slope
                        best_r, best_c = nr, nc
            if best_r >= 0:
                flow_r[r, c] = best_r
                flow_c[r, c] = best_c
                grad[r, c]   = float(best_slope)

    return flow_r, flow_c, grad


# ─── STEP 3: Flow accumulation ───────────────────────────────────────────────

def _compute_flow_accumulation(hmap_p, flow_r, flow_c,
                                rows=GRID_ROWS, cols=GRID_COLS):
    """Accumulate upstream catchment area using topological sort.

    Cells are processed from highest to lowest elevation.  Each cell adds
    its accumulation count to its single downstream neighbour.  The result
    is an integer map where high values mark main river channels.

    Returns
    -------
    flow_acc : int32 array  — upstream cell count at each grid cell
    """
    is_water = hmap_p < WATER_LEVEL

    flat_idx = np.argsort(hmap_p.ravel())[::-1]   # high → low order
    ord_r    = (flat_idx // cols).astype(np.int32)
    ord_c    = (flat_idx %  cols).astype(np.int32)

    flow_acc = np.ones((rows, cols), dtype=np.int32)

    for i in range(len(flat_idx)):
        r, c   = int(ord_r[i]), int(ord_c[i])
        if is_water[r, c]:
            continue
        nr, nc = int(flow_r[r, c]), int(flow_c[r, c])
        if 0 <= nr < rows and 0 <= nc < cols and not is_water[nr, nc]:
            flow_acc[nr, nc] += flow_acc[r, c]

    return flow_acc


# ─── STEP 4: Strahler stream ordering ────────────────────────────────────────

def _compute_strahler_orders(flow_r, flow_c, flow_acc,
                              rows=GRID_ROWS, cols=GRID_COLS):
    """Assign Strahler stream order to every land cell.

    Strahler rules:
      • A headwater cell (no upstream tributaries) is order 1.
      • Where two streams of equal order N meet the order becomes N+1.
      • Where two streams of different order meet the order stays at max(N).

    This gives a logarithmic hierarchy: thin headwaters (order 1-2) →
    medium streams (order 3) → major rivers (order 4-5+).

    Returns
    -------
    strahler : uint8 array  — stream order (0 = not a stream)
    """
    # (flow_acc < 1 means no upstream area — edge/sink cells; used as proxy)
    # Determine headwaters: cells that no other cell flows INTO
    has_upstream = np.zeros((rows, cols), dtype=bool)
    for r in range(rows):
        for c in range(cols):
            nr, nc = int(flow_r[r, c]), int(flow_c[r, c])
            if 0 <= nr < rows and 0 <= nc < cols:
                has_upstream[nr, nc] = True

    strahler = np.zeros((rows, cols), dtype=np.uint8)
    # Headwaters are cells with flow direction but no upstream
    for r in range(rows):
        for c in range(cols):
            if flow_r[r, c] >= 0 and not has_upstream[r, c]:
                strahler[r, c] = 1

    # Process high → low to propagate orders downstream
    # Sort by flow accumulation (low acc = upstream) ascending
    flat_idx = np.argsort(flow_acc.ravel())   # low acc = upstream first
    ord_r    = (flat_idx // cols).astype(np.int32)
    ord_c    = (flat_idx %  cols).astype(np.int32)

    for i in range(len(flat_idx)):
        r, c  = int(ord_r[i]), int(ord_c[i])
        if strahler[r, c] == 0:
            continue
        nr, nc = int(flow_r[r, c]), int(flow_c[r, c])
        if not (0 <= nr < rows and 0 <= nc < cols):
            continue
        s_self = strahler[r, c]
        s_down = strahler[nr, nc]
        if s_down == 0:
            strahler[nr, nc] = s_self
        elif s_down == s_self:
            strahler[nr, nc] = s_self + 1
        else:
            strahler[nr, nc] = max(s_down, s_self)

    return strahler


# ─── STEP 5: Reach character classification ───────────────────────────────────

# River character determines visual style: colour, sinuosity, width, banks.
REACH_TORRENT  = 'torrent'    # order 1-2, steep gradient,  mountain
REACH_CASCADE  = 'cascade'    # order 2-3, moderate slope,  high hills
REACH_STREAM   = 'stream'     # order 3,   gentle slope,    hills/forest
REACH_RIVER    = 'river'      # order 4,   low slope,       lowlands
REACH_MEANDER  = 'meander'    # order 4+,  very low slope,  floodplain
REACH_BRAIDED  = 'braided'    # order 5+,  nearly flat,     wide valley

def _classify_reach(path, hmap, strahler, flow_acc, rows=GRID_ROWS, cols=GRID_COLS):
    """Classify a river path's dominant character from terrain metrics.

    Examines mean gradient, Strahler order at the mouth, and mean elevation
    to assign one of six reach archetypes.

    Returns
    -------
    character : str  — one of the REACH_* constants
    order     : int  — Strahler order at river mouth
    mean_grad : float — mean slope along path
    """
    if not path:
        return REACH_STREAM, 1, 0.0

    # Gather per-cell metrics
    elev_vals  = []
    grad_vals  = []
    for i in range(len(path)):
        r, c = path[i]
        if 0 <= r < rows and 0 <= c < cols:
            elev_vals.append(float(hmap[r, c]))
            if i > 0:
                pr, pc = path[i - 1]
                dh = abs(float(hmap[pr, pc]) - float(hmap[r, c]))
                grad_vals.append(dh)

    mean_elev = float(np.mean(elev_vals)) if elev_vals else 0.5
    mean_grad = float(np.mean(grad_vals)) if grad_vals else 0.0

    # Strahler order at mouth (last cell)
    last_r, last_c = path[-1]
    mouth_r, mouth_c = path[max(0, len(path) - 3)]   # a few steps before end
    if 0 <= mouth_r < rows and 0 <= mouth_c < cols:
        order = int(strahler[mouth_r, mouth_c])
    else:
        order = 1
    order = max(1, order)

    # Classification rules
    if mean_grad > 0.025 and mean_elev > WATER_LEVEL + 0.25:
        return REACH_TORRENT, order, mean_grad
    elif mean_grad > 0.015 and mean_elev > WATER_LEVEL + 0.14:
        return REACH_CASCADE, order, mean_grad
    elif mean_grad > 0.008:
        return REACH_STREAM, order, mean_grad
    elif mean_grad > 0.003 and order >= 4:
        return REACH_RIVER, order, mean_grad
    elif order >= 5 and mean_grad < 0.002:
        return REACH_BRAIDED, order, mean_grad
    elif order >= 4:
        return REACH_MEANDER, order, mean_grad
    else:
        return REACH_STREAM, order, mean_grad


# ─── STEP 6: Sinuosity injection ─────────────────────────────────────────────

def _add_sinuosity(path, character, order, rng, hmap,
                   rows=GRID_ROWS, cols=GRID_COLS):
    """Inject natural sinuosity into a river path based on reach character.

    Torrents and cascades follow gradient closely with minimal deflection.
    Streams get gentle S-bends.
    Rivers and meanders get pronounced sinuous curves using a
    directional-persistence model: each step has a preferred direction
    biased toward the overall downstream vector, with lateral deviation
    that gradually reverses (creating S-bends) and occasional overriding
    by steep gradient (creating cut-bank straightening).

    The sinuosity multiplier follows observed empirical ranges:
      torrent  ≈ 1.0–1.1   (nearly straight, gravity-controlled)
      cascade  ≈ 1.1–1.2
      stream   ≈ 1.2–1.5
      river    ≈ 1.4–1.8
      meander  ≈ 1.7–2.5   (pronounced loops)

    Returns
    -------
    new_path : list of (r, c)  — re-routed path with added sinuosity
    """
    if len(path) < 4:
        return path

    # Sinuosity parameters by character
    sin_params = {
        REACH_TORRENT: (0.0,  0.5,  1),    # (lateral_amp, lateral_freq, smooth_pass)
        REACH_CASCADE: (0.5,  0.6,  1),
        REACH_STREAM:  (1.2,  0.5,  2),
        REACH_RIVER:   (1.8,  0.4,  2),
        REACH_MEANDER: (2.8,  0.35, 3),
        REACH_BRAIDED: (1.5,  0.5,  2),
    }
    lat_amp, lat_freq, smooth_passes = sin_params.get(character,
                                                       (1.0, 0.5, 2))

    if lat_amp < 0.1:
        return path   # torrents: no modification

    n = len(path)
    # Build float coordinate arrays
    pr = np.array([p[0] for p in path], dtype=np.float64)
    pc = np.array([p[1] for p in path], dtype=np.float64)

    # Overall downstream direction (normalised)
    total_dr = pr[-1] - pr[0]
    total_dc = pc[-1] - pc[0]
    total_d  = math.sqrt(total_dr**2 + total_dc**2) + 1e-6
    main_dr  = total_dr / total_d
    main_dc  = total_dc / total_d

    # Perpendicular (lateral) direction
    lat_dr = -main_dc
    lat_dc =  main_dr

    # Inject a sine wave displacement perpendicular to main flow direction
    # The wave reverses direction in the downstream half to form S-bends
    seed_v = rng.seed + int(pr[0] * 100 + pc[0] * 17)
    phase  = _hash2d(int(pr[0]), int(pc[0]), seed_v) * 2 * math.pi

    new_pr = pr.copy()
    new_pc = pc.copy()

    for i in range(1, n - 1):
        t    = i / n
        # Sine wave along path — amplitude tapers at source and mouth
        taper = math.sin(math.pi * t) ** 0.6     # 0 at ends, 1 in middle
        wave  = math.sin(phase + t * math.pi * 2.0 * lat_freq * n / 20.0)
        disp  = wave * lat_amp * taper

        new_pr[i] = pr[i] + disp * lat_dr
        new_pc[i] = pc[i] + disp * lat_dc

    # Smooth the displaced path to avoid kinks
    for _ in range(smooth_passes):
        sp = new_pr.copy()
        sc2 = new_pc.copy()
        for i in range(1, n - 1):
            sp[i]  = 0.25 * new_pr[i-1] + 0.5 * new_pr[i] + 0.25 * new_pr[i+1]
            sc2[i] = 0.25 * new_pc[i-1] + 0.5 * new_pc[i] + 0.25 * new_pc[i+1]
        new_pr = sp
        new_pc = sc2

    # Clip to grid bounds and rebuild as integer (r, c) pairs
    new_path = []
    for i in range(n):
        r = int(round(float(np.clip(new_pr[i], 0, rows - 1))))
        c = int(round(float(np.clip(new_pc[i], 0, cols - 1))))
        new_path.append((r, c))

    return new_path


# ─── STEP 7: Braided section builder ─────────────────────────────────────────

def _build_braided_section(path, rng):
    """Split a flat high-flow river section into 2-3 braided channels.

    Braided rivers occur in wide flat valleys where sediment load is high
    and flow spreads across multiple shallow channels.  We simulate this
    by duplicating a section of the path with small lateral offsets and
    having them merge back downstream.

    Returns
    -------
    braid_paths : list of short path lists (the extra channels only;
                  the original path is rendered normally by the caller)
    """
    if len(path) < 20:
        return []

    braid_paths = []
    # Pick a middle section for braiding
    start = len(path) // 4
    end   = len(path) * 3 // 4

    n_braids = 2 if rng.random() < 0.6 else 1

    for b in range(n_braids):
        offset_r = rng.uniform(-2.0, 2.0)
        offset_c = rng.uniform(-2.0, 2.0)
        braid = []
        for i in range(start, end):
            r, c = path[i]
            br = int(round(r + offset_r * math.sin(math.pi * (i - start) / (end - start))))
            bc = int(round(c + offset_c * math.sin(math.pi * (i - start) / (end - start))))
            br = max(0, min(GRID_ROWS - 1, br))
            bc = max(0, min(GRID_COLS - 1, bc))
            braid.append((br, bc))
        if len(braid) >= 6:
            braid_paths.append(braid)

    return braid_paths


# ─── MAIN GENERATION FUNCTION ────────────────────────────────────────────────

def generate_rivers(hmap, biomes, rng, rows=GRID_ROWS, cols=GRID_COLS,
                    coast_dist=None):
    """Generate a complete hydrological river network.

    Full pipeline
    -------------
    1.  Fill depressions (Planchon-Darboux) so all rivers reach the sea.
    2.  Build domain-warp perturbation map for organic meanders.
    3.  Compute slope-weighted D8 flow direction.
    4.  Compute flow accumulation (catchment area) by topological sort.
    5.  Compute Strahler stream orders for hierarchical classification.
    6.  Select source cells with strict minimum spacing (no parallel rivers).
    7.  Trace each river deterministically along the flow field;
        detect and merge confluences.
    8.  Classify each river reach (torrent / cascade / stream / river /
        meander / braided) from gradient + order metrics.
    9.  Inject sinuosity appropriate to each reach character.
    10. Generate braided sub-channels for high-order flat sections.
    11. Generate secondary headwater streams from hill flanks.
    12. Detect inland basin terminations for lake seeding.

    All metadata needed by render_rivers() is stashed on this function
    object (generate_rivers._river_acc, ._strahler_orders,
    ._river_characters, ._braided_extras, ._basin_hints) so the caller
    passes only the path list.
    """
    is_water = hmap < WATER_LEVEL

    # ── 1. Depression filling ────────────────────────────────────────
    print("      Filling depressions...")
    hmap_filled = _fill_depressions(hmap, rows, cols)

    # ── 2. Domain-warp perturbation ──────────────────────────────────
    hmap_p = _build_perturb_map(hmap_filled, rng, rows, cols)

    # ── 3. D8 flow direction ─────────────────────────────────────────
    flow_r, flow_c, grad_map = _compute_d8_flow(hmap_p, rows, cols)

    # ── 4. Flow accumulation ─────────────────────────────────────────
    flow_acc = _compute_flow_accumulation(hmap_p, flow_r, flow_c, rows, cols)

    # ── 5. Strahler orders ───────────────────────────────────────────
    strahler = _compute_strahler_orders(flow_r, flow_c, flow_acc, rows, cols)

    # ── 6. Source selection with minimum spacing ─────────────────────
    MIN_SPACING  = 12    # grid cells between sources
    MAX_SOURCES  = 90
    BLOCK        = max(1, MIN_SPACING // 2)

    # Precompute coast distance for inland-source preference (if not passed in)
    if coast_dist is None:
        from scipy.ndimage import distance_transform_edt as _edt
        coast_dist = _edt(~is_water).astype(np.float32)

    candidates = []
    for r in range(3, rows - 3):
        for c in range(3, cols - 3):
            if is_water[r, c]:
                continue
            if flow_r[r, c] < 0:
                continue    # no valid outlet — skip
            cd = float(coast_dist[r, c])
            # Require sources to be at least 6 cells inland so rivers
            # have room to flow before reaching the ocean.
            if cd < 6:
                continue
            h = hmap[r, c]
            b = biomes[r, c]
            # Inland distance bonus: sources farther inland score higher
            inland_bonus = min(cd / 40.0, 0.12)
            if b in ('mountain', 'snow_peak') and rng.random() < 0.22:
                candidates.append((h + inland_bonus + rng.uniform(0, 0.05), r, c, 'mountain'))
            elif h > 0.54 and b == 'hills' and rng.random() < 0.08:
                candidates.append((h + inland_bonus + rng.uniform(0, 0.03), r, c, 'hill'))
            elif h > 0.51 and b in ('grassland', 'forest') and rng.random() < 0.025:
                candidates.append((h + inland_bonus + rng.uniform(0, 0.02), r, c, 'spring'))

    candidates.sort(key=lambda x: -x[0])   # tallest first

    occupied_blocks = set()
    sources = []
    for _, r, c, kind in candidates:
        br, bc  = r // BLOCK, c // BLOCK
        blocked = any((br + dbr, bc + dbc) in occupied_blocks
                      for dbr in range(-2, 3) for dbc in range(-2, 3))
        if blocked:
            continue
        sources.append((r, c, kind))
        occupied_blocks.add((br, bc))
        if len(sources) >= MAX_SOURCES:
            break

    # ── 7. Trace rivers along flow field with confluence merging ─────
    rivers      = []    # list of (r,c) paths
    river_acc   = []    # max flow_acc seen along path
    cell_to_rid = {}    # (r,c) → river index for confluence detection
    MAX_STEPS   = 900

    for sr, sc, kind in sources:
        path         = [(sr, sc)]
        cr, cc       = sr, sc
        max_acc_seen = int(flow_acc[sr, sc])

        for _ in range(MAX_STEPS):
            nr, nc = int(flow_r[cr, cc]), int(flow_c[cr, cc])

            if nr < 0 or nc < 0:
                break    # no outlet (flat summit / map edge)

            if is_water[nr, nc]:
                path.append((nr, nc))
                max_acc_seen = max(max_acc_seen, int(flow_acc[cr, cc]))
                break

            # Confluence: this cell already belongs to another river
            if (nr, nc) in cell_to_rid:
                path.append((nr, nc))
                max_acc_seen = max(max_acc_seen, int(flow_acc[nr, nc]))
                break

            cr, cc = nr, nc
            path.append((cr, cc))
            max_acc_seen = max(max_acc_seen, int(flow_acc[cr, cc]))

        if len(path) >= 8:
            rid = len(rivers)
            rivers.append(path)
            river_acc.append(max_acc_seen)
            for r, c in path[:-1]:
                if (r, c) not in cell_to_rid:
                    cell_to_rid[(r, c)] = rid

    # ── 8. Classify reach character ──────────────────────────────────
    river_characters = []
    river_orders     = []
    river_grad_means = []
    for path in rivers:
        char, order, mg = _classify_reach(path, hmap_filled, strahler,
                                          flow_acc, rows, cols)
        river_characters.append(char)
        river_orders.append(order)
        river_grad_means.append(mg)

    # ── 9. Inject sinuosity ──────────────────────────────────────────
    sinuous_rivers = []
    for i, path in enumerate(rivers):
        char  = river_characters[i]
        order = river_orders[i]
        sinuous_path = _add_sinuosity(path, char, order, rng, hmap_filled,
                                      rows, cols)
        sinuous_rivers.append(sinuous_path)

    # ── 10. Braided extras for high-order flat rivers ─────────────────
    braided_extras = []    # extra braid sub-paths (rendered like minor rivers)
    for i, path in enumerate(sinuous_rivers):
        if river_characters[i] == REACH_BRAIDED and len(path) >= 20:
            braids = _build_braided_section(path, rng)
            braided_extras.extend(braids)

    # ── 11. Secondary headwater streams ──────────────────────────────
    # Short hill-flank streams that feed into the main network
    secondary_sources = []
    for r in range(3, rows - 3):
        for c in range(3, cols - 3):
            if is_water[r, c] or (r, c) in cell_to_rid:
                continue
            if biomes[r, c] not in ('hills', 'mountain'):
                continue
            if hmap[r, c] < WATER_LEVEL + 0.06:
                continue
            if flow_r[r, c] < 0:
                continue
            near = any((r + dr, c + dc) in cell_to_rid
                       for dr in range(-5, 6) for dc in range(-5, 6))
            if near and rng.random() < 0.055:
                secondary_sources.append((r, c))

    for sr, sc in secondary_sources[:45]:
        path = [(sr, sc)]
        cr, cc = sr, sc
        for _ in range(140):
            nr, nc = int(flow_r[cr, cc]), int(flow_c[cr, cc])
            if nr < 0 or nc < 0:
                break
            if is_water[nr, nc]:
                path.append((nr, nc))
                break
            cr, cc = nr, nc
            path.append((cr, cc))
            if (cr, cc) in cell_to_rid:
                break
        if len(path) >= 6:
            rid = len(sinuous_rivers)
            sinuous_rivers.append(path)
            river_acc.append(int(flow_acc[path[-1][0], path[-1][1]]))
            river_characters.append(REACH_STREAM)
            river_orders.append(1)
            river_grad_means.append(0.01)
            for r, c in path[:-1]:
                if (r, c) not in cell_to_rid:
                    cell_to_rid[(r, c)] = rid

    # Add braided extras as low-order streams
    for braid in braided_extras:
        sinuous_rivers.append(braid)
        river_acc.append(1)
        river_characters.append(REACH_STREAM)
        river_orders.append(1)
        river_grad_means.append(0.005)

    # ── 12. Basin hints for lake placement ───────────────────────────
    basin_hints = []
    for path in sinuous_rivers:
        if not path:
            continue
        last_r, last_c = path[-1]
        if is_water[last_r, last_c]:
            continue
        if flow_r[last_r, last_c] < 0:
            h_end = hmap[last_r, last_c]
            if WATER_LEVEL + 0.004 < h_end < WATER_LEVEL + 0.22:
                basin_hints.append((last_r, last_c))

    # Stash metadata for renderer
    generate_rivers._basin_hints      = basin_hints
    generate_rivers._river_acc        = river_acc
    generate_rivers._river_characters = river_characters
    generate_rivers._river_orders     = river_orders
    generate_rivers._river_grad_means = river_grad_means
    generate_rivers._strahler         = strahler
    generate_rivers._flow_acc         = flow_acc

    return sinuous_rivers


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


def generate_lakes(hmap, biomes, rng, rivers=None, settlements=None,
                   rows=GRID_ROWS, cols=GRID_COLS):
    """Generate lakes using three complementary placement strategies.

    Strategy A — Basin/confluence lakes
        Uses the basin_hints stashed by generate_rivers(). Where a river
        terminates inland at a topographic low, we place a lake.  These are
        the most geographically realistic because they follow the actual
        drainage topology.

    Strategy B — Mountain cirque tarns
        Small (radius 1-2) lakes placed in mountain/snow_peak zones where
        the terrain flattens slightly. These add detail to highland areas.

    Strategy C — Valley floor lakes
        Medium lakes (radius 2-5) in low-elevation inland areas between
        mountain ranges.  Placed using a flatness criterion — the standard
        deviation of height in a local neighbourhood must be small.

    Returns
    -------
    list of (center_r, center_c, radius_cells, lake_kind)
        lake_kind is one of: 'basin', 'tarn', 'valley'
    """
    from scipy.ndimage import distance_transform_edt, generic_filter

    lakes = []
    is_land  = hmap >= WATER_LEVEL
    is_water = ~is_land

    # Coast-distance needed for inland placement checks
    coast_dist = distance_transform_edt(is_land).astype(np.float32)

    # Pre-compute local elevation std-dev for flatness test (3×3 window)
    def local_std(window):
        return float(np.std(window))
    elev_std = generic_filter(hmap, local_std, size=5, mode='nearest')

    # Minimum spacing between lakes (grid cells)
    MIN_LAKE_SPACING = 20
    placed = []   # (r, c) of placed lakes

    # Settlement exclusion zone — lakes must not overlap with towns
    settle_cells = set()
    if settlements:
        for item in settlements:
            sr, sc = item[0], item[1]
            for dr in range(-4, 5):
                for dc in range(-4, 5):
                    settle_cells.add((sr + dr, sc + dc))

    def too_close_to_existing(r, c):
        for lr, lc, *_ in placed:
            if abs(r - lr) + abs(c - lc) < MIN_LAKE_SPACING:
                return True
        return False

    def near_settlement(r, c):
        return (r, c) in settle_cells

    # ---------------------------------------------------------------
    # Strategy A: Basin lakes from river termination hints
    # ---------------------------------------------------------------
    basin_hints = getattr(generate_rivers, '_basin_hints', [])
    for r, c in basin_hints:
        if not is_land[r, c]:
            continue
        if coast_dist[r, c] < 5:
            continue
        if too_close_to_existing(r, c):
            continue
        if near_settlement(r, c):
            continue
        if biomes[r, c] in ('mountain', 'snow_peak'):
            continue
        h = hmap[r, c]
        radius = 3 if h < WATER_LEVEL + 0.07 else 2
        lakes.append((r, c, radius, 'basin'))
        placed.append((r, c, radius))

    # ---------------------------------------------------------------
    # Strategy B: Mountain cirque tarns
    # High-altitude lakes in mountain zones — small, round, icy-looking
    # ---------------------------------------------------------------
    tarn_candidates = []
    for r in range(5, rows - 5):
        for c in range(5, cols - 5):
            if biomes[r, c] not in ('mountain', 'snow_peak'):
                continue
            h = hmap[r, c]
            if h < WATER_LEVEL + 0.24:
                continue  # not high enough
            if elev_std[r, c] > 0.025:
                continue  # too steep locally
            if rng.random() < 0.92:
                continue  # thin out candidates
            tarn_candidates.append((h, r, c))

    tarn_candidates.sort(key=lambda x: -x[0])  # highest first

    for _, r, c in tarn_candidates:
        if len([l for l in lakes if l[3] == 'tarn']) >= 5:
            break
        if too_close_to_existing(r, c):
            continue
        if near_settlement(r, c):
            continue
        radius = 1
        lakes.append((r, c, radius, 'tarn'))
        placed.append((r, c, radius))

    # ---------------------------------------------------------------
    # Strategy C: Valley floor lakes
    # Flat inland areas between mountain ranges — the big scenic lakes
    # ---------------------------------------------------------------
    valley_candidates = []
    for r in range(8, rows - 8):
        for c in range(8, cols - 8):
            if not is_land[r, c]:
                continue
            b = biomes[r, c]
            if b in ('mountain', 'snow_peak', 'beach', 'coast_water', 'desert'):
                continue
            h = hmap[r, c]
            if h > WATER_LEVEL + 0.14:
                continue  # too high (would be a hillside pond)
            if coast_dist[r, c] < 7:
                continue  # too coastal
            if elev_std[r, c] > 0.018:
                continue  # not flat enough — must be a genuine valley floor
            # Prefer areas surrounded by higher terrain (enclosed basins)
            neighbours_higher = 0
            for dr in [-4, -2, 0, 2, 4]:
                for dc in [-4, -2, 0, 2, 4]:
                    if dr == 0 and dc == 0:
                        continue
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < rows and 0 <= nc < cols:
                        if hmap[nr, nc] > h + 0.04:
                            neighbours_higher += 1
            # Score: flatter + more enclosed = better lake candidate
            score = neighbours_higher * 0.1 - elev_std[r, c] * 20
            valley_candidates.append((score, r, c))

    valley_candidates.sort(key=lambda x: -x[0])

    for _, r, c in valley_candidates:
        valley_count = len([l for l in lakes if l[3] == 'valley'])
        if valley_count >= 6:
            break
        if too_close_to_existing(r, c):
            continue
        if near_settlement(r, c):
            continue
        radius = rng.randint(2, 4) if elev_std[r, c] < 0.010 else 2
        lakes.append((r, c, radius, 'valley'))
        placed.append((r, c, radius))

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
        ('capital', 3, 100),   # 3 capitals, min 100 cells apart
        ('city', 8, 56),
        ('town', 15, 32),
        ('hamlet', 20, 24),
        ('village', 25, 16),
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
    """Generate a rich, layered road network connecting settlements.

    Road hierarchy:
    - King's Roads: thick double-line highways between capitals
    - Trade Routes: solid lines connecting capitals to cities, city-to-city
    - Country Roads: thinner lines connecting towns to nearest city/capital
    - Trails: dotted paths from hamlets/villages to nearest town+

    Roads follow terrain intelligently — preferring valleys, avoiding mountains,
    following coastlines, with existing roads reducing cost (roads attract roads).
    """
    import heapq

    roads = []
    is_land = hmap >= WATER_LEVEL

    # Build a cost map that can be modified as roads are placed
    # (existing roads reduce cost for future roads — roads follow roads)
    road_bonus = np.zeros((rows, cols), dtype=np.float32)

    def path_cost(r, c, nr, nc):
        if not is_land[nr, nc]:
            return 999
        h_diff = abs(float(hmap[nr, nc]) - float(hmap[r, c]))
        b = biomes[nr, nc]
        # Base terrain cost
        if b == 'mountain':
            base = 6.0
        elif b == 'snow_peak':
            base = 10.0
        elif b == 'dense_forest':
            base = 2.2
        elif b == 'forest':
            base = 1.6
        elif b == 'hills':
            base = 1.4
        elif b == 'desert':
            base = 1.8
        elif b == 'tundra':
            base = 2.0
        elif b in ('grassland', 'plains'):
            base = 0.8  # flat open land is cheapest
        elif b == 'beach':
            base = 1.0
        else:
            base = 1.0
        # Elevation change penalty
        cost = base + h_diff * 12
        # Existing roads reduce cost — roads attract roads
        cost *= max(0.4, 1.0 - road_bonus[nr, nc] * 0.5)
        return cost

    def astar(sr, sc, er, ec, max_steps=8000):
        if sr == er and sc == ec:
            return []
        heap = [(0, 0, sr, sc)]  # (f, counter, r, c)
        came_from = {}
        g_score = {(sr, sc): 0}
        visited = set()
        counter = 0

        while heap and counter < max_steps:
            f, _, r, c = heapq.heappop(heap)
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
                            counter += 1
                            heapq.heappush(heap, (new_g + h, counter, nr, nc))
                            came_from[(nr, nc)] = (r, c)

        return []

    def mark_road(path, strength=1.0):
        """Mark cells along a road to attract future roads."""
        for r, c in path:
            road_bonus[r, c] = min(1.0, road_bonus[r, c] + strength)
            # Also mark neighbors slightly
            for dr in [-1, 0, 1]:
                for dc in [-1, 0, 1]:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < rows and 0 <= nc < cols:
                        road_bonus[nr, nc] = min(1.0, road_bonus[nr, nc] + strength * 0.3)

    def smooth_path(path, iterations=2):
        """Smooth a path to remove jagged cell-by-cell steps."""
        if len(path) < 4:
            return path
        for _ in range(iterations):
            new_path = [path[0]]
            for i in range(1, len(path) - 1):
                r = (path[i-1][0] + path[i][0] + path[i+1][0]) / 3.0
                c = (path[i-1][1] + path[i][1] + path[i+1][1]) / 3.0
                new_path.append((r, c))
            new_path.append(path[-1])
            path = new_path
        return path

    # Categorize settlements
    capitals = [(r, c) for r, c, t, _ in settlements if t == 'capital']
    cities = [(r, c) for r, c, t, _ in settlements if t == 'city']
    towns = [(r, c) for r, c, t, _ in settlements if t == 'town']
    hamlets = [(r, c) for r, c, t, _ in settlements if t == 'hamlet']
    villages = [(r, c) for r, c, t, _ in settlements if t == 'village']

    # === TIER 1: King's Roads — capital to capital ===
    for i in range(len(capitals)):
        for j in range(i + 1, len(capitals)):
            r1, c1 = capitals[i]
            r2, c2 = capitals[j]
            dist = math.sqrt((r1 - r2)**2 + (c1 - c2)**2)
            if dist < 180:
                path = astar(r1, c1, r2, c2)
                if path:
                    path = smooth_path(path, 3)
                    roads.append(('kings_road', path))
                    mark_road([(int(r), int(c)) for r, c in path], 1.0)

    # === TIER 2: Trade Routes — capital to cities, city to nearest cities ===
    for cr, cc in cities:
        # Connect to nearest 2 capitals
        dists = [(math.sqrt((cr - kr)**2 + (cc - kc)**2), kr, kc)
                 for kr, kc in capitals]
        dists.sort()
        for d, kr, kc in dists[:2]:
            if d < 120:
                path = astar(cr, cc, kr, kc)
                if path:
                    path = smooth_path(path, 2)
                    roads.append(('trade_route', path))
                    mark_road([(int(r), int(c)) for r, c in path], 0.7)

    # City-to-city connections (nearest 2 neighbors)
    for i in range(len(cities)):
        dists = []
        for j in range(len(cities)):
            if i == j:
                continue
            d = math.sqrt((cities[i][0] - cities[j][0])**2 +
                          (cities[i][1] - cities[j][1])**2)
            dists.append((d, j))
        dists.sort()
        for d, j in dists[:2]:
            if d < 80:
                path = astar(cities[i][0], cities[i][1],
                             cities[j][0], cities[j][1])
                if path:
                    path = smooth_path(path, 2)
                    roads.append(('trade_route', path))
                    mark_road([(int(r), int(c)) for r, c in path], 0.5)

    # === TIER 3: Country Roads — towns to nearest city/capital ===
    all_major = capitals + cities
    for tr, tc in towns:
        dists = [(math.sqrt((tr - mr)**2 + (tc - mc)**2), mr, mc)
                 for mr, mc in all_major]
        dists.sort()
        for d, mr, mc in dists[:1]:
            if d < 70:
                path = astar(tr, tc, mr, mc)
                if path:
                    path = smooth_path(path, 2)
                    roads.append(('country_road', path))
                    mark_road([(int(r), int(c)) for r, c in path], 0.3)

    # Town-to-town connections (nearest neighbor only)
    for i in range(len(towns)):
        best_d = 9999
        best_j = -1
        for j in range(len(towns)):
            if i == j:
                continue
            d = math.sqrt((towns[i][0] - towns[j][0])**2 +
                          (towns[i][1] - towns[j][1])**2)
            if d < best_d:
                best_d = d
                best_j = j
        if best_j >= 0 and best_d < 40:
            path = astar(towns[i][0], towns[i][1],
                         towns[best_j][0], towns[best_j][1])
            if path:
                path = smooth_path(path, 1)
                roads.append(('country_road', path))
                mark_road([(int(r), int(c)) for r, c in path], 0.2)

    # === TIER 4: Trails — hamlets/villages to nearest town+ ===
    all_connected = capitals + cities + towns
    for hr, hc in hamlets + villages:
        dists = [(math.sqrt((hr - ar)**2 + (hc - ac)**2), ar, ac)
                 for ar, ac in all_connected]
        dists.sort()
        if dists and dists[0][0] < 40:
            d, ar, ac = dists[0]
            path = astar(hr, hc, ar, ac)
            if path:
                path = smooth_path(path, 1)
                roads.append(('trail', path))

    return roads


# =============================================================================
# KINGDOM ASSIGNMENT
# =============================================================================

def assign_kingdoms(hmap, biomes, settlements, rivers, rng, namer,
                    rows=GRID_ROWS, cols=GRID_COLS):
    """Assign land cells to kingdoms using terrain-aware Dijkstra.
    Mountains and rivers act as natural barriers — borders follow geography."""
    import heapq

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

    # Build river barrier map — cells adjacent to rivers are harder to cross
    river_barrier = np.zeros((rows, cols), dtype=np.float32)
    for path in rivers:
        for r, c in path:
            if 0 <= r < rows and 0 <= c < cols:
                river_barrier[r, c] = 1.0
                for dr in [-1, 0, 1]:
                    for dc in [-1, 0, 1]:
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < rows and 0 <= nc < cols:
                            river_barrier[nr, nc] = max(river_barrier[nr, nc], 0.5)

    # Terrain-aware Dijkstra — borders form along mountains and rivers naturally
    dist = np.full((rows, cols), float('inf'))
    heap = []
    for i, (kr, kc, _) in enumerate(capitals):
        kingdom_map[kr, kc] = i
        dist[kr, kc] = 0.0
        heapq.heappush(heap, (0.0, kr, kc, i))

    while heap:
        d, r, c, ki = heapq.heappop(heap)
        if d > dist[r, c] + 0.001:
            continue
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                if dr == 0 and dc == 0:
                    continue
                nr, nc = r + dr, c + dc
                if not (0 <= nr < rows and 0 <= nc < cols):
                    continue
                if not is_land[nr, nc]:
                    continue
                b = biomes[nr, nc]
                # Terrain cost: mountains are very hard to cross → borders form there
                if b in ('mountain', 'snow_peak'):
                    move_cost = 9.0
                elif b == 'hills':
                    move_cost = 2.5
                else:
                    move_cost = 1.0
                # Rivers add crossing cost → borders follow rivers
                move_cost += river_barrier[nr, nc] * 4.0
                # Diagonal movement costs more
                if dr != 0 and dc != 0:
                    move_cost *= 1.414
                new_d = d + move_cost
                if new_d < dist[nr, nc]:
                    dist[nr, nc] = new_d
                    kingdom_map[nr, nc] = ki
                    heapq.heappush(heap, (new_d, nr, nc, ki))

    return kingdom_map, kingdoms


# =============================================================================
# RENDERING ENGINE — PARCHMENT STYLE
# =============================================================================

class MapRenderer:
    """Renders the world map in antique parchment cartographic style."""

    def __init__(self, width=MAP_W, height=MAP_H, rng_seed=42):
        self.W = width
        self.H = height
        self.rng_seed = rng_seed
        self.img = Image.new('RGBA', (width, height), (200, 180, 130, 255))
        self.draw = ImageDraw.Draw(self.img)

        # Load fonts
        try:
            self.font_title = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', 78)
            self.font_subtitle = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', 30)
            self.font_capital = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', 54)
            self.font_city = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', 36)
            self.font_town = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', 26)
            self.font_village = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', 18)
            self.font_kingdom = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', 100)
            self.font_legend = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', 21)
            self.font_legend_title = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', 26)
            self.font_ocean = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', 57)
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
        """Draw rich, aged parchment texture with grain, stains, and weathering."""
        pixels = np.array(self.img, dtype=np.float64)

        ys, xs = np.mgrid[0:self.H, 0:self.W]
        nxs = xs / self.W
        nys = ys / self.H

        # Fine paper grain
        grain = rng._np_rng.normal(0, 7, (self.H, self.W))
        grain = ndimage.gaussian_filter(grain, sigma=2)

        # Coarse fiber texture — larger scale grain
        fiber = rng._np_rng.normal(0, 4, (self.H, self.W))
        fiber = ndimage.gaussian_filter(fiber, sigma=8)

        # Age stains — large organic blotches
        stain_x = np.sin(nxs * 3.7 + nys * 2.3) * np.cos(nxs * 1.8 - nys * 4.1)
        stain2 = np.sin(nxs * 5.2 - nys * 1.4) * np.cos(nxs * 2.7 + nys * 3.8)
        stain = ((stain_x + stain2 * 0.5) * 10).clip(-15, 15)

        # Foxing spots — small brown age spots scattered across the surface
        fox_noise = rng._np_rng.random_sample((self.H // 8, self.W // 8))
        fox_spots = ndimage.zoom(fox_noise, (self.H / (self.H // 8), self.W / (self.W // 8)), order=1)
        fox_spots = (fox_spots > 0.92).astype(np.float64) * 8
        fox_spots = ndimage.gaussian_filter(fox_spots, sigma=3)

        # Edge darkening/weathering — darker toward edges (in addition to vignette)
        edge_dist_x = np.minimum(nxs, 1 - nxs) * 2  # 0 at edges, 1 at center
        edge_dist_y = np.minimum(nys, 1 - nys) * 2
        edge_factor = np.clip(edge_dist_x * edge_dist_y, 0, 1)
        edge_darken = (1 - edge_factor) * 15  # up to 15 darker at edges

        # Vignette — soft corners
        dx = (nxs - 0.5) * 2
        dy = (nys - 0.5) * 2
        vignette = np.clip(1.0 - (dx * dx + dy * dy) * 0.18, 0.68, 1.0)

        # Base parchment colors — warm golden tone
        pixels[:, :, 0] = np.clip((200 + grain + fiber + stain - fox_spots - edge_darken) * vignette, 0, 255)
        pixels[:, :, 1] = np.clip((176 + grain * 0.85 + fiber * 0.8 + stain * 0.8 - fox_spots * 0.9 - edge_darken * 0.9) * vignette, 0, 255)
        pixels[:, :, 2] = np.clip((95 + grain * 0.55 + fiber * 0.5 + stain * 0.4 - fox_spots * 0.5 - edge_darken * 0.6) * vignette, 0, 255)
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

                # Ink-on-parchment ocean — just slightly cooler/darker than land
                # so land pops by contrast; no colour fill, all detail via linework
                target_r = 188 - depth * 28
                target_g = 178 - depth * 22
                target_b = 162 - depth * 10
                # Blend current parchment pixel toward ocean target colour
                pixels[sy, sx, 0] = pixels[sy, sx, 0] * (1 - t) + target_r * t
                pixels[sy, sx, 1] = pixels[sy, sx, 1] * (1 - t) + target_g * t
                pixels[sy, sx, 2] = pixels[sy, sx, 2] * (1 - t) + target_b * t

        self.img = Image.fromarray(np.clip(pixels, 0, 255).astype(np.uint8))
        self.draw = ImageDraw.Draw(self.img)

    def render_biome_colors(self, hmap, biomes):
        """Apply subtle color tints per biome for visual differentiation.
        Gives each terrain type a characteristic hue while preserving the
        parchment aesthetic — greens for forest, ochres for desert, etc."""
        map_w = self.W - 2 * MARGIN
        map_h = self.H - 2 * MARGIN

        biome_palette = {
            # Parchment base is warm ~(210, 188, 148). Push biomes to distinct, recognisable tones.
            # Desert: warm amber-ochre, clearly sandier than plains
            'desert':        (200, 148,  40, 148),
            # Grassland: strong sage green
            'grassland':     ( 55,  108,  38, 155),
            # Plains: lighter sage-tan — still greener than desert
            'plains':        ( 100, 130,  65, 118),
            # Forest: deep dark green
            'forest':        ( 28,   68,  18, 138),
            # Dense forest: very deep green
            'dense_forest':  ( 15,   52,  10, 158),
            # Hills: warm olive-tan — clearly elevated feel
            'hills':         (148, 118,  62,  92),
            # Mountain: cooler grey-brown
            'mountain':      (122, 108,  82, 100),
            # Snow peak: barely-there cool white — peaks have drawn snow caps
            'snow_peak':     (205, 200, 185,  15),
            # Tundra: distinctly cool blue-grey
            'tundra':        (132, 155, 175, 108),
            # Beach: sandy warm — subtle brightening near coast
            'beach':         (202, 182, 112,  68),
        }

        is_water = hmap < WATER_LEVEL

        # Single-pass: assign per-cell color then upscale+blur for smooth transitions
        color_grid = np.zeros((GRID_ROWS, GRID_COLS, 4), dtype=np.float32)
        for r in range(GRID_ROWS):
            for c in range(GRID_COLS):
                if is_water[r, c]:
                    continue
                b = biomes[r, c]
                if b in biome_palette:
                    color_grid[r, c] = biome_palette[b]

        # Upscale to pixel resolution
        scale_r = map_h / GRID_ROWS
        scale_c = map_w / GRID_COLS
        overlay_r = ndimage.zoom(color_grid[:, :, 0], (scale_r, scale_c), order=1)
        overlay_g = ndimage.zoom(color_grid[:, :, 1], (scale_r, scale_c), order=1)
        overlay_b = ndimage.zoom(color_grid[:, :, 2], (scale_r, scale_c), order=1)
        overlay_a = ndimage.zoom(color_grid[:, :, 3], (scale_r, scale_c), order=1)

        # Smooth biome edges — tighter sigma for crisper region boundaries
        sigma = 2.2
        overlay_r = ndimage.gaussian_filter(overlay_r, sigma=sigma)
        overlay_g = ndimage.gaussian_filter(overlay_g, sigma=sigma)
        overlay_b = ndimage.gaussian_filter(overlay_b, sigma=sigma)
        overlay_a = ndimage.gaussian_filter(overlay_a, sigma=sigma)

        h_sl = min(overlay_r.shape[0], map_h)
        w_sl = min(overlay_r.shape[1], map_w)

        full = np.zeros((self.H, self.W, 4), dtype=np.float32)
        full[MARGIN:MARGIN+h_sl, MARGIN:MARGIN+w_sl, 0] = np.clip(overlay_r[:h_sl, :w_sl], 0, 255)
        full[MARGIN:MARGIN+h_sl, MARGIN:MARGIN+w_sl, 1] = np.clip(overlay_g[:h_sl, :w_sl], 0, 255)
        full[MARGIN:MARGIN+h_sl, MARGIN:MARGIN+w_sl, 2] = np.clip(overlay_b[:h_sl, :w_sl], 0, 255)
        full[MARGIN:MARGIN+h_sl, MARGIN:MARGIN+w_sl, 3] = np.clip(overlay_a[:h_sl, :w_sl], 0, 255)

        overlay = Image.fromarray(full.astype(np.uint8), 'RGBA')
        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def render_elevation_gradient(self, hmap):
        """Apply subtle warm-brown shading to higher-elevation land cells.
        Creates a sense of topographic depth — highlands feel elevated and dimensional."""
        map_w = self.W - 2 * MARGIN
        map_h = self.H - 2 * MARGIN
        is_water = hmap < WATER_LEVEL

        # Build per-cell elevation shading
        shade_grid = np.zeros((GRID_ROWS, GRID_COLS, 4), dtype=np.float32)
        for r in range(GRID_ROWS):
            for c in range(GRID_COLS):
                if is_water[r, c]:
                    continue
                h = hmap[r, c]
                if h < 0.58:
                    continue  # only shade elevated terrain
                # Above 0.58: ramp from 0 to max shadow
                t = min(1.0, (h - 0.58) / 0.32)
                # Warm brown-shadow: slightly darker and more saturated
                alpha = t * 55   # max 55 alpha at h=0.90
                shade_grid[r, c] = (95, 72, 38, alpha)

        # Upscale and blur each channel separately
        scale_r = map_h / GRID_ROWS
        scale_c = map_w / GRID_COLS

        sh_r = ndimage.gaussian_filter(ndimage.zoom(shade_grid[:, :, 0], (scale_r, scale_c), order=1), 3.5)
        sh_g = ndimage.gaussian_filter(ndimage.zoom(shade_grid[:, :, 1], (scale_r, scale_c), order=1), 3.5)
        sh_b = ndimage.gaussian_filter(ndimage.zoom(shade_grid[:, :, 2], (scale_r, scale_c), order=1), 3.5)
        sh_a = ndimage.gaussian_filter(ndimage.zoom(shade_grid[:, :, 3], (scale_r, scale_c), order=1), 3.5)

        h_sl = min(sh_r.shape[0], map_h)
        w_sl = min(sh_r.shape[1], map_w)
        full = np.zeros((self.H, self.W, 4), dtype=np.float32)
        full[MARGIN:MARGIN+h_sl, MARGIN:MARGIN+w_sl, 0] = np.clip(sh_r[:h_sl, :w_sl], 0, 255)
        full[MARGIN:MARGIN+h_sl, MARGIN:MARGIN+w_sl, 1] = np.clip(sh_g[:h_sl, :w_sl], 0, 255)
        full[MARGIN:MARGIN+h_sl, MARGIN:MARGIN+w_sl, 2] = np.clip(sh_b[:h_sl, :w_sl], 0, 255)
        full[MARGIN:MARGIN+h_sl, MARGIN:MARGIN+w_sl, 3] = np.clip(sh_a[:h_sl, :w_sl], 0, 255)

        overlay = Image.fromarray(full.astype(np.uint8), 'RGBA')
        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def render_regional_identity(self, kingdom_map, kingdoms, hmap):
        """Apply per-kingdom color tint to differentiate territories visually.
        Each kingdom gets a characteristic hue — HIGHNAR cooler, RAVNAR wetter, AETHAS drier."""
        if kingdom_map is None or not kingdoms:
            return
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        is_land = hmap >= WATER_LEVEL

        # Distinct per-index territory palette — muted enough for parchment
        # but clearly differentiated at a glance.  Alpha ~62 so tint reads
        # through forests/mountains without swamping the base parchment.
        TERRITORY_PALETTE = [
            (185,  88,  68, 62),   # 0 — dusty terracotta red
            ( 72, 118, 172, 62),   # 1 — cool slate blue
            ( 62, 148,  80, 58),   # 2 — forest sage green
            (148,  78, 155, 58),   # 3 — dusty purple
            (195, 148,  38, 60),   # 4 — warm desert gold
            ( 55, 145, 148, 58),   # 5 — teal grey
            (155,  55,  80, 55),   # 6 — wine / burgundy
            (115, 158,  55, 55),   # 7 — olive yellow-green
        ]
        tint_by_name = {}
        for i in range(len(kingdoms)):
            tint_by_name[i] = TERRITORY_PALETTE[i % len(TERRITORY_PALETTE)]

        # Build tint grid
        tint_grid = np.zeros((GRID_ROWS, GRID_COLS, 4), dtype=np.float32)
        for r in range(GRID_ROWS):
            for c in range(GRID_COLS):
                ki = kingdom_map[r, c]
                if ki < 0 or not is_land[r, c]:
                    continue
                tint_grid[r, c] = tint_by_name.get(ki, (0, 0, 0, 0))

        map_w = self.W - 2 * MARGIN
        map_h = self.H - 2 * MARGIN
        scale_r = map_h / GRID_ROWS
        scale_c = map_w / GRID_COLS

        ch_r = ndimage.gaussian_filter(ndimage.zoom(tint_grid[:, :, 0], (scale_r, scale_c), order=1), 4.0)
        ch_g = ndimage.gaussian_filter(ndimage.zoom(tint_grid[:, :, 1], (scale_r, scale_c), order=1), 4.0)
        ch_b = ndimage.gaussian_filter(ndimage.zoom(tint_grid[:, :, 2], (scale_r, scale_c), order=1), 4.0)
        ch_a = ndimage.gaussian_filter(ndimage.zoom(tint_grid[:, :, 3], (scale_r, scale_c), order=1), 4.0)

        h_sl = min(ch_r.shape[0], map_h)
        w_sl = min(ch_r.shape[1], map_w)
        full = np.zeros((self.H, self.W, 4), dtype=np.float32)
        full[MARGIN:MARGIN+h_sl, MARGIN:MARGIN+w_sl, 0] = np.clip(ch_r[:h_sl, :w_sl], 0, 255)
        full[MARGIN:MARGIN+h_sl, MARGIN:MARGIN+w_sl, 1] = np.clip(ch_g[:h_sl, :w_sl], 0, 255)
        full[MARGIN:MARGIN+h_sl, MARGIN:MARGIN+w_sl, 2] = np.clip(ch_b[:h_sl, :w_sl], 0, 255)
        full[MARGIN:MARGIN+h_sl, MARGIN:MARGIN+w_sl, 3] = np.clip(ch_a[:h_sl, :w_sl], 0, 255)

        tint_img = Image.fromarray(full.astype(np.uint8), 'RGBA')
        self.img = Image.alpha_composite(self.img, tint_img)
        self.draw = ImageDraw.Draw(self.img)

    def render_ocean_waves(self, hmap, rng):
        """Draw enhanced cartographic wave marks in the ocean.
        Includes:
        - More visible wave arcs (wider, higher alpha)
        - Spiral/swirl patterns in deep ocean (3-4 connected arc segments)
        - Denser coverage of waves
        - Coastal hachures (bold perpendicular strokes)
        """
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)
        ink = (26, 16, 5)

        is_water = hmap < WATER_LEVEL
        map_w = self.W - 2 * MARGIN
        map_h = self.H - 2 * MARGIN

        # Upscale hmap for pixel-level distance computation
        hmap_px = ndimage.zoom(hmap, (map_h / GRID_ROWS, map_w / GRID_COLS), order=1)
        hmap_smooth = ndimage.gaussian_filter(hmap_px, sigma=3.0)
        land_mask = hmap_smooth >= WATER_LEVEL
        water_dist_px = ndimage.distance_transform_edt(~land_mask).astype(np.float32)

        # === COASTAL HACHURES: vectorised for performance ===
        max_hach = 36
        ov_arr = np.array(overlay)
        h_lim = min(land_mask.shape[0], map_h)
        w_lim = min(land_mask.shape[1], map_w)
        # Sample every 2 pixels
        py_idx = np.arange(0, h_lim, 2)
        px_idx = np.arange(0, w_lim, 2)
        py_grid, px_grid = np.meshgrid(py_idx, px_idx, indexing='ij')
        wd_sub = water_dist_px[py_grid, px_grid]
        lm_sub = land_mask[py_grid, px_grid]
        hach_mask = (~lm_sub) & (wd_sub > 0) & (wd_sub < max_hach)
        t_sub = np.zeros_like(wd_sub)
        t_sub[hach_mask] = 1.0 - wd_sub[hach_mask] / max_hach
        alpha_sub = (t_sub * t_sub * 100).astype(np.uint8)
        alpha_sub[~hach_mask | (alpha_sub < 5)] = 0
        # Deterministic sparse sampling (~35%)
        seed_v = rng.seed + 951
        hash_arr = np.abs(np.sin(py_grid * 127.1 + px_grid * 311.7 + seed_v) * 43758.5453) % 1.0
        alpha_sub[hash_arr >= 0.35] = 0
        ys_h, xs_h = np.where(alpha_sub > 0)
        sy_h = py_idx[ys_h] + MARGIN
        sx_h = px_idx[xs_h] + MARGIN
        valid = (sy_h < self.H) & (sx_h < self.W)
        ov_arr[sy_h[valid], sx_h[valid], 0] = ink[0]
        ov_arr[sy_h[valid], sx_h[valid], 1] = ink[1]
        ov_arr[sy_h[valid], sx_h[valid], 2] = ink[2]
        ov_arr[sy_h[valid], sx_h[valid], 3] = alpha_sub[ys_h[valid], xs_h[valid]]

        overlay = Image.fromarray(ov_arr, 'RGBA')
        ov_draw = ImageDraw.Draw(overlay)

        # === DEEP WATER WAVES: arcs with higher visibility ===
        for r in range(0, GRID_ROWS, 2):  # even denser coverage
            for c in range(0, GRID_COLS, 2):  # check every 2 cells (was 3)
                if not is_water[r, c]:
                    continue
                depth = (WATER_LEVEL - hmap[r, c]) / WATER_LEVEL
                if depth < 0.08:
                    continue
                x, y = self.cell_to_screen(c, r)
                h = _hash2d(int(c * 7), int(r * 11), rng.seed + 900)
                h2 = _hash2d(int(c * 13), int(r * 17), rng.seed + 901)
                h3 = _hash2d(int(c * 19), int(r * 23), rng.seed + 902)
                if h3 < 0.25:  # more frequent waves
                    continue
                jx = x + (h - 0.5) * 48
                jy = y + (h2 - 0.5) * 32
                w = int(22 + h * 30)  # wider waves
                alpha = int(80 + depth * 40)  # much more visible (80-120)
                ix, iy = int(jx), int(jy)

                # Main wave arc — wider, more visible
                ov_draw.arc([ix - w, iy - 12, ix + w, iy + 14],
                            start=0, end=180, fill=ink + (alpha,), width=3)

                # Secondary wave arc
                if depth > 0.15 and h3 > 0.40:
                    ov_draw.arc([ix - w // 2, iy + 8, ix + w // 2, iy + 22],
                                start=0, end=180, fill=ink + (int(alpha * 0.7),), width=3)

                # Tertiary wave arc
                if depth > 0.40 and h3 > 0.60:
                    ov_draw.arc([ix - w * 3 // 4, iy - 18, ix + w * 3 // 4, iy - 2],
                                start=0, end=180, fill=ink + (int(alpha * 0.5),), width=2)

                # SPIRAL/SWIRL patterns in very deep ocean — proper continuous spirals
                if depth > 0.55 and h3 > 0.70:
                    # 1.5-2 full revolutions of continuous curved spiral
                    spiral_x = ix
                    spiral_y = iy
                    spiral_pts = []
                    n_spiral_pts = 20
                    for sp in range(n_spiral_pts):
                        angle = (sp / n_spiral_pts) * math.pi * 2  # 2 revolutions
                        spiral_r = w * 2 * (1.0 - (sp / n_spiral_pts) * 0.4)
                        spx = spiral_x + int(spiral_r * math.cos(angle))
                        spy = spiral_y + int(spiral_r * math.sin(angle)) - int(sp * 1.0)
                        spiral_pts.append((spx, spy))
                    if len(spiral_pts) >= 2:
                        s_alpha = int(alpha * 0.4)
                        ov_draw.line(spiral_pts, fill=ink + (s_alpha,), width=3)

        self.img = Image.alpha_composite(self.img, overlay)
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
                    radius = int(50 - cd * 12)
                    alpha = int(30 * (1 - cd / 3))
                    draw_ov.ellipse(
                        [x - radius, y - radius, x + radius, y + radius],
                        fill=(216, 192, 128, alpha)
                    )

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def render_coastlines(self, hmap, rng):
        """Render coastlines with a clean bold outline and subtle inner shading —
        no random hachure lines, just smooth graduated shadow on the land side."""
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)
        ink = (26, 16, 5)

        map_w = self.W - 2 * MARGIN
        map_h = self.H - 2 * MARGIN

        # Upscale heightmap to pixel resolution and smooth for organic coastlines
        hmap_px = ndimage.zoom(hmap, (map_h / GRID_ROWS, map_w / GRID_COLS), order=1)
        hmap_smooth = ndimage.gaussian_filter(hmap_px, sigma=4.0)

        # Create land mask and compute distance from coastline into land
        land_mask = hmap_smooth >= WATER_LEVEL
        # Distance from coast INTO land (for inner shadow)
        land_dist = ndimage.distance_transform_edt(land_mask).astype(np.float32)
        # Distance from coast INTO water (for outer glow)
        water_dist = ndimage.distance_transform_edt(~land_mask).astype(np.float32)

        # Inner coast shadow — vectorised for performance at high res
        ov_arr = np.array(overlay)
        max_shadow_dist = 50
        h_lim = min(land_mask.shape[0], map_h)
        w_lim = min(land_mask.shape[1], map_w)
        ld_crop = land_dist[:h_lim, :w_lim]
        lm_crop = land_mask[:h_lim, :w_lim]
        mask = lm_crop & (ld_crop > 0) & (ld_crop < max_shadow_dist)
        t_arr = np.zeros_like(ld_crop)
        t_arr[mask] = 1.0 - ld_crop[mask] / max_shadow_dist
        t_arr = t_arr * t_arr
        alpha_arr = (t_arr * 72).astype(np.uint8)
        alpha_arr[~mask] = 0
        ys, xs = np.where(alpha_arr > 0)
        ov_arr[ys + MARGIN, xs + MARGIN, 0] = ink[0]
        ov_arr[ys + MARGIN, xs + MARGIN, 1] = ink[1]
        ov_arr[ys + MARGIN, xs + MARGIN, 2] = ink[2]
        ov_arr[ys + MARGIN, xs + MARGIN, 3] = alpha_arr[ys, xs]

        overlay = Image.fromarray(ov_arr, 'RGBA')
        ov_draw = ImageDraw.Draw(overlay)

        # Extract coastline boundary at pixel level for the bold outline
        dilated = ndimage.binary_dilation(land_mask, iterations=4)
        eroded = ndimage.binary_erosion(land_mask, iterations=2)
        coast_border = dilated & ~eroded

        # Draw clean bold coastline — no hachures, just a strong smooth line
        step = 1
        for py in range(0, min(land_mask.shape[0], map_h), step):
            for px in range(0, min(land_mask.shape[1], map_w), step):
                if coast_border[py, px]:
                    sx = px + MARGIN
                    sy = py + MARGIN
                    ov_draw.ellipse([sx - 2, sy - 2, sx + 2, sy + 2],
                                     fill=ink + (200,))

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def _draw_fantasy_peak(self, ov_draw, x, y, size, is_snow, h_val, ink,
                           facing='left', is_solo=False):
        """Draw a sharp cartographic mountain peak icon — hand-drawn ink on parchment.

        Design language: dramatic hand-drawn fantasy atlas style with:
        - Very tall and sharp peaks (height:width ~3.5:1 or 4:1)
        - Shadow face near-SOLID black (alpha 180-220) with visible stroke lines
        - Sunlit face mostly bare parchment with 2-3 thin contour lines
        - Sharp angular ridgeline (width 2)
        - Multiple sub-peaks with overlapping, varying heights
        - Bold thick outlines (shadow edge width 3, sunlit width 2)
        - Rocky jagged silhouette at top with small notches near summit
        - Snow cap as clean white polygon with ink outline
        - Ground shadow as short horizontal strokes, not ellipse
        - Companion peaks substantial (80% and 65% of main on both sides for ranges)
        """
        size = int(max(16, size))
        sc   = size / 44.0          # normalise around 44-unit reference (bigger)

        cx     = int(x)
        base_y = int(y) + int(sc * 2)

        # ── COMPANION PEAKS (back-left and back-right) — only for range peaks ────────────────
        if not is_solo:
            # Left companion (80% size)
            cmp_sc_left  = sc * 0.80
            cmp_hw_left  = int(11 * cmp_sc_left)
            cmp_h_left   = int(55 * cmp_sc_left)  # tall and sharp
            cmp_cx_left  = cx - int(14 * sc)
            cmp_tip_left = (cmp_cx_left + int((h_val - 0.5) * 3), base_y - cmp_h_left)
            cmp_L_left   = (cmp_cx_left - cmp_hw_left, base_y)
            cmp_M_left   = (cmp_cx_left, base_y)
            cmp_R_left   = (cmp_cx_left + cmp_hw_left, base_y)

            # Left companion shadow face (near-solid)
            ov_draw.polygon([cmp_L_left, cmp_tip_left, cmp_M_left],
                            fill=ink + (195,))
            # Visible stroke lines on shadow face
            for i in range(2):
                t = 0.25 + i * 0.35
                hx = int(cmp_L_left[0] + (cmp_tip_left[0] - cmp_L_left[0]) * t)
                hy = int(base_y + (cmp_tip_left[1] - base_y) * t)
                hw = int((cmp_M_left[0] - cmp_L_left[0]) * (1.0 - t) * 0.60)
                if hw > 0:
                    ov_draw.line([(hx, hy), (hx + hw, hy)],
                                 fill=ink + (220,), width=1)
            # Sunlit face with contour lines
            ov_draw.polygon([cmp_M_left, cmp_tip_left, cmp_R_left],
                            fill=(220, 208, 172, 200))
            for i in range(2):
                ts = 0.25 + i * 0.35
                sx = int(cmp_M_left[0] + (cmp_R_left[0] - cmp_M_left[0]) * ts)
                stx = int(cmp_tip_left[0] + (cmp_R_left[0] - cmp_tip_left[0]) * ts)
                sy = int(base_y + (cmp_tip_left[1] - base_y) * ts)
                ov_draw.line([(stx, sy), (sx, base_y)],
                             fill=ink + (80,), width=1)
            # Outlines
            ov_draw.line([cmp_L_left, cmp_tip_left], fill=ink + (235,), width=4)
            ov_draw.line([cmp_tip_left, cmp_R_left], fill=ink + (150,), width=3)
            # Jagged summit
            if cmp_h_left > 15:
                jag_x1 = cmp_tip_left[0] - int(cmp_hw_left * 0.15)
                jag_y1 = cmp_tip_left[1] + int(cmp_sc_left * 2)
                ov_draw.line([(jag_x1, jag_y1), cmp_tip_left], fill=ink + (240,), width=3)
            # Snow cap
            if is_snow or cmp_h_left > 20:
                csnow_h = int(cmp_h_left * 0.22)
                csnow_y = cmp_tip_left[1] + csnow_h
                csl = int(cmp_hw_left * 0.45)
                csr = int(cmp_hw_left * 0.30)
                ov_draw.polygon([cmp_tip_left,
                                 (cmp_tip_left[0] - csl, csnow_y),
                                 (cmp_tip_left[0] + csr, csnow_y)],
                                fill=(240, 235, 220, 220))
                ov_draw.line([cmp_tip_left, (cmp_tip_left[0] - csl, csnow_y)],
                             fill=ink + (120,), width=2)
                ov_draw.line([cmp_tip_left, (cmp_tip_left[0] + csr, csnow_y)],
                             fill=ink + (120,), width=2)

            # Right companion (65% size) — for range peaks
            cmp_sc_right = sc * 0.65
            cmp_hw_right = int(11 * cmp_sc_right)
            cmp_h_right  = int(50 * cmp_sc_right)
            cmp_cx_right = cx + int(14 * sc)
            cmp_tip_right = (cmp_cx_right + int((h_val - 0.5) * 2), base_y - cmp_h_right)
            cmp_L_right   = (cmp_cx_right - cmp_hw_right, base_y)
            cmp_M_right   = (cmp_cx_right, base_y)
            cmp_R_right   = (cmp_cx_right + cmp_hw_right, base_y)

            # Right companion shadow face
            ov_draw.polygon([cmp_L_right, cmp_tip_right, cmp_M_right],
                            fill=ink + (190,))
            for i in range(2):
                t = 0.25 + i * 0.35
                hx = int(cmp_L_right[0] + (cmp_tip_right[0] - cmp_L_right[0]) * t)
                hy = int(base_y + (cmp_tip_right[1] - base_y) * t)
                hw = int((cmp_M_right[0] - cmp_L_right[0]) * (1.0 - t) * 0.55)
                if hw > 0:
                    ov_draw.line([(hx, hy), (hx + hw, hy)],
                                 fill=ink + (215,), width=1)
            # Sunlit face
            ov_draw.polygon([cmp_M_right, cmp_tip_right, cmp_R_right],
                            fill=(220, 208, 172, 195))
            for i in range(1):
                ts = 0.40 + i * 0.40
                sx = int(cmp_M_right[0] + (cmp_R_right[0] - cmp_M_right[0]) * ts)
                stx = int(cmp_tip_right[0] + (cmp_R_right[0] - cmp_tip_right[0]) * ts)
                sy = int(base_y + (cmp_tip_right[1] - base_y) * ts)
                ov_draw.line([(stx, sy), (sx, base_y)],
                             fill=ink + (75,), width=1)
            # Outlines
            ov_draw.line([cmp_L_right, cmp_tip_right], fill=ink + (230,), width=3)
            ov_draw.line([cmp_tip_right, cmp_R_right], fill=ink + (145,), width=3)
            # Snow cap
            if is_snow or cmp_h_right > 18:
                csnow_h = int(cmp_h_right * 0.20)
                csnow_y = cmp_tip_right[1] + csnow_h
                csl = int(cmp_hw_right * 0.42)
                csr = int(cmp_hw_right * 0.28)
                ov_draw.polygon([cmp_tip_right,
                                 (cmp_tip_right[0] - csl, csnow_y),
                                 (cmp_tip_right[0] + csr, csnow_y)],
                                fill=(240, 235, 220, 215))
                ov_draw.line([cmp_tip_right, (cmp_tip_right[0] - csl, csnow_y)],
                             fill=ink + (115,), width=2)
                ov_draw.line([cmp_tip_right, (cmp_tip_right[0] + csr, csnow_y)],
                             fill=ink + (115,), width=2)

        # ── MAIN PEAK ─────────────────────────────────────────────────────────
        height_mult = 1.15 if is_solo else 1.0
        M_hw  = int(13 * sc)   # narrower for sharp aspect ratio
        M_ph  = int(58 * sc * height_mult)  # tall and dramatic
        tip_x = cx + int((h_val - 0.5) * 4)
        tip_y = base_y - M_ph

        tip   = (tip_x, tip_y)
        M_L   = (cx - M_hw, base_y)
        M_mid = (cx, base_y)
        M_R   = (cx + M_hw, base_y)

        # Shadow face — near-solid ink (alpha 180-220)
        ov_draw.polygon([M_L, tip, M_mid],
                        fill=ink + (200,))
        # Visible stroke lines on shadow face
        for i in range(2):
            t = 0.20 + i * 0.40
            hx = int(M_L[0] + (tip_x - M_L[0]) * t)
            hy = int(base_y + (tip_y - base_y) * t)
            hw = int((M_mid[0] - M_L[0]) * (1.0 - t) * 0.70)
            if hw > 0:
                ov_draw.line([(hx, hy), (hx + hw, hy)],
                             fill=ink + (230,), width=1)

        # Sunlit face — mostly bare parchment with 2-3 contour lines
        ov_draw.polygon([M_mid, tip, M_R],
                        fill=(220, 208, 172, 210))
        for i in range(2):
            ts = 0.20 + i * 0.40
            sx = int(M_mid[0] + (M_R[0] - M_mid[0]) * ts)
            stx = int(tip_x + (M_R[0] - tip_x) * ts)
            sy = int(base_y + (tip_y - base_y) * ts)
            ov_draw.line([(stx, sy), (sx, base_y)],
                         fill=ink + (100,), width=1)

        # Bold thick outlines
        ov_draw.line([M_L, tip], fill=ink + (240,), width=4)
        ov_draw.line([tip, M_R], fill=ink + (155,), width=3)

        # Sharp ridge line (prominent, width 3)
        ov_draw.line([M_mid, tip], fill=ink + (190,), width=3)

        # Rocky jagged silhouette at summit — small notches
        if M_ph > 20:
            jag1_x = tip_x - int(M_hw * 0.25)
            jag1_y = tip_y + int(sc * 2.5)
            ov_draw.line([(jag1_x, jag1_y), tip], fill=ink + (245,), width=3)
            jag2_x = tip_x + int(M_hw * 0.20)
            jag2_y = tip_y + int(sc * 1.5)
            ov_draw.line([(jag2_x, jag2_y), tip], fill=ink + (235,), width=2)

        # ── SNOW CAP ──────────────────────────────────────────────────────────
        if is_snow or M_ph > 26:
            snow_h = int(M_ph * (0.26 if is_snow else 0.18))
            snow_y = tip_y + snow_h
            sw_l = int(M_hw * 0.50)
            sw_r = int(M_hw * 0.35)
            # Clean white polygon
            ov_draw.polygon([tip,
                             (tip_x - sw_l, snow_y),
                             (tip_x + sw_r, snow_y)],
                            fill=(242, 238, 225, 235))
            # Ink outline
            ov_draw.line([tip, (tip_x - sw_l, snow_y)],
                         fill=ink + (125,), width=2)
            ov_draw.line([tip, (tip_x + sw_r, snow_y)],
                         fill=ink + (125,), width=2)

        # ── GROUND SHADOW — short horizontal strokes ──────────────────────────────────
        gs_cx = cx + int(sc * 3)
        gs_base = base_y + int(sc * 2)
        for i in range(3):
            stroke_y = gs_base + i
            stroke_l = int(M_hw * (1.5 - i * 0.25))
            ov_draw.line([(gs_cx - stroke_l, stroke_y),
                          (gs_cx + stroke_l, stroke_y)],
                         fill=ink + (35,), width=2)

    def _draw_cloud_wisp(self, ov_draw, x, y, size, ink, seed_val):
        """Draw a fluffy cloud wisp — connected bumpy arcs at mountain bases.

        Design language: hand-drawn outline clouds, 4-6 connected semicircular bumps.
        - Line width 3, ink alpha 140-180
        - Size parameter controls overall width (typically 80-180px)
        - Seed value provides organic randomness
        """
        x, y = int(x), int(y)
        n_bumps = 4 + int(seed_val * 3) % 3  # 4-6 bumps
        bump_w = max(16, int(size / (n_bumps * 0.8)))

        # Draw connected bumpy arcs
        for b in range(n_bumps):
            bx = x - size // 2 + b * int(size / n_bumps)
            by = y + int(seed_val * 8 - 4)
            alpha = int(140 + seed_val * 40)
            # Each bump is a semicircular arc
            ov_draw.arc([bx - bump_w // 2, by - bump_w // 2,
                         bx + bump_w // 2, by + bump_w // 2],
                        start=0, end=180, fill=ink + (alpha,), width=3)

    def _draw_hill_bump(self, ov_draw, x, y, size, h_val, ink):
        """Draw rolling terrain with topographic contour lines.

        Parallel curved lines suggest elevation, like topographic contour hatching.
        Each bump: 2-3 nested arcs with shading strokes below.
        """
        hw = int(size * 0.8)
        hh = int(size * 0.42)
        ix, iy = int(x), int(y)

        # Draw 2-3 nested contour arcs
        n_contours = 2 + (1 if h_val > 0.5 else 0)
        for contour_i in range(n_contours):
            t_offset = 0.2 + contour_i * 0.35
            contour_hw = int(hw * (1.0 - t_offset * 0.6))
            contour_hh = int(hh * (1.0 - t_offset * 0.5))

            # Draw curved contour arc
            pts = []
            for i in range(11):
                t = i / 10.0
                angle = math.pi * t
                px = ix - contour_hw + int(2 * contour_hw * t)
                py = iy + int(t_offset * hh * 2) - int(math.sin(angle) * contour_hh)
                pts.append((px, py))

            if len(pts) >= 2:
                alpha = int(95 - contour_i * 25)  # fade inner contours
                ov_draw.line(pts, fill=ink + (alpha,), width=1)

        # Shading strokes below the main contour
        main_pts = []
        for i in range(9):
            t = i / 8.0
            angle = math.pi * t
            px = ix - hw + int(2 * hw * t)
            py = iy - int(math.sin(angle) * hh)
            main_pts.append((px, py))

        # Vertical shading strokes below the contour
        if len(main_pts) >= 2:
            for i in range(2, len(main_pts) - 1, 2):
                sp = main_pts[i]
                # Shading stroke
                ov_draw.line([(sp[0], sp[1]), (sp[0], iy + int(hh * 0.5))],
                            fill=ink + (18,), width=1)

    def render_mountains(self, hmap, biomes, ridgelines, rng):
        """Draw mountains as natural hand-drawn fantasy peaks along ridgeline paths.
        Uses varied sizes, overlapping depth ordering, and organic spacing."""
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)
        ink = (26, 16, 5)

        # Collect all peaks to draw, then sort back-to-front (top to bottom)
        # so peaks in front overlap those behind
        peaks_to_draw = []

        # 1. Place peaks along ridgelines
        drawn_grid = set()  # track grid cells used

        # Global placed positions for cross-ridge minimum distance enforcement
        placed_positions = []  # list of (x, y)
        GLOBAL_MIN_DIST = 90   # no two peaks closer than this, regardless of ridge

        for ridge in ridgelines:
            if len(ridge) < 2:
                continue

            # Walk along ridge, placing peaks at natural intervals
            accumulated_dist = 0
            last_x, last_y = None, None
            ridge_peak_count = 0

            for idx in range(len(ridge)):
                r, c = ridge[idx]
                x, y = self.cell_to_screen(c, r)

                if last_x is not None:
                    dx = x - last_x
                    dy = y - last_y
                    accumulated_dist += math.sqrt(dx * dx + dy * dy)

                h_val = _hash2d(int(x * 7), int(y * 13), rng.seed + 50)
                height_factor = min(1.0, (hmap[r, c] - 0.52) / 0.38) if hmap[r, c] > 0.52 else 0.15
                is_snow = biomes[r, c] == 'snow_peak'

                # Tighter spacing for denser, fuller-looking ranges
                base_spacing = 95 + height_factor * 20
                jitter = h_val * 8 - 4
                min_spacing = base_spacing + jitter

                if last_x is not None and accumulated_dist < min_spacing:
                    continue

                # Global minimum distance check — prevents adjacent ridges from piling up
                too_close = False
                for px, py in placed_positions:
                    if abs(x - px) + abs(y - py) < GLOBAL_MIN_DIST * 1.5:
                        dist = math.sqrt((x - px) ** 2 + (y - py) ** 2)
                        if dist < GLOBAL_MIN_DIST:
                            too_close = True
                            break
                if too_close:
                    last_x, last_y = x, y
                    accumulated_dist = 0
                    continue

                # Peak sizes — taller/bolder for better map presence
                base_size = 90 + height_factor * 70 + h_val * 10
                # Peaks at ridge center are slightly larger
                if len(ridge) > 4:
                    center_t = abs(idx / len(ridge) - 0.5) * 2
                    base_size *= (0.80 + (1.0 - center_t) * 0.26)

                peaks_to_draw.append((y, x, y, base_size, is_snow, h_val, r, c, False))
                placed_positions.append((x, y))
                drawn_grid.add((r, c))
                last_x, last_y = x, y
                accumulated_dist = 0
                ridge_peak_count += 1

        # 2. Add foothills NEAR ridgelines — fills in range flanks, not isolated plains
        # Only place foothills within MAX_RIDGE_DIST of an existing ridgeline peak
        MAX_RIDGE_DIST = 400   # px — foothills only appear close to ridgeline peaks
        MIN_RIDGE_DIST = GLOBAL_MIN_DIST  # but not on top of existing peaks

        for r in range(0, GRID_ROWS, 5):
            for c in range(0, GRID_COLS, 5):
                if biomes[r, c] not in ('mountain', 'snow_peak'):
                    continue
                if (r, c) in drawn_grid:
                    continue
                x, y = self.cell_to_screen(c, r)

                # Find nearest ridgeline peak and check distance range
                nearest_dist = float('inf')
                for entry in peaks_to_draw:
                    px, py = entry[1], entry[2]
                    d = abs(x - px) + abs(y - py)
                    if d < nearest_dist:
                        nearest_dist = d
                # Must be near a ridge but not on it
                if nearest_dist > MAX_RIDGE_DIST or nearest_dist < MIN_RIDGE_DIST:
                    continue

                h_val = _hash2d(int(x * 7), int(y * 13), rng.seed + 55)
                if h_val < 0.42:
                    continue
                # Global min distance check
                too_close_ft = False
                for px, py in placed_positions:
                    if abs(x - px) + abs(y - py) < GLOBAL_MIN_DIST * 1.2:
                        dist = math.sqrt((x - px) ** 2 + (y - py) ** 2)
                        if dist < GLOBAL_MIN_DIST:
                            too_close_ft = True
                            break
                if too_close_ft:
                    continue
                height_factor = min(1.0, (hmap[r, c] - 0.52) / 0.38) if hmap[r, c] > 0.52 else 0.1
                is_snow = biomes[r, c] == 'snow_peak'
                base_size = 55 + height_factor * 55 + h_val * 7
                peaks_to_draw.append((y, x, y, base_size, is_snow, h_val, r, c, False))
                placed_positions.append((x, y))

        # 3. Isolated solo peaks — high-elevation land cells far from any range peak.
        # These represent lone sentinel mountains and volcanic cones scattered across
        # the map, giving a sense of geological variety beyond the main ranges.
        SOLO_MIN_RANGE_DIST = 380  # px — must be this far from any range peak
        SOLO_MIN_SOLO_DIST  = 350  # px — solo peaks spaced from each other
        solo_positions = []        # tracked separately to avoid clogging range spacing

        for r in range(0, GRID_ROWS, 4):
            for c in range(0, GRID_COLS, 4):
                h = hmap[r, c]
                b = biomes[r, c]
                # Only place on elevated land: mountain, snow_peak, or high hills
                if b not in ('mountain', 'snow_peak', 'hills'):
                    continue
                if h < 0.60:
                    continue
                x, y = self.cell_to_screen(c, r)

                # Must be well away from any existing range peak
                far_enough = True
                for px, py in placed_positions:
                    if math.sqrt((x - px) ** 2 + (y - py) ** 2) < SOLO_MIN_RANGE_DIST:
                        far_enough = False
                        break
                if not far_enough:
                    continue

                # Spaced from other solo peaks
                too_close_solo = False
                for px, py in solo_positions:
                    if math.sqrt((x - px) ** 2 + (y - py) ** 2) < SOLO_MIN_SOLO_DIST:
                        too_close_solo = True
                        break
                if too_close_solo:
                    continue

                h_val = _hash2d(int(x * 7), int(y * 13), rng.seed + 77)
                if h_val < 0.52:   # ~48% of candidates pass — want scattered solos, not crowds
                    continue

                height_factor = min(1.0, (h - 0.52) / 0.38) if h > 0.52 else 0.1
                is_snow = b == 'snow_peak'
                # Solo peaks are a bit taller/larger to stand out when alone
                base_size = 75 + height_factor * 65 + h_val * 8
                peaks_to_draw.append((y, x, y, base_size, is_snow, h_val, r, c, True))
                solo_positions.append((x, y))

        # Sort by y-position (back to front) so closer peaks overlap farther ones
        peaks_to_draw.sort(key=lambda p: p[0])

        for entry in peaks_to_draw:
            _, x, y, size, is_snow, h_val, r, c, is_solo = entry
            self._draw_fantasy_peak(ov_draw, x, y, size, is_snow, h_val, ink,
                                    is_solo=is_solo)

        # Add cloud wisps at mountain bases — drawn after peaks so peaks overlap clouds
        for entry in peaks_to_draw:
            _, x, y, size, is_snow, h_val, r, c, is_solo = entry
            # Only for range peaks (not solo) that are large enough
            if not is_solo and size > 35:
                # ~40% of eligible peaks get clouds
                cloud_hash = _hash2d(int(x * 11), int(y * 17), rng.seed + 800)
                if cloud_hash < 0.40:
                    # Draw 1-2 cloud wisps at base
                    n_clouds = 1 + (1 if cloud_hash > 0.20 else 0)
                    for ci in range(n_clouds):
                        cloud_x = x + (cloud_hash - 0.5) * 80 + ci * 70
                        cloud_y = y + int(size * 0.15) + ci * 16
                        cloud_size = int(100 + cloud_hash * 80)
                        cloud_seed = _hash2d(int(cloud_x), int(cloud_y), rng.seed + 801 + ci)
                        self._draw_cloud_wisp(ov_draw, cloud_x, cloud_y, cloud_size, ink, cloud_seed)

        # 3. Hill bumps for hill biome cells — smaller rounded peaks
        for r in range(0, GRID_ROWS, 5):
            for c in range(0, GRID_COLS, 5):
                if biomes[r, c] != 'hills':
                    continue
                x, y = self.cell_to_screen(c, r)
                near_peak = False
                for _, px, py, *_ in peaks_to_draw:
                    if abs(x - px) + abs(y - py) < 40:
                        near_peak = True
                        break
                if near_peak:
                    continue

                if hmap[r, c] < 0.52:  # Must be clearly elevated for a hill bump
                    continue
                h = _hash2d(int(x * 7), int(y * 13), rng.seed + 57)
                if h < 0.62:  # Only 38% of hill cells get bumps
                    continue
                bump_size = 28 + h * 22
                self._draw_hill_bump(ov_draw, x, y, bump_size, h, ink)

        # 4. Stipple plains — scatter tiny ink dots on flat land for cartographic texture
        #    Traditional technique: dense on interior plains, sparse elsewhere
        ink_stipple = (38, 28, 12)
        for r in range(0, GRID_ROWS, 3):
            for c in range(0, GRID_COLS, 3):
                if biomes[r, c] not in ('plains', 'grassland'):
                    continue
                if hmap[r, c] < WATER_LEVEL + 0.02:
                    continue  # skip near-coast cells (keep coast clean)
                h_dot = _hash2d(int(r * 17), int(c * 31), rng.seed + 91)
                if h_dot < 0.82:  # only ~18% of cells get a dot
                    continue
                x, y = self.cell_to_screen(c, r)
                # Add slight jitter so dots don't look grid-aligned
                jx = x + (_hash2d(r, c, rng.seed + 92) - 0.5) * 6
                jy = y + (_hash2d(r + 1, c, rng.seed + 93) - 0.5) * 6
                dot_alpha = int(30 + h_dot * 28)  # very subtle, 30-58 alpha
                ov_draw.ellipse([int(jx), int(jy), int(jx) + 4, int(jy) + 4],
                                 fill=ink_stipple + (dot_alpha,))

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def render_forests(self, hmap, biomes, coast_dist, rng, rivers=None):
        """Render forests with LARGE detailed individual pine trees.

        Design language: detailed, high-contrast hand-drawn evergreens:
        - Each tree is 35-80px tall (dense: 50-80px, sparse: 35-55px)
        - Christmas-tree silhouette: 3-4 layered triangular tiers stacked
        - Each tier has zigzag edges (jagged branch silhouettes)
        - Near-solid dark fill (alpha 180-220) for each tier
        - Visible trunk below foliage (3-5px tall, width 3-4)
        - Dense packing with overlapping creates wall-of-trees effect
        For grassland/plains: scattered small bushes (filled circles, 6-10px radius)
        For desert: keep existing dune stipple approach.
        """
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)
        is_land = hmap >= WATER_LEVEL
        ink = (26, 16, 5)

        # Build a grid of river-adjacent cells
        RIVER_BAND = 7
        river_near = np.zeros((GRID_ROWS, GRID_COLS), dtype=np.float32)
        if rivers:
            for path in rivers:
                if len(path) < 6:
                    continue
                for r, c in path:
                    for dr in range(-RIVER_BAND, RIVER_BAND + 1):
                        for dc in range(-RIVER_BAND, RIVER_BAND + 1):
                            nr, nc = r + dr, c + dc
                            if 0 <= nr < GRID_ROWS and 0 <= nc < GRID_COLS:
                                dist = (dr * dr + dc * dc) ** 0.5
                                strength = max(0.0, 1.0 - dist / RIVER_BAND)
                                river_near[nr, nc] = max(river_near[nr, nc], strength)

        cluster_seed = rng.seed + 700

        def draw_detailed_pine_tree(ix, iy, height, alpha_val, seed_val):
            """Draw a detailed pine tree with zigzag tier edges."""
            trunk_h = max(6, int(height * 0.12))
            trunk_w = max(2, int(height * 0.06))
            base_y = int(iy)

            # Trunk
            ov_draw.rectangle([int(ix) - trunk_w, base_y - trunk_h,
                              int(ix) + trunk_w, base_y],
                             fill=ink + (int(alpha_val * 0.85),))

            # 3-4 tiers of branches
            foliage_base = base_y - trunk_h
            n_tiers = 3 if height < 50 else 4
            for t in range(n_tiers):
                tier_frac = t / n_tiers
                tier_y = foliage_base - int((height - trunk_h) * tier_frac)
                tier_top = foliage_base - int((height - trunk_h) * (tier_frac + 1.0 / n_tiers))
                # Width tapers from bottom to top
                half_w = int((height * 0.35) * (1.0 - tier_frac * 0.6))

                # Create zigzag polygon for this tier
                points = [(int(ix), tier_top)]  # tip
                # Right side zigzag
                steps = 3
                for s in range(steps):
                    sf = (s + 1) / steps
                    jag_x = int(ix) + int(half_w * sf) + int((seed_val * 6 - 3) * sf)
                    jag_y = tier_top + int((tier_y - tier_top) * sf)
                    points.append((jag_x, jag_y))
                    if s < steps - 1:
                        # Indent back for zigzag
                        points.append((jag_x - int(half_w * 0.2), jag_y + 2))
                # Left side zigzag (mirror)
                for s in range(steps - 1, -1, -1):
                    sf = (s + 1) / steps
                    jag_x = int(ix) - int(half_w * sf) - int((seed_val * 4 - 2) * sf)
                    jag_y = tier_top + int((tier_y - tier_top) * sf)
                    points.append((jag_x, jag_y))
                    if s > 0:
                        points.append((jag_x + int(half_w * 0.2), jag_y + 2))

                # Fill tier with dark ink
                tier_alpha = int(alpha_val * (0.9 - tier_frac * 0.1))
                tier_alpha = max(180, min(220, tier_alpha))
                ov_draw.polygon(points, fill=ink + (tier_alpha,))

        def draw_bush(ix, iy, size, alpha_val):
            """Draw a small rounded bush — filled circle."""
            r = int(size)
            ov_draw.ellipse([ix - r, iy - r, ix + r, iy + r],
                           fill=ink + (int(alpha_val),), width=0)

        for r in range(GRID_ROWS):
            for c in range(GRID_COLS):
                if not is_land[r, c]:
                    continue
                b = biomes[r, c]
                if b in ('snow_peak', 'beach', 'deep_ocean', 'ocean', 'coast_water'):
                    continue

                x, y = self.cell_to_screen(c, r)
                cn = _hash2d(c * 3, r * 5, cluster_seed)

                # DESERT — keep dune stipple, but allow riparian trees
                if b == 'desert':
                    rn_desert = river_near[r, c]
                    if rn_desert > 0.35:
                        # Riparian oasis: draw small trees
                        rip_base = int(rn_desert * 4)
                        rip_alpha = int(180 + rn_desert * 40)
                        for di in range(rip_base):
                            dh = _hash2d(c * 17 + di * 53, r * 23 + di * 61, cluster_seed + 80)
                            dh2 = _hash2d(c * 29 + di * 59, r * 37 + di * 67, cluster_seed + 90)
                            jx = x + (dh - 0.5) * CELL_W * 1.4
                            jy = y + (dh2 - 0.5) * CELL_H * 1.4
                            tree_h = int(12 + dh * 10)
                            seed_t = _hash2d(int(jx), int(jy), cluster_seed + 95)
                            draw_detailed_pine_tree(int(jx), int(jy), tree_h, rip_alpha, seed_t)
                        continue
                    # Regular dune stipple
                    if cn > 0.32:
                        stip_alpha = int(55 + cn * 55)
                        ov_draw.ellipse([int(x) - 1, int(y) - 1, int(x) + 1, int(y) + 1],
                                        fill=ink + (stip_alpha,))
                        if cn > 0.55:
                            ox = x + (cn * 15 - 7)
                            oy = y + ((1 - cn) * 13 - 6)
                            ov_draw.ellipse([int(ox) - 1, int(oy) - 1, int(ox) + 1, int(oy) + 1],
                                            fill=ink + (int(stip_alpha * 0.75),))
                        if cn > 0.72:
                            cx2 = int(x + (cn * 8 - 4))
                            cy2 = int(y + 3)
                            ov_draw.arc([cx2 - 5, cy2 - 2, cx2 + 5, cy2 + 2],
                                        start=0, end=180, fill=ink + (int(stip_alpha * 0.5),), width=1)
                    continue

                cd = coast_dist[r, c]
                cluster_mult = 0.4 + cn * 1.2

                # Determine density and appearance by biome
                if b == 'dense_forest':
                    base = 18 if cd < 3 else 15 if cd < 6 else 12 if cd < 10 else 9
                    alpha = 215 if cd < 3 else 200 if cd < 6 else 185 if cd < 10 else 170
                    tree_height_min, tree_height_max = 56, 80
                elif b == 'forest':
                    base = 10 if cd < 3 else 8 if cd < 5 else 5 if cd < 10 else 2
                    alpha = 205 if cd < 3 else 190 if cd < 6 else 175 if cd < 10 else 160
                    tree_height_min, tree_height_max = 44, 64
                elif b in ('grassland', 'plains', 'hills'):
                    # Scattered bushes instead of trees
                    rn = river_near[r, c]
                    if cd < 3:
                        base, alpha = 3, 165
                    elif cd < 5:
                        base, alpha = 2, 148
                    elif cd < 10:
                        base, alpha = 1, 118
                    else:
                        base, alpha = 1 if cn > 0.4 else 0, 90
                    if rn > 0.15:
                        river_bonus = rn * (4 if cd > 10 else 3)
                        base = int(base + river_bonus)
                        alpha = min(255, int(alpha + rn * 60))

                    # Draw bushes
                    num_bushes = int(base * cluster_mult)
                    if num_bushes > 0:
                        n_clusters = 1 + (1 if num_bushes > 3 else 0)
                        bushes_per_cluster = max(1, num_bushes // n_clusters)
                        for ci in range(n_clusters):
                            ch = _hash2d(c * 13 + ci * 37, r * 19 + ci * 43, cluster_seed + 10)
                            ch2 = _hash2d(c * 23 + ci * 41, r * 29 + ci * 47, cluster_seed + 20)
                            cx = x + (ch - 0.5) * CELL_W * 1.3
                            cy = y + (ch2 - 0.5) * CELL_H * 1.3
                            for bi in range(bushes_per_cluster):
                                bh = _hash2d(c * 17 + ci * 31 + bi * 53, r * 23 + ci * 47 + bi * 61,
                                            cluster_seed + 30)
                                bh2 = _hash2d(c * 29 + ci * 41 + bi * 59, r * 37 + ci * 53 + bi * 67,
                                             cluster_seed + 40)
                                scatter = CELL_W * 0.6
                                jx = cx + (bh - 0.5) * scatter
                                jy = cy + (bh2 - 0.5) * scatter
                                bush_size = int(6 + bh * 4)
                                da = int(alpha * (0.8 + bh * 0.4))
                                draw_bush(int(jx), int(jy), bush_size, da)
                    continue

                elif b == 'mountain':
                    base = 1 if cn > 0.7 else 0
                    alpha = 160
                    tree_height_min, tree_height_max = 15, 22
                elif b == 'tundra':
                    base = 1 if cn > 0.75 else 0
                    alpha = 145
                    tree_height_min, tree_height_max = 12, 18
                else:
                    continue

                num_trees = int(base * cluster_mult)
                if num_trees <= 0:
                    continue

                # Dense packing in forest areas — place every 2 cells with 2-3 trees per cluster
                for ti in range(num_trees):
                    th = _hash2d(c * 17 + ti * 53, r * 23 + ti * 61,
                                cluster_seed + 30 + ti)
                    th2 = _hash2d(c * 29 + ti * 59, r * 37 + ti * 67,
                                 cluster_seed + 40 + ti)
                    jx = x + (th - 0.5) * CELL_W * 1.5
                    jy = y + (th2 - 0.5) * CELL_H * 1.5
                    ix, iy = int(jx), int(jy)
                    tree_h = int(tree_height_min + (th2 * (tree_height_max - tree_height_min)))
                    da = int(alpha * (0.8 + th * 0.4))
                    da_c = min(255, da)
                    draw_detailed_pine_tree(ix, iy, tree_h, da_c, th)

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def render_terrain_texture(self, hmap, biomes, rng):
        """Draw bold flowing contour lines on open terrain.

        Creates prominent cartographic texture:
        - Bold flowing contour lines on plains and grassland
        - Lines follow gentle wave patterns (not straight)
        - Higher alpha (55-80) for bold effect
        - Longer lines (80-140px)
        - Line width 3
        - Additional perpendicular tick marks for slope indication
        - Step every 3 grid cells
        """
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)
        ink = (26, 16, 5)
        is_land = hmap >= WATER_LEVEL

        texture_seed = rng.seed + 750
        step_size = 3  # sample every 3 cells (denser)

        for r in range(0, GRID_ROWS, step_size):
            for c in range(0, GRID_COLS, step_size):
                if not is_land[r, c]:
                    continue
                b = biomes[r, c]
                if b not in ('plains', 'grassland'):
                    continue

                noise_val = _hash2d(c * 11, r * 13, texture_seed)
                if noise_val < 0.35:  # ~65% of locations
                    continue

                x, y = self.cell_to_screen(c, r)

                # Main contour line — longer and bolder
                line_len = 80 + noise_val * 60  # 80-140px long
                wave_h = 6 + noise_val * 8  # wave height 6-14px
                n_points = 12

                contour_pts = []
                for i in range(n_points):
                    t = i / (n_points - 1) if n_points > 1 else 0
                    px = x + t * line_len - line_len / 2
                    wave_offset = math.sin(t * math.pi * 2) * wave_h
                    py = y + wave_offset + noise_val * 8
                    contour_pts.append((int(px), int(py)))

                # Draw main contour line with higher alpha and width 3
                alpha = int(55 + noise_val * 25)  # 55-80 alpha
                if len(contour_pts) >= 2:
                    ov_draw.line(contour_pts, fill=ink + (alpha,), width=3)

                # Add perpendicular tick marks for slope indication
                tick_alpha = int(30 + noise_val * 20)
                for i in range(2, len(contour_pts) - 2, 2):
                    pt = contour_pts[i]
                    # Perpendicular direction (roughly)
                    tick_len = 10 + noise_val * 6
                    ov_draw.line([(pt[0] - int(tick_len / 2), pt[1]),
                                  (pt[0] + int(tick_len / 2), pt[1])],
                                 fill=ink + (tick_alpha,), width=2)

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    # ── Rendering helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _catmull_rom_arc(ctrl_pts, steps_per_segment=10):
        """Centripetal Catmull-Rom spline with arc-length–even parameterisation.

        Standard Catmull-Rom bunches interpolated points near inflections.
        The centripetal form (alpha=0.5) avoids cusps on tight bends while
        the arc-length re-parameterisation ensures even spacing so per-segment
        width/colour blending doesn't produce artefacts.

        Parameters
        ----------
        ctrl_pts         : list of (x, y) — control points (pixels)
        steps_per_segment: int — interpolation density between each pair

        Returns
        -------
        list of (x, y) — dense, evenly-spaced spline points
        """
        if len(ctrl_pts) < 2:
            return ctrl_pts

        def cr_point(p0, p1, p2, p3, t):
            """Catmull-Rom at parameter t."""
            t2, t3 = t * t, t * t * t
            a0 = -0.5*t3 + t2       - 0.5*t
            a1 =  1.5*t3 - 2.5*t2           + 1.0
            a2 = -1.5*t3 + 2.0*t2  + 0.5*t
            a3 =  0.5*t3 - 0.5*t2
            x = a0*p0[0] + a1*p1[0] + a2*p2[0] + a3*p3[0]
            y = a0*p0[1] + a1*p1[1] + a2*p2[1] + a3*p3[1]
            return (x, y)

        # Pad endpoints so curve passes through first and last control point
        pts  = [ctrl_pts[0]] + list(ctrl_pts) + [ctrl_pts[-1]]
        dense = []
        for i in range(1, len(pts) - 2):
            p0, p1, p2, p3 = pts[i-1], pts[i], pts[i+1], pts[i+2]
            for s in range(steps_per_segment):
                t = s / steps_per_segment
                dense.append(cr_point(p0, p1, p2, p3, t))
        dense.append(ctrl_pts[-1])

        # Arc-length re-parameterisation: compute cumulative distance
        cum_dist = [0.0]
        for i in range(1, len(dense)):
            dx = dense[i][0] - dense[i-1][0]
            dy = dense[i][1] - dense[i-1][1]
            cum_dist.append(cum_dist[-1] + math.sqrt(dx*dx + dy*dy))
        total_len = cum_dist[-1]
        if total_len < 1.0:
            return [(int(x), int(y)) for x, y in dense]

        # Resample at even arc-length intervals
        n_out   = max(len(ctrl_pts) * steps_per_segment // 2, 4)
        out     = []
        j       = 0
        for k in range(n_out):
            target = total_len * k / (n_out - 1)
            while j < len(cum_dist) - 1 and cum_dist[j+1] < target:
                j += 1
            if j >= len(dense) - 1:
                out.append((int(dense[-1][0]), int(dense[-1][1])))
            else:
                seg_len = cum_dist[j+1] - cum_dist[j]
                alpha   = (target - cum_dist[j]) / seg_len if seg_len > 0 else 0
                x = dense[j][0] + alpha * (dense[j+1][0] - dense[j][0])
                y = dense[j][1] + alpha * (dense[j+1][1] - dense[j][1])
                out.append((int(x), int(y)))
        return out

    @staticmethod
    def _decimate_path(pts, target_count=50):
        """Reduce a dense path to approximately target_count evenly-spaced points."""
        n = len(pts)
        if n <= target_count:
            return pts
        step = max(1, n // target_count)
        kept = [pts[0]]
        for i in range(step, n - step, step):
            kept.append(pts[i])
        kept.append(pts[-1])
        return kept

    @staticmethod
    def _reach_colors(character):
        """Return (source_rgba, mouth_rgba) for a river reach character.

        Colour palette follows cartographic convention:
          torrent  — cool grey-blue, lighter (glacial/rocky water)
          cascade  — medium blue, slightly greener (aerated)
          stream   — classic ink blue
          river    — deeper richer blue
          meander  — warmest blue (sediment-laden lowland water)
          braided  — greyed blue (broad shallow channels)
        """
        palettes = {
            # (source_rgba,               mouth_rgba)
            # Source alpha raised to 155+ so headwaters are visible on parchment
            REACH_TORRENT: ((135, 158, 180, 155), ( 88, 118, 152, 215)),
            REACH_CASCADE: ((105, 138, 168, 162), ( 65, 105, 148, 220)),
            REACH_STREAM:  (( 68, 105, 142, 168), ( 40,  72, 112, 222)),
            REACH_RIVER:   (( 50,  85, 128, 175), ( 28,  58,  98, 228)),
            REACH_MEANDER: (( 44,  76, 115, 180), ( 25,  48,  88, 232)),
            REACH_BRAIDED: (( 78, 110, 142, 155), ( 55,  88, 122, 210)),
        }
        return palettes.get(character, palettes[REACH_STREAM])

    @staticmethod
    def _reach_width_scale(character, order, acc_ratio):
        """Return (start_width, end_width) in pixels for this reach.

        Width is driven primarily by flow accumulation ratio (catchment size)
        with a secondary boost from Strahler order so main stems are always
        drawn wider than their tributaries.
        """
        # Base range per character — scaled for 4K cartographic visibility.
        # At 3840×2560 output (10 px/cell) rivers need generous widths to read
        # clearly at normal viewing distance.
        # start_w = width at headwaters (source cell), px
        # end_w   = max width at river mouth (full accumulation, high order), px
        base_ranges = {
            REACH_TORRENT: ( 4.0, 12.0),
            REACH_CASCADE: ( 5.0, 15.0),
            REACH_STREAM:  ( 5.5, 18.0),
            REACH_RIVER:   ( 8.0, 28.0),
            REACH_MEANDER: (10.0, 36.0),
            REACH_BRAIDED: ( 7.0, 22.0),
        }
        sw_base, ew_base = base_ranges.get(character, (5.5, 18.0))

        # Accumulation ratio scales the end width non-linearly so large
        # catchment rivers are clearly dominant over small tributaries.
        acc_boost = (acc_ratio ** 0.60) * (ew_base - sw_base)

        # Strahler order provides a minimum-width floor: order 3 → +2px,
        # order 4 → +4px, order 5+ → +6px so main stems are always wider.
        order_floor = max(0.0, (order - 2) * 2.0)

        start_w = sw_base + order_floor * 0.5
        end_w   = sw_base + acc_boost + order_floor
        return start_w, end_w

    def _draw_bank_stipple(self, draw, p0, p1, width, character, t, seed_v):
        """Draw tiny stipple marks perpendicular to the river on its banks.

        Mimics the hand-drawn cartographic convention of hatching river banks.
        Only applied to rivers with width ≥ 2.  Density and style vary by
        reach character (dense dots for meanders, sparse dashes for torrents).
        """
        if width < 2:
            return
        # Direction vector
        dx  = p1[0] - p0[0]
        dy  = p1[1] - p0[1]
        seg_len = math.sqrt(dx*dx + dy*dy) + 1e-6
        if seg_len < 2.0:
            return
        udx = dx / seg_len
        udy = dy / seg_len
        # Perpendicular (two sides)
        px, py = -udy, udx

        # Stipple parameters per character
        params = {
            REACH_TORRENT: (0,   0),
            REACH_CASCADE: (1,  35),
            REACH_STREAM:  (2,  45),
            REACH_RIVER:   (3,  55),
            REACH_MEANDER: (4,  65),
            REACH_BRAIDED: (2,  40),
        }
        n_dots, base_alpha = params.get(character, (2, 45))
        if n_dots == 0:
            return

        ink = (26, 16, 5)
        mx  = (p0[0] + p1[0]) // 2
        my  = (p0[1] + p1[1]) // 2
        bank_dist = width * 0.65 + 1.0   # distance from centreline to bank

        for side in [-1, 1]:
            for k in range(n_dots):
                hv = _hash2d(mx + k * 31 + side * 97, my + k * 43, seed_v)
                if hv < 0.45:
                    continue
                # Scatter along segment
                along = (hv - 0.5) * seg_len * 0.6
                bx = int(mx + udx * along + px * side * bank_dist)
                by = int(my + udy * along + py * side * bank_dist)
                da = int(base_alpha * (0.6 + hv * 0.7) * (0.4 + t * 0.6))
                da = min(130, da)
                r_dot = 1 if character in (REACH_MEANDER, REACH_RIVER) else 0
                draw.ellipse([bx - r_dot, by - r_dot, bx + r_dot, by + r_dot],
                             fill=ink + (da,))

    def _draw_rapids_marks(self, draw, p0, p1, grad_val, character, width):
        """Draw small hash marks indicating rapids or white water.

        Applied to steep sections of torrents and cascades only.
        Three short perpendicular ticks drawn at the midpoint of the segment.
        """
        if character not in (REACH_TORRENT, REACH_CASCADE):
            return
        if grad_val < 0.012:
            return
        dx  = p1[0] - p0[0]
        dy  = p1[1] - p0[1]
        seg_len = math.sqrt(dx*dx + dy*dy) + 1e-6
        if seg_len < 3.0:
            return
        udx = dx / seg_len
        udy = dy / seg_len
        px, py = -udy, udx

        mx  = (p0[0] + p1[0]) // 2
        my  = (p0[1] + p1[1]) // 2
        half_tick = max(1, width)
        ink = (26, 16, 5)
        # Three ticks spread along segment
        for off in [-seg_len * 0.25, 0.0, seg_len * 0.25]:
            tx = int(mx + udx * off)
            ty = int(my + udy * off)
            draw.line([(int(tx - px * half_tick), int(ty - py * half_tick)),
                       (int(tx + px * half_tick), int(ty + py * half_tick))],
                      fill=ink + (95,), width=1)

    def _draw_delta_fan(self, draw, spline_pts, is_water, width, acc_ratio):
        """Draw distributary delta channels where a river meets the ocean.

        Fans out 2-4 smaller branches in the final approach to the coast,
        each offset by a few pixels perpendicular to flow direction.  The
        channels converge back to a single point at the true mouth.
        """
        if acc_ratio < 0.25 or len(spline_pts) < 10:
            return
        # Find where the river approaches within ~30 px of the coast
        coast_approach = -1
        for i in range(len(spline_pts) - 1, max(0, len(spline_pts) - 40), -1):
            r_idx = int(spline_pts[i][1] / CELL_H)
            c_idx = int(spline_pts[i][0] / CELL_W)
            if 0 <= r_idx < GRID_ROWS and 0 <= c_idx < GRID_COLS:
                if not is_water[r_idx, c_idx]:
                    coast_approach = i
                    break

        if coast_approach < 5:
            return

        mouth = spline_pts[-1]
        fan_start = spline_pts[coast_approach]
        n_branches = 2 if acc_ratio < 0.5 else 3

        # Direction of main channel at delta entry
        dx = mouth[0] - fan_start[0]
        dy = mouth[1] - fan_start[1]
        d  = math.sqrt(dx*dx + dy*dy) + 1e-6
        px, py = -dy/d, dx/d   # perpendicular

        fan_spread = width * 2.5

        for b in range(n_branches):
            frac    = (b / (n_branches - 1) - 0.5) if n_branches > 1 else 0.0
            offset  = frac * fan_spread
            mid_x   = (fan_start[0] + mouth[0]) / 2 + px * offset * 1.8
            mid_y   = (fan_start[1] + mouth[1]) / 2 + py * offset * 1.8
            branch_col = (38, 62, 98, int(120 + acc_ratio * 55))
            bw = max(1, int(width * (0.5 + (1.0 - abs(frac)) * 0.5)))
            draw.line([(int(fan_start[0]), int(fan_start[1])),
                       (int(mid_x), int(mid_y)),
                       (int(mouth[0]), int(mouth[1]))],
                      fill=branch_col, width=bw)

    def render_rivers(self, rivers, hmap):
        """Render a full cartographic river network with 6 visual layers.

        Layer order (composited low → high priority)
        --------------------------------------------
        0. Wide outer glow   — Gaussian-blurred fill for wide rivers only
                               gives rivers a subtle luminosity on the map
        1. Shadow layer      — 1-px dark offset beneath each river segment
        2. Edge darkening    — Thin dark outer stroke for cartographic depth
        3. Main water body   — Character-aware colour, width by accumulation
        4. Inner shimmer     — Pale reflection highlight on wide rivers
        5. Bank stipple      — Hand-drawn hachure texture on both banks
        6. Rapids/white water— Hash marks on steep torrent/cascade sections

        Rendering is sorted by river width (narrow tributaries first, wide
        main stems on top) so tributaries visually feed into main channels.

        Spline quality
        --------------
        Uses arc-length–even centripetal Catmull-Rom so width and colour
        interpolate smoothly with no bunching artefacts near curve apexes.
        """
        # ── Allocate per-layer compositing canvases ──────────────────
        glow_layer   = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        shadow_layer = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        edge_layer   = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        body_layer   = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        shim_layer   = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        bank_layer   = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        rapid_layer  = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))

        glow_draw   = ImageDraw.Draw(glow_layer)
        sh_draw     = ImageDraw.Draw(shadow_layer)
        edge_draw   = ImageDraw.Draw(edge_layer)
        body_draw   = ImageDraw.Draw(body_layer)
        shim_draw   = ImageDraw.Draw(shim_layer)
        bank_draw   = ImageDraw.Draw(bank_layer)
        rapid_draw  = ImageDraw.Draw(rapid_layer)

        is_water        = hmap < WATER_LEVEL
        ink             = (26, 16, 5)

        # Retrieve metadata stashed by generate_rivers()
        river_acc_list  = getattr(generate_rivers, '_river_acc',        [])
        river_chars     = getattr(generate_rivers, '_river_characters',  [])
        river_orders    = getattr(generate_rivers, '_river_orders',      [])
        river_grads     = getattr(generate_rivers, '_river_grad_means',  [])

        max_acc = max(river_acc_list) if river_acc_list else 1
        max_acc = max(max_acc, 1)

        # Sort: narrowest rivers rendered first so wide stems draw on top
        def river_sort_key(idx_path):
            idx, _ = idx_path
            if idx < len(river_acc_list):
                return river_acc_list[idx]
            return 0
        sorted_pairs = sorted(enumerate(rivers), key=river_sort_key)

        for orig_idx, path in sorted_pairs:
            if len(path) < 5:
                continue

            # ── Per-river metadata ──────────────────────────────────
            acc  = river_acc_list[orig_idx] if orig_idx < len(river_acc_list) else 1
            char = river_chars[orig_idx]    if orig_idx < len(river_chars)    else REACH_STREAM
            order= river_orders[orig_idx]   if orig_idx < len(river_orders)   else 1
            grad_mean = river_grads[orig_idx] if orig_idx < len(river_grads)  else 0.01

            acc_ratio    = min(1.0, math.log(acc + 1) / math.log(max_acc + 1))
            start_w, end_w = self._reach_width_scale(char, order, acc_ratio)
            src_col, mouth_col = self._reach_colors(char)

            last_r, last_c = path[-1]
            reaches_water  = (0 <= last_r < GRID_ROWS and 0 <= last_c < GRID_COLS
                              and is_water[last_r, last_c])
            is_major = (acc_ratio > 0.28 or order >= 3)
            is_wide  = (acc_ratio > 0.50 or order >= 4)

            # ── Convert grid → screen pixels ───────────────────────
            raw_px = []
            for r, c in path:
                x, y = self.cell_to_screen(c, r)
                raw_px.append((int(x), int(y)))

            # Decimate then spline — keep enough control points for fidelity
            target_ctrl = max(8, len(raw_px) // 4)
            ctrl = self._decimate_path(raw_px, target_count=target_ctrl)
            steps = 12 if is_major else 8
            spline_pts = self._catmull_rom_arc(ctrl, steps_per_segment=steps)

            n = len(spline_pts)
            if n < 2:
                continue

            # ── Layer 0: glow (wide rivers only, drawn once per river) ─
            if is_wide and n > 4:
                for i in range(1, n, 3):   # every 3rd segment for speed
                    t = i / n
                    w_glow = max(2, int(round(start_w + t*(end_w - start_w))) + 6)
                    ga = int(22 + acc_ratio * 28)
                    glow_draw.line([spline_pts[i-1], spline_pts[i]],
                                   fill=(55, 85, 125, ga), width=w_glow)

            # ── Per-segment rendering ───────────────────────────────
            seed_v = self.rng_seed + orig_idx * 37 if hasattr(self, 'rng_seed') else orig_idx * 37

            for i in range(1, n):
                t = i / n

                # Width interpolation source → mouth
                base_w = start_w + t * (end_w - start_w)
                # Delta widening in final 10% before ocean
                if reaches_water and t > 0.90:
                    delta_t  = (t - 0.90) / 0.10
                    base_w  += delta_t * end_w * 0.45
                width = max(2, int(round(base_w)))

                # Colour: linear interpolation source → mouth
                tr = src_col[0]  + t * (mouth_col[0] - src_col[0])
                tg = src_col[1]  + t * (mouth_col[1] - src_col[1])
                tb = src_col[2]  + t * (mouth_col[2] - src_col[2])
                ta = src_col[3]  + t * (mouth_col[3] - src_col[3])
                river_col = (int(tr), int(tg), int(tb), min(240, int(ta)))

                p0 = spline_pts[i - 1]
                p1 = spline_pts[i]

                # ── Layer 1: shadow ────────────────────────────────
                if width >= 2:
                    sh_a = int(28 + acc_ratio * 38 + t * 15)
                    sh_draw.line([(p0[0]+1, p0[1]+1), (p1[0]+1, p1[1]+1)],
                                 fill=ink + (min(85, sh_a),), width=width + 1)

                # ── Layer 2: dark edge stroke ─────────────────────
                if width >= 2:
                    edge_a = int(55 + acc_ratio * 55 + t * 20)
                    edge_draw.line([p0, p1],
                                   fill=ink + (min(110, edge_a),),
                                   width=width + 1)

                # ── Layer 3: main body ─────────────────────────────
                body_draw.line([p0, p1], fill=river_col, width=width)

                # ── Layer 4: inner shimmer ─────────────────────────
                if width >= 2 and is_major:
                    shim_a = int(28 + acc_ratio * 45 + t * 28)
                    shim_draw.line([p0, p1],
                                   fill=(148, 182, 215, min(95, shim_a)), width=1)

                # ── Layer 5: bank stipple ─────────────────────────
                if width >= 2 and i % 4 == 0:   # every 4th segment for speed
                    self._draw_bank_stipple(bank_draw, p0, p1, width, char,
                                            t, seed_v + i)

                # ── Layer 6: rapids / white water ────────────────
                if i % 6 == 0:
                    self._draw_rapids_marks(rapid_draw, p0, p1, grad_mean,
                                            char, width)

            # ── Delta fan at ocean mouth ──────────────────────────
            if reaches_water and is_major:
                self._draw_delta_fan(body_draw, spline_pts, is_water,
                                     width, acc_ratio)

        # ── Composite all layers ──────────────────────────────────────
        # Glow: blur before compositing for soft halo effect
        glow_blurred = glow_layer.filter(ImageFilter.GaussianBlur(radius=3))
        self.img = Image.alpha_composite(self.img, glow_blurred)
        self.img = Image.alpha_composite(self.img, shadow_layer)
        self.img = Image.alpha_composite(self.img, edge_layer)
        self.img = Image.alpha_composite(self.img, body_layer)
        self.img = Image.alpha_composite(self.img, shim_layer)
        self.img = Image.alpha_composite(self.img, bank_layer)
        self.img = Image.alpha_composite(self.img, rapid_layer)
        self.draw = ImageDraw.Draw(self.img)

    def render_roads(self, roads):
        """Render road network with distinct visual styles per road type.
        Uses separate mask layers per tier so overlapping roads don't compound darkness.

        - King's Roads: bold solid line, the main highways
        - Trade Routes: solid single line, medium weight
        - Country Roads: dashed line, lighter
        - Trails: dotted line, very light
        """
        ink = (26, 16, 5)

        # Group roads by type, draw each tier to its own mask to prevent
        # alpha stacking where routes share segments
        type_order = {'trail': 0, 'country_road': 1, 'trade_route': 2, 'kings_road': 3,
                      'major': 3, 'road': 2}
        tiers = {'trail': [], 'country_road': [], 'trade_route': [], 'kings_road': []}
        for road_type, path in roads:
            if len(path) < 2:
                continue
            # Normalize type
            if road_type in ('major',):
                road_type = 'kings_road'
            elif road_type in ('road',):
                road_type = 'trade_route'
            key = road_type if road_type in tiers else 'trail'
            tiers[key].append(path)

        # Draw each tier to a grayscale mask, then composite as colored overlay
        for tier_name in ['trail', 'country_road', 'trade_route', 'kings_road']:
            paths = tiers[tier_name]
            if not paths:
                continue

            mask = Image.new('L', (self.W, self.H), 0)
            m_draw = ImageDraw.Draw(mask)

            for path in paths:
                points = []
                for r, c in path:
                    x, y = self.cell_to_screen(c, r)
                    points.append((int(x), int(y)))
                deduped = [points[0]]
                for p in points[1:]:
                    if p != deduped[-1]:
                        deduped.append(p)
                points = deduped
                if len(points) < 2:
                    continue

                if tier_name == 'kings_road':
                    m_draw.line(points, fill=255, width=4)

                elif tier_name == 'trade_route':
                    m_draw.line(points, fill=255, width=3)

                elif tier_name == 'country_road':
                    # Dashed line
                    total_dist = 0
                    dash_len, gap_len = 10, 5
                    for i in range(1, len(points)):
                        dx = points[i][0] - points[i-1][0]
                        dy = points[i][1] - points[i-1][1]
                        seg_len = math.sqrt(dx*dx + dy*dy)
                        if seg_len < 0.5:
                            continue
                        total_dist += seg_len
                        cycle = dash_len + gap_len
                        if total_dist % cycle < dash_len:
                            m_draw.line([points[i-1], points[i]], fill=255, width=1)

                else:  # trail
                    total_dist = 0
                    dot_spacing = 8
                    last_dot = -dot_spacing
                    for i in range(1, len(points)):
                        dx = points[i][0] - points[i-1][0]
                        dy = points[i][1] - points[i-1][1]
                        seg_len = math.sqrt(dx*dx + dy*dy)
                        total_dist += seg_len
                        if total_dist - last_dot >= dot_spacing:
                            cx, cy = points[i]
                            m_draw.ellipse([cx-1, cy-1, cx+1, cy+1], fill=255)
                            last_dot = total_dist

            # Choose alpha per tier
            tier_alpha = {'kings_road': 180, 'trade_route': 145,
                          'country_road': 110, 'trail': 70}
            alpha = tier_alpha.get(tier_name, 80)

            # Scale mask to target alpha (mask is 0-255, we want 0-alpha)
            mask_arr = np.array(mask, dtype=np.float32)
            mask_arr = (mask_arr / 255.0 * alpha).clip(0, 255).astype(np.uint8)

            overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
            overlay.putalpha(Image.fromarray(mask_arr))
            # Set the RGB channels to ink color
            r_ch, g_ch, b_ch, a_ch = overlay.split()
            ink_layer = Image.new('L', (self.W, self.H), ink[0])
            ink_layer_g = Image.new('L', (self.W, self.H), ink[1])
            ink_layer_b = Image.new('L', (self.W, self.H), ink[2])
            overlay = Image.merge('RGBA', (ink_layer, ink_layer_g, ink_layer_b,
                                           Image.fromarray(mask_arr)))
            self.img = Image.alpha_composite(self.img, overlay)

        self.draw = ImageDraw.Draw(self.img)

    def render_lakes(self, lakes, hmap, rng):
        """Render lakes as multi-layer water bodies that match the ocean visual language.

        Each lake gets:
          1. Deep fill    — rich blue centre matching deeper ocean colour
          2. Shore fade   — lighter shallow-water band around the perimeter
          3. Highlight    — small pale ellipse off-centre to mimic reflected sky
          4. Shore outline — thin dark ink stroke
          5. Hachure band  — short inward-facing strokes just inside the shore line
                             (cartographic convention to show water edge)
          6. Type-specific tweaks:
             - 'tarn'   : smaller, rounder, icier blue
             - 'basin'  : irregular shape, slightly turbid brown-blue mix
             - 'valley' : largest, most elliptical, classic blue
        """
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)
        ink     = (26, 16, 5)

        # Separate layers so we can blur the deep fill for soft edges
        fill_layer  = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        fl_draw     = ImageDraw.Draw(fill_layer)

        for lake_item in lakes:
            # Support both old 3-tuple format and new 4-tuple with kind
            if len(lake_item) == 4:
                center_r, center_c, radius, kind = lake_item
            else:
                center_r, center_c, radius = lake_item
                kind = 'valley'

            cx, cy = self.cell_to_screen(center_c, center_r)
            cx, cy = int(cx), int(cy)

            # Pixel radius — tarns are rounder, valley lakes more elongated
            if kind == 'tarn':
                rpx = int(radius * CELL_W * 1.1)
                rpy = int(radius * CELL_H * 1.0)
                num_pts = 14
                wobble_amp = 0.12   # tarns are fairly round
            elif kind == 'basin':
                rpx = int(radius * CELL_W * 1.3)
                rpy = int(radius * CELL_H * 0.85)
                num_pts = 20
                wobble_amp = 0.32   # basins are irregular
            else:   # valley
                rpx = int(radius * CELL_W * 1.35)
                rpy = int(radius * CELL_H * 0.92)
                num_pts = 22
                wobble_amp = 0.25

            rpx = max(10, rpx)
            rpy = max(8,  rpy)

            # Build the organic shoreline polygon
            shore_pts = []
            for i in range(num_pts):
                angle = 2 * math.pi * i / num_pts
                h_noise = _hash2d(int(cx + i * 7), int(cy + i * 13), rng.seed + 800)
                wobble  = 1.0 - wobble_amp + h_noise * wobble_amp * 2.0
                px = cx + int(rpx * wobble * math.cos(angle))
                py = cy + int(rpy * wobble * math.sin(angle))
                shore_pts.append((px, py))

            # Inset polygon for the deep-water centre (60 % of shore radius)
            deep_pts = []
            for i in range(num_pts):
                angle = 2 * math.pi * i / num_pts
                h_noise = _hash2d(int(cx + i * 7), int(cy + i * 13), rng.seed + 800)
                wobble  = 1.0 - wobble_amp * 0.5 + h_noise * wobble_amp
                px = cx + int(rpx * 0.58 * wobble * math.cos(angle))
                py = cy + int(rpy * 0.58 * wobble * math.sin(angle))
                deep_pts.append((px, py))

            # --- Colour palette per lake type ---
            if kind == 'tarn':
                # Icy mountain tarn — cool pale grey-blue
                shallow_col = (148, 168, 188, 175)
                deep_col    = (105, 138, 168, 210)
                hilight_col = (185, 205, 220, 80)
            elif kind == 'basin':
                # Basin lake — slightly turbid, greener tint
                shallow_col = (138, 158, 155, 178)
                deep_col    = (95,  128, 135, 215)
                hilight_col = (175, 200, 195, 75)
            else:
                # Valley lake — classic cartographic blue, matches ocean depth
                shallow_col = (148, 162, 175, 182)
                deep_col    = (95,  125, 158, 218)
                hilight_col = (182, 205, 215, 78)

            # Layer 1: shore fill (lighter, full polygon)
            fl_draw.polygon(shore_pts, fill=shallow_col)
            # Layer 2: deep centre
            fl_draw.polygon(deep_pts, fill=deep_col)

            # Layer 3: highlight — small off-centre ellipse (upper-left of centre)
            hl_dx = int(rpx * 0.18)
            hl_dy = int(rpy * 0.18)
            hl_rx = max(3, int(rpx * 0.25))
            hl_ry = max(2, int(rpy * 0.18))
            fl_draw.ellipse([cx - hl_dx - hl_rx, cy - hl_dy - hl_ry,
                              cx - hl_dx + hl_rx, cy - hl_dy + hl_ry],
                             fill=hilight_col)

            # Layer 4: shore outline stroke
            ov_draw.polygon(shore_pts, outline=ink + (165,), width=1)

            # Layer 5: inward hachure band — short lines pointing toward centre
            for i in range(len(shore_pts)):
                px, py = shore_pts[i]
                dx = px - cx
                dy = py - cy
                d  = math.sqrt(dx * dx + dy * dy) + 0.1
                # Inward direction (toward centre)
                for j in range(3):
                    hh = _hash2d(int(px + j * 11), int(py + j * 17), rng.seed + 812)
                    if hh < 0.45:
                        continue
                    length = 3 + int(hh * 4)
                    ex = px - int(dx / d * length)
                    ey = py - int(dy / d * length)
                    ov_draw.line([(px, py), (ex, ey)],
                                 fill=ink + (int(55 + hh * 45),), width=1)

        # Soft-blur the fill layer for a gentle shoreline gradient
        fill_blurred = fill_layer.filter(ImageFilter.GaussianBlur(radius=2))
        self.img = Image.alpha_composite(self.img, fill_blurred)
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
        """Render settlement icons and labels with distinct symbols per type.
        Includes label overlap prevention — tracks placed label bounds."""
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)
        parch = (200, 180, 130)

        # Track placed labels for overlap prevention
        placed_labels = []  # list of (x1, y1, x2, y2)

        def label_overlaps(x1, y1, x2, y2):
            pad = 6  # doubled padding between labels
            for lx1, ly1, lx2, ly2 in placed_labels:
                if (x1 - pad < lx2 and x2 + pad > lx1 and
                        y1 - pad < ly2 and y2 + pad > ly1):
                    return True
            return False

        # Sort by importance — capitals first, then cities, towns, etc.
        type_priority = {'capital': 0, 'city': 1, 'town': 2, 'hamlet': 3, 'village': 4}
        sorted_settlements = sorted(settlements, key=lambda s: type_priority.get(s[2], 5))

        for r, c, stype, name in sorted_settlements:
            x, y = self.cell_to_screen(c, r)
            ix, iy = int(x), int(y)
            ink = (26, 16, 5)

            fill_col = (225, 210, 172, 215)  # parchment fill
            lw = 4   # doubled line width

            if stype == 'capital':
                # CAPITAL — dramatic gothic castle: 4-5 tall pointed spires,
                # crenellated walls, flanking towers, dark ink, prominent cross/finial on each spire.
                sc  = 4.8
                gnd = iy + int(3 * sc)

                # --- Curtain wall (low connecting wall) ---
                wall_x1 = ix - int(22 * sc);  wall_x2 = ix + int(22 * sc)
                wh = int(10 * sc)
                ov_draw.rectangle([wall_x1, gnd - wh, wall_x2, gnd],
                                   fill=fill_col, outline=ink + (225,), width=lw)
                # Wall crenellations
                step_w = int(3.8 * sc)
                for bx in range(wall_x1 + 2, wall_x2 - step_w, step_w * 2):
                    ov_draw.rectangle([bx, gnd - wh - int(3.5 * sc),
                                       bx + int(2.5 * sc), gnd - wh],
                                      fill=fill_col, outline=ink + (200,), width=1)

                # --- Gate arch centred in wall ---
                gw = int(5 * sc);  gah = int(8 * sc)
                ov_draw.rectangle([ix - gw, gnd - gah, ix + gw, gnd],
                                   fill=ink + (60,))
                ov_draw.arc([ix - gw, gnd - gah * 2, ix + gw, gnd],
                             start=180, end=0, fill=fill_col, width=lw)
                ov_draw.arc([ix - gw, gnd - gah * 2, ix + gw, gnd],
                             start=180, end=0, fill=ink + (220,), width=lw)

                # --- Left flanking round tower ---
                lt_cx = ix - int(18 * sc);  lt_r = int(7 * sc)
                lt_th  = int(20 * sc)
                lt_top = gnd - wh - lt_th
                ov_draw.rectangle([lt_cx - lt_r, lt_top, lt_cx + lt_r, gnd],
                                   fill=fill_col, outline=ink + (225,), width=lw)
                # Round tower cap
                ov_draw.pieslice([lt_cx - lt_r, lt_top - lt_r,
                                  lt_cx + lt_r, lt_top + lt_r],
                                  start=180, end=0,
                                  fill=ink + (80,), outline=ink + (220,), width=1)
                # Arrow slit
                ov_draw.rectangle([lt_cx - 1, lt_top + int(5 * sc),
                                   lt_cx + 1, lt_top + int(12 * sc)],
                                  fill=ink + (160,))

                # --- Right flanking round tower (mirror) ---
                rt_cx = ix + int(18 * sc)
                rt_top = gnd - wh - lt_th
                ov_draw.rectangle([rt_cx - lt_r, rt_top, rt_cx + lt_r, gnd],
                                   fill=fill_col, outline=ink + (225,), width=lw)
                ov_draw.pieslice([rt_cx - lt_r, rt_top - lt_r,
                                  rt_cx + lt_r, rt_top + lt_r],
                                  start=180, end=0,
                                  fill=ink + (80,), outline=ink + (220,), width=1)
                ov_draw.rectangle([rt_cx - 1, rt_top + int(5 * sc),
                                   rt_cx + 1, rt_top + int(12 * sc)],
                                  fill=ink + (160,))

                # --- Central keep (tall square tower) with multiple spires ---
                kw = int(10 * sc);  kh = int(36 * sc)
                k_top = gnd - wh - kh
                ov_draw.rectangle([ix - kw, k_top, ix + kw, gnd - wh],
                                   fill=fill_col, outline=ink + (235,), width=lw)
                # Keep crenellations
                for bx in range(ix - kw, ix + kw - 1, int(4 * sc)):
                    ov_draw.rectangle([bx, k_top - int(4 * sc),
                                       bx + int(2.5 * sc), k_top],
                                      fill=fill_col, outline=ink + (215,), width=1)
                # Keep window
                ov_draw.rectangle([ix - 2, k_top + int(8 * sc),
                                   ix + 2, k_top + int(16 * sc)],
                                  fill=ink + (140,))

                # --- Main central spire (tallest, 40+ scaled units) ---
                sp_base_y = k_top - int(4 * sc)
                sp_tip_y  = sp_base_y - int(42 * sc)  # VERY tall
                sp_hw     = int(6 * sc)
                ov_draw.polygon([(ix - sp_hw, sp_base_y),
                                 (ix,          sp_tip_y),
                                 (ix + sp_hw,  sp_base_y)],
                                fill=ink + (180,), outline=ink + (235,), width=2)
                # Finial cross on central spire
                cross_y = sp_tip_y + int(3 * sc)
                ov_draw.line([(ix - int(3 * sc), cross_y),
                              (ix + int(3 * sc), cross_y)],
                             fill=ink + (200,), width=2)
                ov_draw.line([(ix, cross_y - int(4 * sc)),
                              (ix, cross_y + int(2 * sc))],
                             fill=ink + (200,), width=2)

                # --- Four flanking spires (varying heights) ---
                # Left spire
                ls_x, ls_y_off = ix - int(12 * sc), int(2 * sc)
                ls_base = k_top + ls_y_off
                ls_tip = ls_base - int(28 * sc)
                ls_hw = int(4 * sc)
                ov_draw.polygon([(ls_x - ls_hw, ls_base),
                                 (ls_x,          ls_tip),
                                 (ls_x + ls_hw,  ls_base)],
                                fill=ink + (175,), outline=ink + (230,), width=1)
                ov_draw.line([(ls_x - int(2 * sc), ls_tip),
                              (ls_x + int(2 * sc), ls_tip)],
                             fill=ink + (190,), width=1)

                # Right spire
                rs_x = ix + int(12 * sc)
                rs_base = k_top + ls_y_off
                rs_tip = rs_base - int(24 * sc)
                rs_hw = int(4 * sc)
                ov_draw.polygon([(rs_x - rs_hw, rs_base),
                                 (rs_x,          rs_tip),
                                 (rs_x + rs_hw,  rs_base)],
                                fill=ink + (170,), outline=ink + (225,), width=1)
                ov_draw.line([(rs_x - int(2 * sc), rs_tip),
                              (rs_x + int(2 * sc), rs_tip)],
                             fill=ink + (185,), width=1)

                # Left-back spire
                lbs_x = ix - int(16 * sc)
                lbs_base = k_top + int(4 * sc)
                lbs_tip = lbs_base - int(22 * sc)
                lbs_hw = int(3 * sc)
                ov_draw.polygon([(lbs_x - lbs_hw, lbs_base),
                                 (lbs_x,           lbs_tip),
                                 (lbs_x + lbs_hw,  lbs_base)],
                                fill=ink + (165,), outline=ink + (220,), width=1)

                # Right-back spire
                rbs_x = ix + int(16 * sc)
                rbs_base = k_top + int(4 * sc)
                rbs_tip = rbs_base - int(20 * sc)
                rbs_hw = int(3 * sc)
                ov_draw.polygon([(rbs_x - rbs_hw, rbs_base),
                                 (rbs_x,           rbs_tip),
                                 (rbs_x + rbs_hw,  rbs_base)],
                                fill=ink + (160,), outline=ink + (215,), width=1)

                # Heavy shading on base (multiple hatch lines)
                for hs in range(3):
                    hs_y = sp_base_y + int(2 * sc) + hs * 2
                    ov_draw.line([(ix - int(20 * sc), hs_y),
                                  (ix + int(20 * sc), hs_y)],
                                 fill=ink + (50,), width=1)

                font         = self.font_capital
                label_offset = int(gnd - sp_tip_y) + int(10 * sc)
                s            = int(22 * sc)

            elif stype == 'city':
                # CITY — walled cluster with visible rooftops and turrets.
                sc  = 3.6
                gnd = iy + int(2 * sc)

                # Outer wall (oval, slightly wider than tall)
                ow = int(20 * sc);  oh = int(12 * sc)
                ov_draw.ellipse([ix - ow, gnd - oh * 2, ix + ow, gnd],
                                 fill=fill_col, outline=ink + (220,), width=lw)

                # Three turrets atop wall (left, centre-back, right)
                for tx, ty_off, tw2, th2 in [
                    (ix - int(14 * sc), gnd - oh * 2, int(5 * sc), int(9 * sc)),
                    (ix,                gnd - oh * 2 - int(3 * sc), int(6 * sc), int(11 * sc)),
                    (ix + int(14 * sc), gnd - oh * 2, int(5 * sc), int(9 * sc)),
                ]:
                    # Turret body (rectangle)
                    ov_draw.rectangle([tx - tw2, ty_off - th2,
                                       tx + tw2, ty_off + int(3 * sc)],
                                      fill=fill_col, outline=ink + (215,), width=1)
                    # Conical turret cap
                    cap_h = int(6 * sc)
                    ov_draw.polygon([(tx - tw2, ty_off - th2),
                                     (tx,        ty_off - th2 - cap_h),
                                     (tx + tw2,  ty_off - th2)],
                                    fill=ink + (90,), outline=ink + (210,))

                # Central dome tower rising above
                dt_w = int(7 * sc);  dt_h = int(14 * sc)
                dt_top = gnd - oh * 2 - int(5 * sc) - dt_h
                ov_draw.rectangle([ix - dt_w, dt_top, ix + dt_w, gnd - oh * 2],
                                   fill=fill_col, outline=ink + (220,), width=lw)
                dome_r = dt_w
                ov_draw.pieslice([ix - dome_r, dt_top - dome_r,
                                  ix + dome_r, dt_top + dome_r],
                                  start=180, end=0,
                                  fill=fill_col, outline=ink + (215,), width=lw)

                # Gate arch at base of wall
                ga_w = int(5 * sc);  ga_h = int(6 * sc)
                ov_draw.rectangle([ix - ga_w, gnd - ga_h, ix + ga_w, gnd],
                                   fill=ink + (55,))
                ov_draw.arc([ix - ga_w, gnd - ga_h * 2, ix + ga_w, gnd],
                             start=180, end=0, fill=ink + (200,), width=1)

                font         = self.font_city
                top_y        = dt_top - dome_r
                label_offset = int(gnd - top_y) + 5
                s            = int(20 * sc)

            elif stype == 'town':
                # TOWN — church + inn cluster: tall central steeple flanked by 2 buildings.
                sc  = 2.7
                gnd = iy + int(2 * sc)

                # Left flanking building
                lb_x1 = ix - int(17 * sc);  lb_x2 = ix - int(5 * sc)
                lb_h   = int(10 * sc)
                lb_top = gnd - lb_h
                ov_draw.rectangle([lb_x1, lb_top, lb_x2, gnd],
                                   fill=fill_col, outline=ink + (210,), width=1)
                ov_draw.polygon([(lb_x1, lb_top),
                                 ((lb_x1 + lb_x2) // 2, lb_top - int(5 * sc)),
                                 (lb_x2, lb_top)],
                                fill=ink + (65,), outline=ink + (200,))
                # Chimney
                ch_x = lb_x1 + int(4 * sc)
                ov_draw.rectangle([ch_x, lb_top - int(8 * sc),
                                   ch_x + int(2 * sc), lb_top - int(3 * sc)],
                                  fill=fill_col, outline=ink + (180,), width=1)

                # Right flanking building (slightly different height for variety)
                rb_x1 = ix + int(5 * sc);  rb_x2 = ix + int(18 * sc)
                rb_h   = int(12 * sc)
                rb_top = gnd - rb_h
                ov_draw.rectangle([rb_x1, rb_top, rb_x2, gnd],
                                   fill=fill_col, outline=ink + (210,), width=1)
                ov_draw.polygon([(rb_x1, rb_top),
                                 ((rb_x1 + rb_x2) // 2, rb_top - int(5 * sc)),
                                 (rb_x2, rb_top)],
                                fill=ink + (65,), outline=ink + (200,))

                # Central church with pointed steeple
                ch_x1 = ix - int(6 * sc);  ch_x2 = ix + int(6 * sc)
                ch_h   = int(14 * sc)
                ch_top = gnd - ch_h
                ov_draw.rectangle([ch_x1, ch_top, ch_x2, gnd],
                                   fill=fill_col, outline=ink + (220,), width=lw)
                # Arched church window
                ov_draw.arc([ix - int(3 * sc), ch_top + int(3 * sc),
                              ix + int(3 * sc), ch_top + int(9 * sc)],
                             start=180, end=0, fill=ink + (150,), width=1)
                # Church steeple (tall pointed)
                sp_hw  = int(4 * sc)
                sp_tip = (ix, ch_top - int(14 * sc))
                ov_draw.polygon([(ch_x1, ch_top),
                                 sp_tip,
                                 (ch_x2, ch_top)],
                                fill=ink + (80,), outline=ink + (215,))
                # Steeple cross
                cross_y = ch_top - int(10 * sc)
                ov_draw.line([(ix - int(3 * sc), cross_y),
                               (ix + int(3 * sc), cross_y)],
                              fill=ink + (180,), width=1)
                ov_draw.line([(ix, cross_y - int(3 * sc)),
                               (ix, cross_y + int(3 * sc))],
                              fill=ink + (180,), width=1)

                top_y        = sp_tip[1]
                font         = self.font_town
                label_offset = int(gnd - top_y) + 5
                s            = int(14 * sc)

            elif stype == 'hamlet':
                # HAMLET — two simple cottages with peaked roofs and chimneys.
                sc  = 2.2
                gnd = iy + int(2 * sc)

                for boff, bw, bh, ch_side in [
                    (-int(8 * sc), int(11 * sc), int(9 * sc),  'left'),
                    ( int(2 * sc), int(10 * sc), int(10 * sc), 'right'),
                ]:
                    bx1 = ix + boff;  bx2 = bx1 + bw
                    b_top = gnd - bh
                    # Wall
                    ov_draw.rectangle([bx1, b_top, bx2, gnd],
                                       fill=fill_col, outline=ink + (205,), width=1)
                    # Roof
                    mid_x = (bx1 + bx2) // 2
                    ov_draw.polygon([(bx1, b_top),
                                     (mid_x, b_top - int(5 * sc)),
                                     (bx2, b_top)],
                                    fill=ink + (55,), outline=ink + (195,))
                    # Door (tiny rectangle at base)
                    dw = int(2 * sc)
                    ov_draw.rectangle([mid_x - dw // 2, gnd - int(4 * sc),
                                       mid_x + dw // 2, gnd],
                                      fill=ink + (75,))
                    # Chimney
                    ch_x = bx1 + int(2 * sc) if ch_side == 'left' else bx2 - int(4 * sc)
                    ov_draw.rectangle([int(ch_x), b_top - int(7 * sc),
                                       int(ch_x) + int(2 * sc), b_top - int(2 * sc)],
                                      fill=fill_col, outline=ink + (180,), width=1)

                top_y        = gnd - int(9 * sc) - int(5 * sc) - int(7 * sc)
                font         = self.font_town
                label_offset = int(gnd - top_y) + 4
                s            = int(11 * sc)

            else:  # village — single small house icon (replaces plain dot)
                sc  = 1.9
                gnd = iy + int(2 * sc)
                bw  = int(10 * sc);  bh = int(7 * sc)
                bx1 = ix - bw // 2;  bx2 = ix + bw // 2
                b_top = gnd - bh
                ov_draw.rectangle([bx1, b_top, bx2, gnd],
                                   fill=fill_col, outline=ink + (195,), width=1)
                mid_x = ix
                ov_draw.polygon([(bx1, b_top),
                                 (mid_x, b_top - int(5 * sc)),
                                 (bx2, b_top)],
                                fill=ink + (55,), outline=ink + (190,))
                top_y        = b_top - int(5 * sc)
                font         = self.font_village
                label_offset = int(gnd - top_y) + 4
                s            = bw // 2

            # Label with parchment halo for readability

            bbox = font.getbbox(name)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            lx = int(x - tw / 2)
            ly = iy + label_offset

            # Check label overlap — try below, then right, then above
            label_placed = False
            offsets = [(0, label_offset), (label_offset + 10, -th // 2),
                       (0, -label_offset - th), (-tw - 10, -th // 2)]
            for ox, oy in offsets:
                test_lx = int(x - tw / 2) if ox == 0 else ix + ox
                test_ly = iy + oy
                if not label_overlaps(test_lx, test_ly, test_lx + tw, test_ly + th):
                    lx, ly = test_lx, test_ly
                    label_placed = True
                    break

            if not label_placed:
                # Force place for capitals/cities, skip for others
                if stype not in ('capital', 'city'):
                    continue

            # Record this label's bounds
            placed_labels.append((lx, ly, lx + tw, ly + th))

            # Parchment halo — radius scales with label importance
            if stype in ('capital', 'city'):
                halo_r = 6; halo = (228, 210, 158, 252)
            else:
                halo_r = 4; halo = (222, 204, 152, 240)
            for dx in range(-halo_r, halo_r + 1):
                for dy in range(-halo_r + 1, halo_r):
                    if dx * dx + dy * dy <= halo_r * halo_r:
                        ov_draw.text((lx + dx, ly + dy), name, fill=halo, font=font)
            # Drop shadow for capitals/cities
            if stype in ('capital', 'city'):
                ov_draw.text((lx + 1, ly + 2), name, fill=ink + (70,), font=font)
            # Main text — capitals fully opaque, towns slightly lighter
            text_alpha = 255 if stype in ('capital', 'city') else 228
            ov_draw.text((lx, ly), name, fill=ink + (text_alpha,), font=font)

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def _spaced_text_width(self, text, font, extra_px):
        """Measure total pixel width of text with extra letter-spacing."""
        total = 0
        for ch in text:
            bb = font.getbbox(ch)
            total += (bb[2] - bb[0]) + extra_px
        return max(0, total - extra_px)

    def _draw_spaced_text(self, draw, x, y, text, font, extra_px, fill):
        """Draw text character-by-character with extra letter spacing."""
        cx = x
        for ch in text:
            draw.text((cx, y), ch, font=font, fill=fill)
            bb = font.getbbox(ch)
            cx += (bb[2] - bb[0]) + extra_px

    def render_kingdom_labels(self, kingdoms, hmap):
        """Render large kingdom names — dominant, letter-spaced, with strong halos."""
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)

        extra_sp = 7   # extra pixels between letters for stately tracking

        for kingdom in kingdoms:
            x, y = self.cell_to_screen(kingdom['c'], kingdom['r'])
            name = kingdom['name'].upper()

            tw = self._spaced_text_width(name, self.font_kingdom, extra_sp)
            bbox = self.font_kingdom.getbbox(name[0])
            th = bbox[3] - bbox[1]
            lx = int(x - tw / 2)
            ly = int(y - 44)

            # 1. Broad soft beige glow — largest radius, lowest alpha
            halo_soft = (228, 210, 155, 85)
            for dx in range(-14, 15):
                for dy in range(-10, 11):
                    if dx * dx * 0.5 + dy * dy <= 120:
                        self._draw_spaced_text(ov_draw, lx + dx, ly + dy, name,
                                               self.font_kingdom, extra_sp, halo_soft)

            # 2. Tight bright parchment halo — sharp legibility layer
            halo_tight = (232, 215, 162, 245)
            for dx in range(-5, 6):
                for dy in range(-4, 5):
                    if dx * dx + dy * dy <= 22:
                        self._draw_spaced_text(ov_draw, lx + dx, ly + dy, name,
                                               self.font_kingdom, extra_sp, halo_tight)

            # 3. Drop shadow (dark, offset down-right)
            self._draw_spaced_text(ov_draw, lx + 3, ly + 3, name,
                                   self.font_kingdom, extra_sp, (15, 8, 2, 120))

            # 4. Main ink text — very dark, full opacity
            self._draw_spaced_text(ov_draw, lx, ly, name,
                                   self.font_kingdom, extra_sp, (18, 10, 2, 252))

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def render_kingdom_borders(self, kingdom_map, kingdoms, hmap):
        """Render territorial kingdom borders as bold dashed lines with parchment halos.
        Uses line-segment drawing for continuous, clearly readable borders."""
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)

        rows, cols = kingdom_map.shape
        is_land = hmap >= WATER_LEVEL
        ink = (26, 16, 5)

        # Build a pixel-resolution border mask at half-scale for efficiency
        # We'll draw the border as connected line segments on the full-res image
        # Step 1: collect all border midpoints with their grid neighbors
        border_set = {}  # key=(bx,by) → sorted pair of kingdom ids
        border_pts = []
        for r in range(1, rows - 1):
            for c in range(1, cols - 1):
                ki = kingdom_map[r, c]
                if ki < 0 or not is_land[r, c]:
                    continue
                for dr, dc in [(0, 1), (1, 0)]:
                    nr, nc = r + dr, c + dc
                    if nr >= rows or nc >= cols:
                        continue
                    kj = kingdom_map[nr, nc]
                    if kj >= 0 and kj != ki and is_land[nr, nc]:
                        x1, y1 = self.cell_to_screen(c, r)
                        x2, y2 = self.cell_to_screen(nc, nr)
                        bx = int((x1 + x2) / 2)
                        by = int((y1 + y2) / 2)
                        key = (bx, by)
                        border_set[key] = (min(ki, kj), max(ki, kj))
                        border_pts.append((bx, by))

        if not border_pts:
            self.img = Image.alpha_composite(self.img, overlay)
            self.draw = ImageDraw.Draw(self.img)
            return

        # Step 2: cluster border points by proximity and draw connected segments
        # Sort by (y, x) to create rough chains
        border_pts_sorted = sorted(border_pts, key=lambda p: (p[1] // 20, p[0] // 20))

        # Distinct border color per kingdom-pair — use one kingdom's territory color
        # for the inner halo so each boundary has a unique character.
        TERRITORY_PALETTE = [
            (185,  88,  68),
            ( 72, 118, 172),
            ( 62, 148,  80),
            (148,  78, 155),
            (195, 148,  38),
            ( 55, 145, 148),
            (155,  55,  80),
            (115, 158,  55),
        ]

        cell_px = (self.W - 2 * MARGIN) / cols
        hw = 14   # doubled border width — bolder than before

        visited = set()
        for i, (bx, by) in enumerate(border_pts_sorted):
            if (bx, by) in visited:
                continue
            # Sparse dash: skip only 18% of segments (was 40%)
            h = _hash2d(bx // int(cell_px), by // int(cell_px), 7771)
            if h > 0.82:
                continue
            visited.add((bx, by))

            ki_pair = border_set.get((bx, by), (0, 1))
            # Color halo — blend of the two adjacent kingdoms' palette colors
            c0 = TERRITORY_PALETTE[ki_pair[0] % len(TERRITORY_PALETTE)]
            c1 = TERRITORY_PALETTE[ki_pair[1] % len(TERRITORY_PALETTE)]
            halo_col = (
                (c0[0] + c1[0]) // 2,
                (c0[1] + c1[1]) // 2,
                (c0[2] + c1[2]) // 2,
            )

            # Find nearest same-boundary neighbor
            best_neighbor = None
            best_dist = float('inf')
            for j in range(max(0, i - 25), min(len(border_pts_sorted), i + 25)):
                if j == i:
                    continue
                nx2, ny2 = border_pts_sorted[j]
                d = abs(bx - nx2) + abs(by - ny2)
                if d < best_dist and d < int(cell_px * 2.5):
                    if border_set.get((nx2, ny2)) == border_set.get((bx, by)):
                        best_dist = d
                        best_neighbor = (nx2, ny2)

            # Wide soft colored halo (territory color blend)
            if best_neighbor:
                ov_draw.line([(bx, by), best_neighbor],
                              fill=halo_col + (105,), width=hw + 6)
                # Narrow parchment divider between halo and ink
                ov_draw.line([(bx, by), best_neighbor],
                              fill=(228, 210, 158, 80), width=hw + 1)
                # Bold dark ink line on top
                ov_draw.line([(bx, by), best_neighbor],
                              fill=ink + (225,), width=hw - 2)
            else:
                ov_draw.ellipse([bx - hw, by - hw, bx + hw, by + hw],
                                 fill=halo_col + (105,))
                ov_draw.ellipse([bx - 3, by - 3, bx + 3, by + 3],
                                 fill=ink + (225,))

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def render_geographic_labels(self, hmap, biomes, ridgelines, rng, namer):
        """Label major geographic features: mountain ranges, deserts, forests.
        Uses italic-style text placed at feature centroids for narrative richness."""
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)
        ink = (26, 16, 5)
        parch = (196, 168, 90)

        try:
            font_geo = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', 17)
            font_geo_sm = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', 13)
        except Exception:
            font_geo = ImageFont.load_default()
            font_geo_sm = font_geo

        placed_labels = []  # (x1,y1,x2,y2)

        def place_label(text, sx, sy, font, color, alpha=140):
            bbox = font.getbbox(text)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            lx, ly = int(sx - tw / 2), int(sy - th / 2)
            # Check overlap
            pad = 16
            for lx1, ly1, lx2, ly2 in placed_labels:
                if (lx - pad < lx2 and lx + tw + pad > lx1 and
                        ly - pad < ly2 and ly + th + pad > ly1):
                    return False
            placed_labels.append((lx, ly, lx + tw, ly + th))
            # Parchment halo
            for dx in range(-4, 5):
                for dy in range(-4, 5):
                    if dx * dx + dy * dy <= 12:
                        ov_draw.text((lx + dx, ly + dy), text,
                                     fill=parch + (180,), font=font)
            ov_draw.text((lx, ly), text, fill=color + (alpha,), font=font)
            return True

        # Label mountain ranges from ridgelines — pick 3 longest ridges
        mountain_adjectives = [
            'The {} Mountains', 'The {} Range', 'The {} Peaks', '{} Heights',
            'The {} Crags', 'The {} Spine', '{} Ridge',
        ]
        sorted_ridges = sorted(ridgelines, key=lambda r: len(r), reverse=True)
        labeled_ridges = 0
        for ridge in sorted_ridges[:5]:
            if labeled_ridges >= 3 or len(ridge) < 5:
                break
            # Find midpoint of ridge
            mid = ridge[len(ridge) // 2]
            sx, sy = self.cell_to_screen(mid[1], mid[0])
            sy -= 30  # place label above the ridge
            prefix = rng.choice(namer.PREFIXES)
            template = rng.choice(mountain_adjectives)
            label = template.format(prefix)
            if place_label(label, sx, sy, font_geo_sm, ink, alpha=120):
                labeled_ridges += 1

        # Label large desert regions
        desert_mask = np.zeros((GRID_ROWS, GRID_COLS), dtype=bool)
        for r in range(GRID_ROWS):
            for c in range(GRID_COLS):
                if biomes[r, c] == 'desert':
                    desert_mask[r, c] = True
        if np.any(desert_mask):
            labeled_arr, n_d = ndimage.label(desert_mask)
            for di in range(1, n_d + 1):
                region = labeled_arr == di
                area = region.sum()
                if area < 80:
                    continue
                ys, xs = np.where(region)
                cx, cy = int(xs.mean()), int(ys.mean())
                sx, sy = self.cell_to_screen(cx, cy)
                prefix = rng.choice(namer.PREFIXES)
                templates = ['The {} Wastes', 'The {} Desert', '{} Sands',
                             'The {} Expanse', 'The {} Barrens']
                label = rng.choice(templates).format(prefix)
                place_label(label, sx, sy, font_geo_sm, (120, 80, 20), alpha=130)

        # Label large forest regions
        forest_mask = np.zeros((GRID_ROWS, GRID_COLS), dtype=bool)
        for r in range(GRID_ROWS):
            for c in range(GRID_COLS):
                if biomes[r, c] in ('dense_forest', 'forest'):
                    forest_mask[r, c] = True
        if np.any(forest_mask):
            labeled_arr, n_f = ndimage.label(forest_mask)
            forest_regions = []
            for fi in range(1, n_f + 1):
                region = labeled_arr == fi
                area = region.sum()
                if area >= 120:
                    ys, xs = np.where(region)
                    forest_regions.append((area, int(xs.mean()), int(ys.mean())))
            forest_regions.sort(reverse=True)
            for area, cx, cy in forest_regions[:3]:
                sx, sy = self.cell_to_screen(cx, cy)
                prefix = rng.choice(namer.PREFIXES)
                templates = ['The {} Wood', '{} Forest', 'The {} Wilds',
                             '{} Grove', 'The {} Thicket']
                label = rng.choice(templates).format(prefix)
                place_label(label, sx, sy, font_geo_sm, (30, 70, 20), alpha=130)

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

            # Parchment halo for legibility over water
            halo = (185, 175, 148, 160)
            for dx in range(-3, 4):
                for dy in range(-2, 3):
                    if dx * dx + dy * dy <= 10:
                        ov_draw.text((lx + dx, ly + dy), name,
                                      fill=halo, font=self.font_ocean)
            # Main text — subtle but readable
            ov_draw.text((lx, ly), name,
                          fill=(26, 16, 5, 155), font=self.font_ocean)

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def render_sea_creatures(self, hmap, rng):
        """Render classic cartographic sea serpents and ships in large ocean areas."""
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)
        ink = (26, 16, 5)
        is_water = hmap < WATER_LEVEL

        # Find large connected water regions for placement
        labeled, num_features = ndimage.label(is_water)

        # Track placed creature positions to avoid overlap
        placed = []

        # Allow up to 4 total creatures across all water bodies
        total_placed = 0
        MAX_CREATURES = 4

        for feat_id in range(1, num_features + 1):
            if total_placed >= MAX_CREATURES:
                break
            region = labeled == feat_id
            area = region.sum()
            if area < 300:   # only reasonably large water bodies
                continue
            # For large bodies, allow up to 2 creatures
            max_for_body = 2 if area > 2000 else 1

            ys_reg, xs_reg = np.where(region)
            # Try a few random spots in this water body
            for attempt in range(12):
                idx = rng.randint(0, len(xs_reg) - 1)
                gc, gr = int(xs_reg[idx]), int(ys_reg[idx])
                sx, sy = self.cell_to_screen(gc, gr)

                # Check not too close to coast — want open water
                if not (MARGIN + 80 < sx < self.W - MARGIN - 80 and
                        MARGIN + 80 < sy < self.H - MARGIN - 80):
                    continue
                # Check if far enough from land
                sea_ok = True
                for dr in [-4, -2, 0, 2, 4]:
                    for dc in [-4, -2, 0, 2, 4]:
                        nr, nc = gr + dr, gc + dc
                        if 0 <= nr < GRID_ROWS and 0 <= nc < GRID_COLS:
                            if not is_water[nr, nc]:
                                sea_ok = False
                                break
                    if not sea_ok:
                        break
                if not sea_ok:
                    continue

                # Check not overlapping another creature
                too_close = any(abs(sx - px) + abs(sy - py) < 280 for px, py in placed)
                if too_close:
                    continue

                # Choose creature type based on hash
                h_type = _hash2d(gc * 7, gr * 13, rng.seed + 3141)
                if h_type < 0.55:
                    self._draw_sea_serpent(ov_draw, int(sx), int(sy), rng.seed + gc + gr, ink)
                else:
                    self._draw_sailing_ship(ov_draw, int(sx), int(sy), rng.seed + gc + gr, ink)
                placed.append((sx, sy))
                total_placed += 1
                if len(placed) >= max_for_body:
                    break  # move to next water body after filling this one

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def _draw_sea_serpent(self, ov_draw, cx, cy, seed, ink):
        """Draw a classic cartographic sea serpent — coiled body, triangular head."""
        seed = int(seed)
        cx, cy = int(cx), int(cy)
        h1 = _hash2d(cx, cy, seed + 1)
        h2 = _hash2d(cx, cy, seed + 2)
        scale = 2.2 + h1 * 0.6  # large, clearly visible at map scale
        flip = 1 if h2 > 0.5 else -1  # face left or right

        # Body: series of arcs forming a serpentine coil
        # Arc 1 — body hump forward
        a1x, a1y = cx + flip * int(28 * scale), cy - int(18 * scale)
        w1, h1v = int(42 * scale), int(22 * scale)
        ov_draw.arc([a1x - w1, a1y - h1v, a1x + w1, a1y + h1v],
                    start=180 if flip > 0 else 0, end=360 if flip > 0 else 180,
                    fill=ink + (185,), width=4)

        # Arc 2 — second hump back
        a2x, a2y = cx - flip * int(15 * scale), cy + int(10 * scale)
        w2, h2v = int(30 * scale), int(16 * scale)
        ov_draw.arc([a2x - w2, a2y - h2v, a2x + w2, a2y + h2v],
                    start=0 if flip > 0 else 180, end=180 if flip > 0 else 360,
                    fill=ink + (185,), width=4)

        # Arc 3 — tail
        a3x, a3y = cx - flip * int(55 * scale), cy - int(5 * scale)
        w3, h3v = int(20 * scale), int(10 * scale)
        ov_draw.arc([a3x - w3, a3y - h3v, a3x + w3, a3y + h3v],
                    start=180 if flip > 0 else 0, end=360 if flip > 0 else 180,
                    fill=ink + (155,), width=3)

        # Head — large, distinctive
        hx = cx + flip * int(62 * scale)
        hy = cy - int(30 * scale)
        # Head oval
        ov_draw.ellipse([hx - int(16 * scale), hy - int(10 * scale),
                          hx + int(16 * scale), hy + int(10 * scale)],
                         outline=ink + (190,), fill=ink + (45,), width=3)
        # Snout point
        sx2 = hx + flip * int(16 * scale)
        pts = [(sx2, hy), (sx2 + flip * int(12 * scale), hy - int(5 * scale)),
               (sx2 + flip * int(12 * scale), hy + int(5 * scale))]
        ov_draw.polygon(pts, fill=ink + (180,))
        # Eye
        ex = hx + flip * int(4 * scale)
        ey = hy - int(4 * scale)
        r_eye = max(3, int(3 * scale))
        ov_draw.ellipse([ex - r_eye, ey - r_eye, ex + r_eye, ey + r_eye],
                         fill=ink + (220,))
        # Dorsal spines on humps — larger
        for spine_i in range(4):
            bx = a1x + int((spine_i - 1.5) * 12 * scale)
            by_top = a1y - h1v - int(8 * scale) - spine_i * 2
            by_bot = a1y - h1v + 2
            ov_draw.line([(bx, by_bot), (bx + flip * 4, by_top)],
                          fill=ink + (160,), width=2)

    def _draw_sailing_ship(self, ov_draw, cx, cy, seed, ink):
        """Draw a simple top-down sailing ship for cartographic decoration."""
        seed = int(seed)
        cx, cy = int(cx), int(cy)
        h = _hash2d(cx, cy, seed + 7)
        scale = 2.0 + h * 0.5   # Large ship, clearly visible
        flip = 1 if _hash2d(cx, cy, seed + 8) > 0.5 else -1

        # Hull — elongated oval
        hw = int(32 * scale)
        hh = int(12 * scale)
        ov_draw.ellipse([cx - hw, cy - hh, cx + hw, cy + hh],
                         outline=ink + (180,), fill=ink + (45,), width=3)
        # Mast
        ov_draw.line([(cx, cy - hh), (cx, cy - hh - int(38 * scale))],
                      fill=ink + (190,), width=3)
        # Crossbeam
        bm_y = cy - hh - int(28 * scale)
        bm_w = int(18 * scale)
        ov_draw.line([(cx - bm_w, bm_y), (cx + bm_w, bm_y)],
                      fill=ink + (170,), width=2)
        # Sail — large filled trapezoid
        sail_top = cy - hh - int(36 * scale)
        sail_bot = cy - hh - int(10 * scale)
        sail_w = int(26 * scale)
        pts = [(cx - int(sail_w * 0.3), sail_top),
               (cx + flip * sail_w, sail_bot),
               (cx - int(sail_w * 0.3), sail_bot)]
        ov_draw.polygon(pts, fill=ink + (65,), outline=ink + (160,))
        # Bowsprit
        bx2 = cx + flip * hw
        ov_draw.line([(bx2, cy), (bx2 + flip * int(20 * scale), cy - int(12 * scale))],
                      fill=ink + (150,), width=2)
        # Wake lines
        for wi in range(1, 4):
            ov_draw.arc([cx - flip * hw - wi * 12, cy - wi * 6,
                          cx - flip * hw + wi * 6, cy + wi * 6],
                         start=30 if flip > 0 else 150,
                         end=150 if flip > 0 else 330,
                         fill=ink + (80,), width=1)

    def render_title_banner(self, world_name, subtitle="A World of Ancient Realms"):
        """Render decorative title banner at top with scrollwork."""
        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)
        ink = self.ink_color

        # Measure title to size banner
        bbox = self.font_title.getbbox(world_name)
        tw = bbox[2] - bbox[0]
        bw = max(1000, tw + 160)
        bh = 160
        bx = self.W // 2 - bw // 2
        by = 12

        # Banner background with slight taper
        banner_fill = (210, 190, 140, 240)
        ov_draw.rectangle([bx, by, bx + bw, by + bh], fill=banner_fill)
        # Double border
        ov_draw.rectangle([bx, by, bx + bw, by + bh],
                          outline=ink + (200,), width=4)
        ov_draw.rectangle([bx + 8, by + 8, bx + bw - 8, by + bh - 8],
                          outline=ink + (120,), width=2)

        # Decorative horizontal lines extending from banner
        for side in [-1, 1]:
            sx = bx + (bw if side == 1 else 0)
            ex = sx + side * 60
            mid_y = by + bh // 2
            ov_draw.line([(sx, mid_y - 16), (ex, mid_y - 16)], fill=ink + (100,), width=2)
            ov_draw.line([(sx, mid_y), (ex, mid_y)], fill=ink + (130,), width=2)
            ov_draw.line([(sx, mid_y + 16), (ex, mid_y + 16)], fill=ink + (100,), width=2)

        # Corner decorations
        corner_sz = 16
        for cx, cy in [(bx + 12, by + 12), (bx + bw - 12, by + 12),
                        (bx + 12, by + bh - 12), (bx + bw - 12, by + bh - 12)]:
            ov_draw.line([(cx - corner_sz, cy), (cx + corner_sz, cy)],
                         fill=ink + (140,), width=2)
            ov_draw.line([(cx, cy - corner_sz), (cx, cy + corner_sz)],
                         fill=ink + (140,), width=2)

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
        """Render ornate 8-point compass rose in bottom-left."""
        cx = MARGIN + 156
        cy = self.H - MARGIN - 190
        R = 124        # cardinal arm tip distance
        R_inter = 84   # intercardinal arm tip distance
        inner = 28     # inner ring radius

        overlay = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)
        ink = self.ink_color

        # Parchment background disc
        bg_r = R + 44
        ov_draw.ellipse([cx - bg_r, cy - bg_r, cx + bg_r, cy + bg_r],
                        fill=(196, 168, 90, 230), outline=ink + (110,), width=2)
        ov_draw.ellipse([cx - bg_r + 8, cy - bg_r + 8, cx + bg_r - 8, cy + bg_r - 8],
                        outline=ink + (80,), width=2)

        # Outer decorative ring ticks
        for deg in range(0, 360, 10):
            rad = math.radians(deg)
            tick_len = 12 if deg % 90 == 0 else (8 if deg % 45 == 0 else 4)
            r0 = bg_r - 2
            r1 = bg_r - 2 - tick_len
            x0 = cx + math.sin(rad) * r0
            y0 = cy - math.cos(rad) * r0
            x1 = cx + math.sin(rad) * r1
            y1 = cy - math.cos(rad) * r1
            ov_draw.line([(int(x0), int(y0)), (int(x1), int(y1))],
                         fill=ink + (100,), width=2)

        # 4 intercardinal arms (drawn first, so cardinal arms overlap them)
        for deg in [45, 135, 225, 315]:
            rad = math.radians(deg)
            dx = math.sin(rad)
            dy = -math.cos(rad)
            tip = (cx + dx * R_inter, cy + dy * R_inter)
            pw = 12
            perp_rad = rad + math.pi / 2
            px_ = math.sin(perp_rad) * pw
            py_ = -math.cos(perp_rad) * pw
            left = (cx + px_, cy + py_)
            right = (cx - px_, cy - py_)
            ov_draw.polygon([left, tip, (cx, cy)],
                            fill=ink + (175,), outline=ink + (210,), width=2)
            ov_draw.polygon([right, tip, (cx, cy)],
                            fill=ink + (95,), outline=ink + (175,), width=2)

        # 4 cardinal arms — large diamond spikes
        cardinal = [
            (0, -1, 'N', True),
            (1,  0, 'E', False),
            (0,  1, 'S', False),
            (-1, 0, 'W', False),
        ]
        for dx, dy, label, is_north in cardinal:
            tip = (cx + dx * R, cy + dy * R)
            pw = 20
            perp = (-dy * pw, dx * pw)
            left = (cx + perp[0], cy + perp[1])
            right = (cx - perp[0], cy - perp[1])
            if is_north:
                ov_draw.polygon([left, tip, (cx, cy)],
                                fill=self.accent_color + (235,), outline=ink + (210,), width=2)
                ov_draw.polygon([right, tip, (cx, cy)],
                                fill=(185, 85, 35, 205), outline=ink + (210,), width=2)
            else:
                ov_draw.polygon([left, tip, (cx, cy)],
                                fill=ink + (205,), outline=ink + (225,), width=2)
                ov_draw.polygon([right, tip, (cx, cy)],
                                fill=ink + (115,), outline=ink + (185,), width=2)

            # Direction label
            font = self.font_legend_title if is_north else self.font_legend
            lx = int(cx + dx * (R + 34))
            ly = int(cy + dy * (R + 34))
            bbox = font.getbbox(label)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            lx -= tw // 2
            ly -= th // 2
            for hx in range(-4, 5):
                for hy in range(-4, 5):
                    ov_draw.text((lx + hx, ly + hy), label,
                                 fill=(196, 168, 90, 210), font=font)
            color = self.accent_color + (240,) if is_north else ink + (215,)
            ov_draw.text((lx, ly), label, fill=color, font=font)

        # Inner rings and center
        ov_draw.ellipse([cx - inner, cy - inner, cx + inner, cy + inner],
                        fill=(196, 168, 90, 255), outline=ink + (190,), width=4)
        ov_draw.ellipse([cx - inner + 8, cy - inner + 8, cx + inner - 8, cy + inner - 8],
                        outline=ink + (140,), width=2)
        ov_draw.ellipse([cx - 10, cy - 10, cx + 10, cy + 10],
                        fill=self.accent_color + (245,), outline=ink + (230,), width=2)
        ov_draw.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=ink + (220,))

        self.img = Image.alpha_composite(self.img, overlay)
        self.draw = ImageDraw.Draw(self.img)

    def render_legend(self, rng):
        """Render legend box in bottom-right."""
        lw = 470
        lh = 780
        lx = self.W - MARGIN - lw - 20
        ly = self.H - MARGIN - lh - 20

        # Background
        self.draw.rectangle([lx, ly, lx + lw, ly + lh],
                            fill=(200, 180, 120, 230),
                            outline=self.ink_color + (150,), width=2)
        self.draw.rectangle([lx + 4, ly + 4, lx + lw - 4, ly + lh - 4],
                            outline=self.ink_color + (80,), width=2)

        # Title
        self.draw.text((lx + 20, ly + 12), "Legend",
                       fill=self.ink_color + (200,), font=self.font_legend_title)

        # Entries
        entries = [
            ('Capital', 'capital'),
            ('City', 'city'),
            ('Town', 'town'),
            ('Hamlet', 'hamlet'),
            ('Village', 'village'),
            ('Mountain', 'triangle'),
            ('Forest', 'dots'),
            ('River', 'line'),
            ("King's Road", 'double_line'),
            ('Trade Route', 'solid_line'),
            ('Trail', 'dotted'),
        ]

        yoff = ly + 60
        for label, symbol in entries:
            ix = lx + 36
            iy = yoff + 14

            c = self.ink_color
            fill_p = (220, 205, 168, 230)  # parchment fill for icons
            if symbol == 'capital':
                # Mini castle: left tower, right tower, central keep above wall
                gnd = iy + 10; ht = 20; tw = 8; kw = 6
                # Left tower
                self.draw.rectangle([ix - 18, gnd - ht, ix - 18 + tw, gnd],
                                    fill=fill_p, outline=c + (220,), width=2)
                for bx in (ix - 18, ix - 14):
                    self.draw.rectangle([bx, gnd - ht - 4, bx + 2, gnd - ht], fill=c + (180,))
                # Right tower
                self.draw.rectangle([ix + 10, gnd - ht, ix + 10 + tw, gnd],
                                    fill=fill_p, outline=c + (220,), width=1)
                for bx in (ix + 5, ix + 7):
                    self.draw.rectangle([bx, gnd - ht - 2, bx + 1, gnd - ht], fill=c + (180,))
                # Wall
                wall_h = 6
                self.draw.rectangle([ix - 5, gnd - wall_h, ix + 5, gnd],
                                    fill=fill_p, outline=c + (200,), width=1)
                # Central keep above wall
                self.draw.rectangle([ix - kw, gnd - wall_h - 8, ix + kw, gnd - wall_h],
                                    fill=fill_p, outline=c + (220,), width=1)
                self.draw.rectangle([ix - 1, gnd - wall_h - 8, ix + 1, gnd - wall_h - 4],
                                    fill=c + (180,))  # arrow slit
            elif symbol == 'city':
                # Mini city: 3 buildings of different heights with pitched roofs
                gnd = iy + 5
                blds = [(-8, 5, 7), (-1, 4, 10), (5, 4, 6)]  # (xoff, hw, h)
                for xoff, bw, bh in blds:
                    bx1 = ix + xoff; bx2 = bx1 + bw
                    self.draw.rectangle([bx1, gnd - bh, bx2, gnd],
                                        fill=fill_p, outline=c + (210,), width=1)
                    # Pitched roof
                    mid = (bx1 + bx2) // 2
                    self.draw.polygon([(bx1, gnd - bh), (mid, gnd - bh - 4), (bx2, gnd - bh)],
                                       fill=c + (50,), outline=c + (200,))
            elif symbol == 'town':
                # Mini town: 2 buildings with pitched roofs
                gnd = iy + 5
                for xoff, bw, bh in [(-6, 5, 8), (1, 5, 6)]:
                    bx1 = ix + xoff; bx2 = bx1 + bw
                    self.draw.rectangle([bx1, gnd - bh, bx2, gnd],
                                        fill=fill_p, outline=c + (205,), width=1)
                    mid = (bx1 + bx2) // 2
                    self.draw.polygon([(bx1, gnd - bh), (mid, gnd - bh - 3), (bx2, gnd - bh)],
                                       fill=c + (45,), outline=c + (195,))
            elif symbol == 'hamlet':
                # Mini hamlet: single small house with pitched roof
                gnd = iy + 4
                bx1 = ix - 4; bx2 = ix + 4
                self.draw.rectangle([bx1, gnd - 6, bx2, gnd],
                                    fill=fill_p, outline=c + (200,), width=1)
                self.draw.polygon([(bx1, gnd - 6), (ix, gnd - 10), (bx2, gnd - 6)],
                                   fill=c + (40,), outline=c + (190,))
            elif symbol == 'village':
                self.draw.ellipse([ix - 2, iy - 2, ix + 2, iy + 2],
                                  outline=c + (130,), width=1)
            elif symbol == 'triangle':
                # Paired mountain peaks (mini version of the actual icon)
                gnd = iy + 5
                # Back peak (smaller, left)
                self.draw.polygon([(ix - 9, gnd), (ix - 4, gnd - 8), (ix - 1, gnd)],
                                   fill=c + (40,), outline=c + (200,))
                # Front peak (larger, right)
                self.draw.polygon([(ix - 4, gnd), (ix + 1, gnd - 12), (ix + 7, gnd)],
                                   fill=fill_p, outline=c + (210,))
                # Shadow face on front peak
                self.draw.polygon([(ix - 4, gnd), (ix + 1, gnd - 12), (ix + 2, gnd)],
                                   fill=c + (60,))
            elif symbol == 'dots':
                for di in range(4):
                    dx = ix - 4 + di * 3
                    self.draw.ellipse([dx - 1, iy - 1, dx + 1, iy + 1], fill=c + (130,))
            elif symbol == 'line':
                # Blue river line
                self.draw.line([(ix - 7, iy), (ix + 7, iy)],
                                fill=(38, 62, 95, 190), width=2)
            elif symbol == 'double_line':
                self.draw.line([(ix - 7, iy - 2), (ix + 7, iy - 2)], fill=c + (160,), width=1)
                self.draw.line([(ix - 7, iy + 2), (ix + 7, iy + 2)], fill=c + (160,), width=1)
            elif symbol == 'solid_line':
                self.draw.line([(ix - 7, iy), (ix + 7, iy)], fill=c + (140,), width=1)
            elif symbol == 'dotted':
                for di in range(5):
                    dx = ix - 6 + di * 3
                    self.draw.ellipse([dx, iy - 1, dx + 1, iy + 1], fill=c + (90,))

            self.draw.text((lx + 42, yoff), label,
                           fill=self.ink_color + (195,), font=self.font_legend)
            yoff += 31

    def render_border(self):
        """Render ornamental border with coordinate tick marks and corner flourishes."""
        ink = self.ink_color
        m = MARGIN - 36   # outer border
        m2 = MARGIN - 16   # inner border line 1
        m3 = MARGIN - 6   # inner border line 2

        # Three-line border frame
        self.draw.rectangle([m, m, self.W - m, self.H - m],
                            outline=ink + (160,), width=6)
        self.draw.rectangle([m2, m2, self.W - m2, self.H - m2],
                            outline=ink + (110,), width=2)
        self.draw.rectangle([m3, m3, self.W - m3, self.H - m3],
                            outline=ink + (75,), width=2)

        # Coordinate tick marks along all four edges
        tick_major = 16  # major tick length (every 5th)
        tick_minor = 8   # minor tick length
        num_x = 25       # ticks across width
        num_y = 17       # ticks up height
        map_span_x = self.W - 2 * m
        map_span_y = self.H - 2 * m

        for i in range(num_x + 1):
            tx = int(m + map_span_x * i / num_x)
            tl = tick_major if i % 5 == 0 else tick_minor
            # Top ticks (inward)
            self.draw.line([(tx, m), (tx, m + tl)], fill=ink + (110,), width=2)
            # Bottom ticks (inward)
            self.draw.line([(tx, self.H - m), (tx, self.H - m - tl)], fill=ink + (110,), width=2)

        for i in range(num_y + 1):
            ty = int(m + map_span_y * i / num_y)
            tl = tick_major if i % 5 == 0 else tick_minor
            # Left ticks (inward)
            self.draw.line([(m, ty), (m + tl, ty)], fill=ink + (110,), width=2)
            # Right ticks (inward)
            self.draw.line([(self.W - m, ty), (self.W - m - tl, ty)], fill=ink + (110,), width=2)

        # Corner flourishes — elaborate cross + diamond + rings
        corner_sz = 36
        for cx, cy in [(m + 20, m + 20), (self.W - m - 20, m + 20),
                        (m + 20, self.H - m - 20), (self.W - m - 20, self.H - m - 20)]:
            # Cross arms
            self.draw.line([(cx - corner_sz, cy), (cx + corner_sz, cy)],
                           fill=ink + (150,), width=2)
            self.draw.line([(cx, cy - corner_sz), (cx, cy + corner_sz)],
                           fill=ink + (150,), width=2)
            # Outer circle
            self.draw.ellipse([cx - 18, cy - 18, cx + 18, cy + 18],
                              outline=ink + (120,), width=1)
            # Diamond fill
            pts = [(cx, cy - 6), (cx + 6, cy), (cx, cy + 6), (cx - 6, cy)]
            self.draw.polygon(pts, fill=ink + (90,), outline=ink + (140,))
            # Arm endpoint dots
            for ax, ay in [(cx - corner_sz, cy), (cx + corner_sz, cy),
                           (cx, cy - corner_sz), (cx, cy + corner_sz)]:
                self.draw.ellipse([ax - 2, ay - 2, ax + 2, ay + 2], fill=ink + (120,))

        # Edge midpoint ornaments
        mid_x = self.W // 2
        mid_y = self.H // 2
        for px, py in [(mid_x, m + 5), (mid_x, self.H - m - 5),
                        (m + 5, mid_y), (self.W - m - 5, mid_y)]:
            pts = [(px, py - 7), (px + 7, py), (px, py + 7), (px - 7, py)]
            self.draw.polygon(pts, fill=ink + (100,), outline=ink + (140,))
            self.draw.ellipse([px - 3, py - 3, px + 3, py + 3], fill=ink + (80,))

    def render_scale_bar(self):
        """Render scale bar at bottom center."""
        cx = self.W // 2
        cy = self.H - MARGIN + 10
        bar_w = 240

        # Scale bar segments
        sx = cx - bar_w // 2
        for i in range(6):
            x1 = sx + i * 40
            x2 = x1 + 40
            if i % 2 == 0:
                self.draw.rectangle([x1, cy, x2, cy + 12],
                                    fill=self.ink_color + (180,))
            else:
                self.draw.rectangle([x1, cy, x2, cy + 12],
                                    outline=self.ink_color + (150,), width=2)

        # Labels
        self.draw.text((sx - 4, cy + 20), "0",
                       fill=self.ink_color + (150,), font=self.font_town)
        self.draw.text((sx + bar_w - 16, cy + 20), "100 mi",
                       fill=self.ink_color + (150,), font=self.font_town)


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

    # 3. Coast distance (needed for biome assignment)
    coast_dist = compute_coast_distance(hmap)

    # 4. Biome assignment
    print("  Assigning biomes...")
    biomes = assign_biomes(hmap, temperature, moisture, coast_dist=coast_dist)

    # 5. Rivers (disabled)
    rivers = []

    # 6. Ridgelines
    print("  Detecting ridgelines...")
    ridgelines = detect_ridgelines(hmap, biomes)
    print(f"    {len(ridgelines)} ridgelines detected")

    # 7. Settlements (before lakes so lakes avoid settlement cells)
    print("  Placing settlements...")
    settlements = place_settlements(hmap, biomes, coast_dist, rivers, rng, namer)
    print(f"    {len(settlements)} settlements placed")

    # 8. Lakes
    print("  Generating lakes...")
    lakes = generate_lakes(hmap, biomes, rng, rivers=rivers, settlements=settlements)
    print(f"    {len(lakes)} lakes generated")

    # 9. Ruins
    print("  Placing ruins and landmarks...")
    ruins = generate_ruins(hmap, biomes, coast_dist, rng, settlements)
    print(f"    {len(ruins)} ruins placed")

    # 10. Roads (disabled)
    roads = []

    # 11. Kingdoms
    print("  Assigning kingdoms...")
    kingdom_map, kingdoms = assign_kingdoms(hmap, biomes, settlements, rivers, rng, namer)
    print(f"    {len(kingdoms)} kingdoms")

    # 9. Render
    print("  Rendering map...")
    renderer = MapRenderer(rng_seed=seed)

    print("    Parchment texture...")
    renderer.render_parchment(rng)

    print("    Water...")
    renderer.render_water(hmap, rng)

    # Biome colors, elevation gradient, regional identity tints disabled —
    # pure ink-on-parchment theme (no color fills).

    print("    Coastal glow...")
    renderer.render_coastal_glow(coast_dist, hmap)

    print("    Ocean waves & coastal hachures...")
    renderer.render_ocean_waves(hmap, rng)

    print("    Coastlines...")
    renderer.render_coastlines(hmap, rng)

    print("    Forests...")
    renderer.render_forests(hmap, biomes, coast_dist, rng, rivers=rivers)

    print("    Terrain texture...")
    renderer.render_terrain_texture(hmap, biomes, rng)

    print("    Mountains...")
    renderer.render_mountains(hmap, biomes, ridgelines, rng)

    print("    Lakes...")
    renderer.render_lakes(lakes, hmap, rng)

    # Rivers and roads disabled

    print("    Kingdom borders...")
    renderer.render_kingdom_borders(kingdom_map, kingdoms, hmap)

    print("    Ruins...")
    renderer.render_ruins(ruins, rng)

    print("    Settlements...")
    renderer.render_settlements(settlements, rng)

    print("    Kingdom labels...")
    renderer.render_kingdom_labels(kingdoms, hmap)

    print("    Geographic labels...")
    renderer.render_geographic_labels(hmap, biomes, ridgelines, rng, namer)

    print("    Ocean labels...")
    renderer.render_ocean_labels(hmap, rng, namer)

    # Sea creatures & ships disabled

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
    out_dir = '/sessions/exciting-loving-ptolemy/mnt/peanut'
    output_path = f'{out_dir}/fantasy_map_seed{seed}.png'
    generate_map(seed=seed, output_path=output_path)
