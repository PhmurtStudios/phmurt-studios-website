// ============================================================================
// FANTASY MAP ENGINE - PART 1: TERRAIN SYSTEM
// Standalone vanilla JavaScript map generation engine for D&D worlds
// ============================================================================

// Global FMap object - all state stored here
window.FMap = {
  canvas: null,
  ctx: null,

  // Canvas dimensions
  W: 1400,
  H: 1000,

  // Generation parameters
  seed: 0,
  level: 'world',  // 'world', 'kingdom', 'city'
  dark: true,

  // TERRAIN DATA
  grid: {
    cols: 200,
    rows: 150,
    cells: [],      // Flattened array of cell objects
    heightmap: [],  // 2D array [row][col] of 0-1
    moisture: [],   // 2D array of 0-1
    temperature: [] // 2D array of 0-1
  },

  // WORLD DATA
  world: {
    name: '',
    nameStyle: 'fantasy',
    waterLevel: 0.38,
    mountainLevel: 0.62,

    kingdoms: [],
    cities: [],
    roads: [],
    rivers: [],
    lakes: [],
    pois: [],
    features: {
      mountains: [],
      forests: [],
      seas: [],
      rivers: [],
      lakes: [],
      deserts: [],
      swamps: []
    }
  },

  // INTERACTION STATE
  view: {
    currentKingdom: null,
    currentCity: null,
    hoveredEntity: null,
    selectedEntity: null,
    pan: { x: 0, y: 0 },
    zoom: 1.0
  },

  // MAP BOUNDS for current view
  mapBounds: { x: 0, y: 0, w: 0, h: 0 },

  // USER CUSTOMIZATIONS
  userEdits: {
    renamedEntities: {},
    addedPOIs: [],
    removedPOIs: [],
    notes: {}
  }
};

// ============================================================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================================================

let fmSeedValue = 0;

/**
 * Set the RNG seed
 */
function fmSeed(s) {
  fmSeedValue = s >>> 0;
}

/**
 * Seeded pseudo-random number 0-1 using xorshift32
 */
function fmRand() {
  fmSeedValue ^= (fmSeedValue << 13) >>> 0;
  fmSeedValue ^= (fmSeedValue >> 17) >>> 0;
  fmSeedValue ^= (fmSeedValue << 5) >>> 0;
  return ((fmSeedValue >>> 0) / 4294967296);
}

/**
 * Random integer in [min, max)
 */
function fmRandInt(min, max) {
  return Math.floor(fmRand() * (max - min)) + min;
}

/**
 * Pick random element from array
 */
function fmPick(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(fmRand() * arr.length)];
}

/**
 * Fisher-Yates shuffle (in-place)
 */
function fmShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(fmRand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Box-Muller transform for Gaussian distribution
 */
function fmGaussian() {
  let u1, u2, s;
  do {
    u1 = fmRand() * 2 - 1;
    u2 = fmRand() * 2 - 1;
    s = u1 * u1 + u2 * u2;
  } while (s >= 1 || s === 0);

  const mul = Math.sqrt(-2 * Math.log(s) / s);
  return u1 * mul;
}

// ============================================================================
// NOISE & INTERPOLATION UTILITIES
// ============================================================================

/**
 * Perlin-style 2D value noise with interpolation
 * Simple implementation suitable for terrain
 */
function fmValueNoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  // Get corner values using seeded hash
  const n00 = fmHashNoise(xi, yi);
  const n10 = fmHashNoise(xi + 1, yi);
  const n01 = fmHashNoise(xi, yi + 1);
  const n11 = fmHashNoise(xi + 1, yi + 1);

  // Smooth interpolation
  const u = fmSmoothstep(xf);
  const v = fmSmoothstep(yf);

  // Bilinear interpolation
  const nx0 = fmLerp(n00, n10, u);
  const nx1 = fmLerp(n01, n11, u);
  const result = fmLerp(nx0, nx1, v);

  return result;
}

/**
 * Seeded hash function for noise
 */
function fmHashNoise(x, y) {
  let n = Math.sin(x * 12.9898 + y * 78.233 + fmSeedValue) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Smoothstep interpolation curve
 */
function fmSmoothstep(t) {
  return t * t * (3 - 2 * t);
}

/**
 * Linear interpolation
 */
function fmLerp(a, b, t) {
  return a + (b - a) * t;
}

// ============================================================================
// HEIGHTMAP GENERATION
// ============================================================================

/**
 * Generate a heightmap using multi-octave noise
 * Returns 2D array [row][col] of values 0-1
 */
function fmGenerateHeightmap(cols, rows, terrainType) {
  const heightmap = [];

  // Initialize 2D array
  for (let r = 0; r < rows; r++) {
    heightmap[r] = [];
    for (let c = 0; c < cols; c++) {
      heightmap[r][c] = 0;
    }
  }

  // Multi-octave noise
  const octaves = 6;
  const persistence = 0.5;
  const lacunarity = 2.0;

  let amplitude = 1.0;
  let frequency = 1.0;
  let maxValue = 0;

  // Generate noise for each octave
  for (let oct = 0; oct < octaves; oct++) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c / cols) * frequency;
        const y = (r / rows) * frequency;
        const noiseVal = fmValueNoise(x, y);
        heightmap[r][c] += noiseVal * amplitude;
      }
    }

    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  // Normalize to 0-1
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      heightmap[r][c] /= maxValue;
    }
  }

  // Apply edge falloff - cells near edges trend toward ocean
  const falloffStrength = 0.3;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const edgeDist = Math.min(
        r / rows,
        (rows - r) / rows,
        c / cols,
        (cols - c) / cols
      );
      const falloff = Math.pow(Math.max(0, edgeDist * 3 - 1), 2);
      heightmap[r][c] *= (1 - falloffStrength) + falloff * falloffStrength;
    }
  }

  // Apply terrain type adjustments
  if (terrainType === 'archipelago') {
    // Reduce overall height, favor islands
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        heightmap[r][c] = Math.pow(heightmap[r][c], 1.5);
      }
    }
  } else if (terrainType === 'pangaea') {
    // Increase overall height, favor single landmass
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        heightmap[r][c] = Math.pow(heightmap[r][c], 0.7);
      }
    }
  }
  // 'continental' uses default noise

  return heightmap;
}

// ============================================================================
// MOISTURE MAP GENERATION
// ============================================================================

/**
 * Generate moisture map based on distance to water and rain shadow
 */
function fmGenerateMoisture(cols, rows, heightmap, waterLevel, mountainLevel) {
  const moisture = [];

  // Initialize
  for (let r = 0; r < rows; r++) {
    moisture[r] = [];
    for (let c = 0; c < cols; c++) {
      moisture[r][c] = 0;
    }
  }

  // Base moisture from distance to water
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const h = heightmap[r][c];

      if (h <= waterLevel) {
        // Water cells get full moisture
        moisture[r][c] = 1.0;
      } else {
        // Find distance to nearest water
        let minDist = Infinity;
        for (let rr = 0; rr < rows; rr++) {
          for (let cc = 0; cc < cols; cc++) {
            if (heightmap[rr][cc] <= waterLevel) {
              const dist = Math.sqrt((r - rr) ** 2 + (c - cc) ** 2);
              minDist = Math.min(minDist, dist);
            }
          }
        }

        // Moisture decreases with distance from water (max ~40 cells away)
        const maxDist = 40;
        moisture[r][c] = Math.max(0, 1 - (minDist / maxDist));
      }
    }
  }

  // Apply rain shadow (west-to-east wind)
  // Cells behind mountains lose moisture
  const rainShadowStrength = 0.4;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (heightmap[r][c] > mountainLevel) {
        // This is a mountain - cast shadow to the east
        for (let cc = c + 1; cc < Math.min(c + 15, cols); cc++) {
          const shadowFalloff = 1 - ((cc - c) / 15);
          moisture[r][cc] *= (1 - rainShadowStrength * shadowFalloff);
        }
      }
    }
  }

  // Smooth moisture map with simple averaging
  const smoothed = [];
  for (let r = 0; r < rows; r++) {
    smoothed[r] = [];
    for (let c = 0; c < cols; c++) {
      let sum = 0;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
            sum += moisture[rr][cc];
            count++;
          }
        }
      }
      smoothed[r][c] = sum / count;
    }
  }

  return smoothed;
}

// ============================================================================
// TEMPERATURE MAP GENERATION
// ============================================================================

/**
 * Generate temperature map based on latitude and altitude
 */
function fmGenerateTemperature(cols, rows, heightmap, mountainLevel) {
  const temperature = [];

  for (let r = 0; r < rows; r++) {
    temperature[r] = [];
    for (let c = 0; c < cols; c++) {
      // Latitude-based: hot at equator (middle rows), cold at poles
      const latitudeFactor = 1 - Math.abs((r / rows) - 0.5) * 2;
      let temp = latitudeFactor;

      // Altitude cooling: higher elevation = colder
      const h = heightmap[r][c];
      const elevationCooling = Math.max(0, h - mountainLevel) * 0.5;
      temp = Math.max(0, temp - elevationCooling);

      // Clamp to 0-1
      temperature[r][c] = Math.max(0, Math.min(1, temp));
    }
  }

  return temperature;
}

// ============================================================================
// BIOME ASSIGNMENT
// ============================================================================

/**
 * Determine biome for a cell based on height, moisture, and temperature
 */
function fmGetBiome(height, moisture, temperature, waterLevel, mountainLevel) {
  // Water biomes
  if (height < waterLevel) {
    if (height < waterLevel - 0.15) {
      return 'deep_ocean';
    } else if (height < waterLevel - 0.05) {
      return 'ocean';
    } else {
      return 'coast';
    }
  }

  // High elevation biomes
  if (height > mountainLevel + 0.1) {
    return 'snow_peak';
  }
  if (height > mountainLevel) {
    return 'mountain';
  }
  if (height > mountainLevel - 0.08) {
    return 'hills';
  }

  // Lowland biomes based on temperature and moisture
  if (temperature < 0.2) {
    return 'tundra';
  }
  if (temperature < 0.3 && moisture < 0.3) {
    return 'tundra';
  }
  if (moisture < 0.15) {
    return 'desert';
  }
  if (moisture < 0.25 && temperature > 0.6) {
    return 'desert';
  }
  if (moisture > 0.7 && height < waterLevel + 0.08) {
    return 'swamp';
  }
  if (moisture > 0.6) {
    return 'dense_forest';
  }
  if (moisture > 0.4) {
    return 'forest';
  }

  return 'grassland';
}

/**
 * Assign biomes to all cells based on generated maps
 */
function fmAssignBiomes(cols, rows, heightmap, moisture, temperature, waterLevel, mountainLevel) {
  const cells = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const h = heightmap[r][c];
      const m = moisture[r][c];
      const t = temperature[r][c];

      const biome = fmGetBiome(h, m, t, waterLevel, mountainLevel);

      const cell = {
        x: c,
        y: r,
        col: c,
        row: r,
        height: h,
        moisture: m,
        temperature: t,
        biome: biome,
        isWater: h < waterLevel,
        isCoast: biome === 'coast',
        isRiver: false,
        isMountain: biome === 'mountain' || biome === 'snow_peak',
        isForest: biome === 'forest' || biome === 'dense_forest',
        isLake: false,
        kingdomId: null
      };

      cells.push(cell);
    }
  }

  return cells;
}

// ============================================================================
// LAKE DETECTION
// ============================================================================

/**
 * Find enclosed low-elevation areas and mark as lakes
 */
function fmDetectLakes(cols, rows, heightmap, waterLevel, mountainLevel) {
  const lakes = [];
  const visited = [];

  // Initialize visited array
  for (let r = 0; r < rows; r++) {
    visited[r] = [];
    for (let c = 0; c < cols; c++) {
      visited[r][c] = false;
    }
  }

  // Flood-fill from each unvisited land cell
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const h = heightmap[r][c];

      // Skip if already visited, water, or too high
      if (visited[r][c] || h < waterLevel || h > mountainLevel) {
        continue;
      }

      // Start flood fill to find connected region
      const region = [];
      const queue = [[r, c]];
      visited[r][c] = true;
      let minHeight = h;
      let maxHeight = h;

      while (queue.length > 0) {
        const [rr, cc] = queue.shift();
        region.push([rr, cc]);

        // Check all 4 neighbors
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (Math.abs(dr) + Math.abs(dc) !== 1) continue; // Only cardinal

            const nr = rr + dr;
            const nc = cc + dc;

            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            if (visited[nr][nc]) continue;

            const nh = heightmap[nr][nc];

            // Include cells that are land and not too high
            if (nh >= waterLevel && nh <= mountainLevel) {
              visited[nr][nc] = true;
              queue.push([nr, nc]);
              minHeight = Math.min(minHeight, nh);
              maxHeight = Math.max(maxHeight, nh);
            }
          }
        }
      }

      // Check if region is enclosed (surrounded by higher terrain)
      // A region is a lake if it's surrounded by mountains or edges
      let isEnclosed = true;
      const borderCells = new Set();

      for (const [rr, cc] of region) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (Math.abs(dr) + Math.abs(dc) !== 1) continue;

            const nr = rr + dr;
            const nc = cc + dc;

            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
              isEnclosed = false;
              break;
            }

            const nh = heightmap[nr][nc];
            if (nh >= waterLevel && nh <= mountainLevel) {
              // Still land
            } else if (nh < waterLevel) {
              // Adjacent to water - not enclosed
              isEnclosed = false;
              break;
            } else {
              // Adjacent to mountains - good
              borderCells.add(`${nr},${nc}`);
            }
          }
          if (!isEnclosed) break;
        }
        if (!isEnclosed) break;
      }

      // Create lake if region is large enough and enclosed
      if (isEnclosed && region.length > 5) {
        // Calculate center
        let centerR = 0, centerC = 0;
        for (const [rr, cc] of region) {
          centerR += rr;
          centerC += cc;
        }
        centerR /= region.length;
        centerC /= region.length;

        const radius = Math.sqrt(region.length / Math.PI);

        lakes.push({
          centerRow: centerR,
          centerCol: centerC,
          radius: radius,
          height: minHeight + (maxHeight - minHeight) * 0.5,
          cellCount: region.length,
          name: '',
          cells: region.map(([rr, cc]) => rr * cols + cc)
        });
      }
    }
  }

  return lakes;
}

// ============================================================================
// RIVER GENERATION
// ============================================================================

/**
 * Generate rivers by tracing downhill from peaks
 */
function fmGenerateRivers(cols, rows, heightmap, waterLevel, mountainLevel) {
  const rivers = [];
  const flowAccumulation = [];

  // Initialize flow accumulation
  for (let r = 0; r < rows; r++) {
    flowAccumulation[r] = [];
    for (let c = 0; c < cols; c++) {
      flowAccumulation[r][c] = 1; // Each cell contributes 1 unit of flow
    }
  }

  // Find high-elevation source points for rivers
  // Use a dynamic threshold: top 15% of land elevations
  var landHeights = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (heightmap[r][c] > waterLevel) landHeights.push(heightmap[r][c]);
  landHeights.sort((a, b) => b - a);
  var riverThreshold = landHeights[Math.floor(landHeights.length * 0.15)] || mountainLevel * 0.85;

  const peaks = [];
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const h = heightmap[r][c];
      if (h <= waterLevel || h < riverThreshold) continue;

      // Must be a local maximum (higher than at least 6 of 8 neighbors)
      let higherNeighbors = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          if (heightmap[r + dr][c + dc] >= h) higherNeighbors++;
        }
      }
      let isPeak = higherNeighbors <= 2; // At most 2 neighbors higher

      if (isPeak) {
        peaks.push([r, c]);
      }
    }
  }

  // Trace from each peak
  const riverTarget = 8 + Math.floor(fmRand() * 8); // 8-15 rivers
  const selectedPeaks = fmShuffle(peaks.slice()).slice(0, Math.min(riverTarget, peaks.length));

  for (const [startR, startC] of selectedPeaks) {
    const riverPath = [];
    let r = startR;
    let c = startC;
    let flow = flowAccumulation[r][c];
    const visited = new Set();

    // Trace downhill
    while (true) {
      // Check if we reached water
      if (heightmap[r][c] <= waterLevel) {
        riverPath.push([r, c, flow]);
        break;
      }

      visited.add(`${r},${c}`);
      riverPath.push([r, c, flow]);

      // Find steepest neighbor
      let steepestNeighbor = null;
      let steepestDrop = 0;

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;

          const nr = r + dr;
          const nc = c + dc;

          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          if (visited.has(`${nr},${nc}`)) continue;

          const drop = heightmap[r][c] - heightmap[nr][nc];
          if (drop > steepestDrop) {
            steepestDrop = drop;
            steepestNeighbor = [nr, nc];
          }
        }
      }

      // If no downhill neighbor, stop
      if (!steepestNeighbor) {
        break;
      }

      // Move to neighbor and accumulate flow
      [r, c] = steepestNeighbor;
      flow += flowAccumulation[r][c];

      // Prevent infinite loops
      if (riverPath.length > 500) {
        break;
      }
    }

    if (riverPath.length > 5) {
      rivers.push({
        path: riverPath,
        length: riverPath.length,
        maxFlow: Math.max(...riverPath.map(p => p[2])),
        name: ''
      });
    }
  }

  return rivers;
}

// ============================================================================
// COASTLINE EXTRACTION
// ============================================================================

/**
 * Extract coastline polylines by walking boundary between land and water
 */
function fmExtractCoastlines(cols, rows, heightmap, waterLevel) {
  const coastlines = [];
  const visited = new Set();

  // Find all coast cells
  const coastCells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const h = heightmap[r][c];
      if (h <= waterLevel) continue; // Skip water

      // Check if adjacent to water
      let isCoast = false;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;

          const nr = r + dr;
          const nc = c + dc;

          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
            isCoast = true;
            break;
          }

          if (heightmap[nr][nc] <= waterLevel) {
            isCoast = true;
            break;
          }
        }
        if (isCoast) break;
      }

      if (isCoast) {
        coastCells.push([r, c]);
      }
    }
  }

  // Trace coastline paths
  for (let i = 0; i < coastCells.length; i++) {
    const [startR, startC] = coastCells[i];
    const key = `${startR},${startC}`;

    if (visited.has(key)) continue;

    const coastline = [];
    let r = startR;
    let c = startC;
    let prevDir = -1;

    // Trace along coast
    for (let step = 0; step < 1000; step++) {
      coastline.push([r, c]);
      visited.add(`${r},${c}`);

      // Find next coast cell (prefer continuing in same direction)
      let found = false;

      // Try directions in order (clockwise from previous direction)
      for (let offset = 0; offset < 8; offset++) {
        const dir = (prevDir + offset + 1) % 8;
        const dr = Math.floor(dir / 3) - 1;
        const dc = (dir % 3) - 1;

        const nr = r + dr;
        const nc = c + dc;

        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (visited.has(`${nr},${nc}`)) continue;

        const h = heightmap[nr][nc];
        if (h <= waterLevel) continue; // Skip water

        // Check if neighbor is coast
        let isCoast = false;
        for (let dr2 = -1; dr2 <= 1; dr2++) {
          for (let dc2 = -1; dc2 <= 1; dc2++) {
            if (dr2 === 0 && dc2 === 0) continue;

            const nr2 = nr + dr2;
            const nc2 = nc + dc2;

            if (nr2 < 0 || nr2 >= rows || nc2 < 0 || nc2 >= cols) {
              isCoast = true;
              break;
            }

            if (heightmap[nr2][nc2] <= waterLevel) {
              isCoast = true;
              break;
            }
          }
          if (isCoast) break;
        }

        if (isCoast) {
          r = nr;
          c = nc;
          prevDir = dir;
          found = true;
          break;
        }
      }

      if (!found || (r === startR && c === startC && step > 10)) {
        break;
      }
    }

    if (coastline.length > 5) {
      coastlines.push(coastline);
    }
  }

  return coastlines;
}

// ============================================================================
// WORLD GENERATION FUNCTION
// ============================================================================

/**
 * Main world generation function
 * @param {Object} options - {size, terrainType, nameStyle}
 */
function fmGenerateWorld(options) {
  const opts = options || {};
  const terrainType = opts.terrainType || 'continental';
  const nameStyle = opts.nameStyle || 'fantasy';

  const cols = FMap.grid.cols;
  const rows = FMap.grid.rows;

  // Set seed (never allow 0 — xorshift produces all zeros)
  if (opts.seed !== undefined && opts.seed !== 0) {
    FMap.seed = opts.seed;
  }
  if (!FMap.seed) {
    FMap.seed = Math.floor(Math.random() * 2147483647) + 1;
  }
  fmSeed(FMap.seed);

  // Generate heightmap
  const heightmap = fmGenerateHeightmap(cols, rows, terrainType);
  FMap.grid.heightmap = heightmap;

  // Generate moisture and temperature maps
  const moisture = fmGenerateMoisture(cols, rows, heightmap, FMap.world.waterLevel, FMap.world.mountainLevel);
  FMap.grid.moisture = moisture;

  const temperature = fmGenerateTemperature(cols, rows, heightmap, FMap.world.mountainLevel);
  FMap.grid.temperature = temperature;

  // Assign biomes to cells
  const cells = fmAssignBiomes(cols, rows, heightmap, moisture, temperature, FMap.world.waterLevel, FMap.world.mountainLevel);
  FMap.grid.cells = cells;

  // Detect lakes
  const lakes = fmDetectLakes(cols, rows, heightmap, FMap.world.waterLevel, FMap.world.mountainLevel);
  FMap.world.lakes = lakes;

  // Mark lake cells
  for (const lake of lakes) {
    for (const cellIdx of lake.cells) {
      if (cellIdx < cells.length) {
        cells[cellIdx].isLake = true;
        cells[cellIdx].biome = 'lake';
      }
    }
  }

  // Generate rivers
  const rivers = fmGenerateRivers(cols, rows, heightmap, FMap.world.waterLevel, FMap.world.mountainLevel);
  FMap.world.rivers = rivers;

  // Mark river cells
  for (const river of rivers) {
    for (const [r, c, flow] of river.path) {
      const idx = r * cols + c;
      if (idx < cells.length) {
        cells[idx].isRiver = true;
      }
    }
  }

  // Extract coastlines
  const coastlines = fmExtractCoastlines(cols, rows, heightmap, FMap.world.waterLevel);
  FMap.world.features.coastlines = coastlines;

  // Update world data
  FMap.world.nameStyle = nameStyle;
  FMap.world.size = opts.size || 'medium';
  FMap.world.name = fmGenerateWorldName(nameStyle);

  return FMap;
}

// ============================================================================
// UTILITY: World Name Generation
// ============================================================================

function fmGenerateWorldName(style) {
  const fantasyNames = [
    'Aethermoor', 'Valorian', 'Thornwick', 'Celestia', 'Grimhold',
    'Meridian', 'Shadowpeak', 'Goldleaf', 'Stormhaven', 'Winterheim',
    'Sunfire', 'Mystvale', 'Ironforge', 'Starlight', 'Darkwater'
  ];

  if (style === 'fantasy') {
    return fmPick(fantasyNames);
  }

  // Generic fallback
  return 'World ' + Math.floor(fmRand() * 10000);
}

// ============================================================================
// === END PART 1: TERRAIN ENGINE ===
// ============================================================================

// ============================================================================
// PART 2: POLITICAL LAYER - KINGDOMS, SETTLEMENTS, ROADS, POIs
// ============================================================================

// ============================================================================
// 1. NAME GENERATION SYSTEM
// ============================================================================

const fmNameGen = {
  // Syllable pools for each culture
  cultures: {
    fantasy: {
      prefixes: ['Val', 'Dra', 'Thal', 'Mor', 'Nyx', 'Aet', 'Sol', 'Lun', 'Vor', 'Syl', 'Cri', 'Ald', 'Mir', 'Ren', 'Vess', 'Ast', 'Cyn', 'Pher', 'Iz', 'Wyn'],
      middles: ['dor', 'ath', 'in', 'is', 'an', 'eth', 'ar', 'ir', 'ur', 'ol', 'el', 'al', 'um', 'on', 'en', 'ian', 'ion', 'iel', 'ael', 'aes'],
      suffixes: ['heim', 'haven', 'hold', 'reach', 'wood', 'field', 'ford', 'stone', 'peak', 'dale', 'mark', 'wyn', 'rath', 'tor', 'wick', 'ham', 'burg', 'port', 'crest', 'fall'],
      features: {
        mountain: ['Ironpeak', 'Stormcrest', 'Shattered', 'Dragonspine', 'Skyreach', 'Frostfang', 'Blackthorn', 'Silverfang', 'Coldpeak', 'Ravenfang'],
        forest: ['Darkwood', 'Shadowglen', 'Greenleaf', 'Whisperwood', 'Deepwood', 'Thornwald', 'Eldergrove', 'Mystic Woods', 'Ravencrest Forest', 'Enchanted Wilds'],
        sea: ['The Sapphire', 'The Endless Deep', 'The Shifting Sea', 'The Azure Waters', 'The Tempest Ocean', 'The Shattered Strait', 'The Lonely Deep', 'The Sunken Realm', 'The Twilight Sea', 'The Abyssal Dark'],
        river: ['Silverrun', 'Stormflow', 'Darkwater', 'Goldstream', 'Swiftcourse', 'Boneriver', 'Mistway', 'Thornbrook', 'Ashflow', 'Moonwater'],
        lake: ['Glaciermere', 'Starlight Lake', 'Moonshadow Pool', 'Darkwater Lake', 'Crystal Mere', 'Silent Pool', 'Drowned Castle Lake', 'Shattered Mirror', 'Twilight Lake', 'Lost Depths'],
        desert: ['The Sunscourge', 'The Golden Waste', 'The Scorched Expanse', 'The Dustpan', 'The Bleached Lands', 'The Ashfields', 'The Endless Sand', 'The Crimson Waste', 'The Dead Valley', 'The Shattered Sands'],
        swamp: ['Blightmire', 'Deadmarsh', 'Rottenfen', 'Cursed Mire', 'Shadowfen', 'Bogrot', 'Sickswamp', 'Ghostfens', 'Strangler\'s Marsh', 'Blackwater Bog']
      },
      poi: ['The Sunken Crypt', 'Temple of the Dawn', 'Ruins of Aldmoor', 'The Obsidian Tower', 'Cave of Echoes', 'Shrine of Stars', 'The Shattered Keep', 'Wizard\'s Vale', 'The Drowned Temple', 'Fortress Eternal', 'The Hidden Sanctum', 'Dragon\'s Rest', 'The Crimson Spire', 'Lost Library', 'The Midnight Tower']
    },
    norse: {
      prefixes: ['Bjorn', 'Raven', 'Storm', 'Thor', 'Grim', 'Sver', 'Hel', 'Jor', 'Knut', 'Leif', 'Ulf', 'Berg', 'Stein', 'Frode', 'Sig', 'Dag', 'Nott', 'Vind', 'Frost', 'Hal'],
      middles: ['ar', 'en', 'in', 'an', 'ur', 'vik', 'heim', 'sund', 'fyrd', 'jord', 'stad', 'fell', 'tun', 'dal', 'skerry', 'nyn', 'mark', 'folk', 'gard', 'holmr'],
      suffixes: ['heim', 'vik', 'stad', 'fjord', 'fell', 'ness', 'mark', 'fold', 'hold', 'garde', 'holm', 'tun', 'by', 'folk', 'gard', 'kaup', 'skerry', 'sund', 'dal', 'ey'],
      features: {
        mountain: ['Ironheim', 'Skyfall', 'Stormcrags', 'Frostheim', 'Grimfell', 'Blackstone', 'Ravenfang', 'Shattered Peak', 'Stoneheim', 'Dragoncrags'],
        forest: ['Darkwood Vale', 'Wolfwood', 'Eldergrove', 'Shadowglen', 'Frostwood', 'Mistwald', 'Greenheim', 'Thornwood', 'Deepwood', 'Blackforest'],
        sea: ['The Northsea', 'The Storm Strait', 'The Jade Deep', 'The Shattered Wave', 'The Grey Ocean', 'The Endless Waters', 'The Fjord Runs', 'The Treacherous Deep', 'The Norse Waters', 'The Frozen Sea'],
        river: ['Silverrun', 'Stormflow', 'Icewater', 'Wolfrun', 'Hardanger', 'Raindancer', 'Thortun', 'Viggrun', 'Frostheim', 'Bjornwater'],
        lake: ['Glaciermere', 'Icewater Lake', 'Grimtarn', 'Frostholm', 'Darkwater', 'Stormholm', 'Ravenmere', 'Northholm', 'Skypool', 'Frozen Mere'],
        desert: ['The Ashlands', 'The Scorched Badlands', 'The Dustheap', 'The Burning Waste', 'The Grey Wilds', 'The Dead Marches', 'The Golden Expanse', 'The Sunblasted Plains', 'The Windswept Flats', 'The Forsaken Valley'],
        swamp: ['Rottenfen', 'Blightmire', 'Bogrot', 'Murkmere', 'Foulfen', 'Cursed Marshes', 'Shadowfen', 'Deadland Mire', 'Ghostfens', 'The Rotten Depths']
      },
      poi: ['The Great Hall', 'Tomb of Heroes', 'The Drowned Temple', 'Frostheim Tower', 'The Obsidian Depths', 'Shrine of Odin', 'Ruined Fortress', 'The Rune Stone Circle', 'Hall of the Ancients', 'The Dragon\'s Mound']
    },
    celtic: {
      prefixes: ['Bran', 'Dun', 'Kel', 'Lugh', 'Aed', 'Fionn', 'Conn', 'Cath', 'Sidh', 'Mór', 'Cael', 'Airne', 'Bel', 'Caer', 'Doire', 'Fid', 'Glas', 'Innis', 'Lon', 'Ros'],
      middles: ['an', 'en', 'in', 'adh', 'ach', 'och', 'ugh', 'aig', 'aidh', 'eadh', 'ithe', 'ath', 'eas', 'cladh', 'tuath', 'muig', 'fonn', 'lagh', 'dach', 'gal'],
      suffixes: ['sidh', 'din', 'fort', 'baile', 'cill', 'derry', 'more', 'finn', 'linn', 'tane', 'gaoth', 'tulach', 'cliffe', 'leah', 'glas', 'ness', 'bog', 'wood', 'vale', 'rock'],
      features: {
        mountain: ['Beannagh', 'Sliabh Gréine', 'Carraigheannagh', 'Cruach Dubh', 'An Spéir Dorcha', 'Sliabh Mór', 'Cnoc Fionnaidh', 'Barr Dubhgheal', 'An Bré', 'Carraigeán'],
        forest: ['Coilltean Dorcha', 'Fiodh Glas', 'Craobh Dhubh', 'Doire Tréan', 'Fiadh Gheal', 'Coill Cheannann', 'Fiodh Chaoil', 'Doire Fiadh', 'Sceimh Gheal', 'Fiodh an Chobhair'],
        sea: ['An Muir Thuaidh', 'An Fharraige Gheal', 'An Charraig Dhubh', 'An Spréacharnach', 'An Muir Mór', 'An Fharraige Réaltach', 'An Dúlachán', 'An Charraige Thréan', 'An Muir Gheal', 'An Fharraige Dorcha'],
        river: ['Abhainn Airgid', 'Abhainn Geal', 'Abhainn Dhubh', 'Abhainn na Gréine', 'Abhainn Fhuar', 'Abhainn Thréan', 'Abhainn Ghlas', 'Abhainn Chaol', 'Abhainn Shiúil', 'Abhainn Chluichí'],
        lake: ['Loch Geal', 'Loch Dubh', 'Loch an Spréacharnach', 'Loch Réaltach', 'Loch Glas', 'Loch Fuar', 'Loch an Éisc', 'Loch an Chobhair', 'Loch Tréan', 'Loch an Dorchadas'],
        desert: ['An Fhásach Dhubh', 'An Spréachleacht Dhóite', 'Na Tirim-Thuaidh', 'An Fhásach Gheal', 'An Fhásach Thuaidh', 'An Ghainimh Fhuar', 'An Spréachleacht Lonrach', 'An Fhásach Réamhshaolta', 'An Fhásach Fhuil', 'An Tuaidhgheal'],
        swamp: ['Bogach Dhubh', 'Féar Dorcha', 'Fálcadh Dubh', 'Bogach na Draíochta', 'Féar Foluain', 'Fálcadh Glas', 'Bogach Thréan', 'Féar an Bhhraonaigh', 'Fálcadh Síoraí', 'Bogach Lonrach']
      },
      poi: ['Tuaim an Chatha', 'Teampall an Solais', 'Fuaid Oilbhéim', 'Sídhean Gréine', 'Oileán an Draíochta', 'Teampall Mór', 'Caislean na Cianóige', 'An Carraig Dhraíochta', 'Baile na nGhost', 'Fál an tSíoraí']
    },
    arabic: {
      prefixes: ['Al', 'Ash', 'Az', 'Ibn', 'Umm', 'Jabal', 'Wadi', 'Burj', 'Kasr', 'Qalat', 'Ribat', 'Riad', 'Darb', 'Suq', 'Khan', 'Dar', 'Masjid', 'Minaret', 'Qasida', 'Zarqah'],
      middles: ['if', 'in', 'an', 'il', 'ar', 'or', 'ur', 'aq', 'ah', 'ayn', 'alah', 'adeen', 'amah', 'anah', 'iyyah', 'awiyah', 'aldeen', 'aldin', 'amid', 'amir'],
      suffixes: ['ah', 'ih', 'iyah', 'an', 'in', 'een', 'adh', 'adah', 'abad', 'stan', 'ia', 'ium', 'ara', 'istan', 'istan', 'aldin', 'aldeen', 'uddin', 'uddeen', 'alik'],
      features: {
        mountain: ['Jabal Qahira', 'Jabal Aswad', 'Jabal Ramlah', 'Jabal Qaf', 'Jabal Nur', 'Jabal Hijaz', 'Jabal Durrah', 'Jabal Sundus', 'Jabal Ashraf', 'Jabal Lubnan'],
        forest: ['Ghabet Khadra', 'Ghabet Qadimah', 'Ghabet Asrar', 'Ghabet Adib', 'Ghabet Siraj', 'Ghabet Noor', 'Ghabet Safra', 'Ghabet Amira', 'Ghabet Janna', 'Ghabet Bahira'],
        sea: ['Bahr al-Qazim', 'Bahr al-Abyad', 'Bahr al-Raha', 'Bahr al-Sidr', 'Bahr al-Gharib', 'Bahr al-Kadhim', 'Bahr al-Jammal', 'Bahr al-Noor', 'Bahr al-Lail', 'Bahr as-Samak'],
        river: ['Nahr Zahab', 'Nahr Qamar', 'Nahr Saif', 'Nahr Hana', 'Nahr Baraka', 'Nahr Samrah', 'Nahr Jadwal', 'Nahr Thuluj', 'Nahr Laban', 'Nahr Qasr'],
        lake: ['Buhayrat Azraq', 'Buhayrat Bayda', 'Buhayrat Asrar', 'Buhayrat Qamrah', 'Buhayrat Farrah', 'Buhayrat Sahra', 'Buhayrat Layali', 'Buhayrat Janah', 'Buhayrat Saba', 'Buhayrat Nur'],
        desert: ['Rimal al-Qasim', 'Sahra al-Hamra', 'Rimal al-Khali', 'Sahra al-Qahira', 'Rimal al-Nubaa', 'Sahra al-Asrar', 'Rimal al-Layali', 'Sahra al-Dhahabiyya', 'Rimal al-Labi', 'Sahra al-Faraha'],
        swamp: ['Birka Sawda', 'Marsh al-Aswad', 'Birka al-Asrar', 'Marsh al-Talyah', 'Birka Qadhirah', 'Marsh al-Lail', 'Birka al-Qalb', 'Marsh al-Haram', 'Birka as-Siyanah', 'Marsh al-Qamar']
      },
      poi: ['Qasr al-Qadimah', 'Masjid al-Noor', 'Makbarat al-Amlak', 'Burj al-Ghaib', 'Kutat al-Hikma', 'Kabir al-Sahar', 'Qalat ad-Dhahab', 'Riad al-Jinn', 'Ribat al-Akhira', 'Bayt al-Khafaya']
    },
    eastern: {
      prefixes: ['Jade', 'Silver', 'Golden', 'Mystic', 'Dragon', 'Phoenix', 'Star', 'Moon', 'Sun', 'Cloud', 'Wind', 'Water', 'Stone', 'Bamboo', 'Lotus', 'Petal', 'Autumn', 'Spring', 'Eternal', 'Serene'],
      middles: ['an', 'in', 'en', 'on', 'un', 'ai', 'ei', 'ong', 'ang', 'ing', 'iang', 'uang', 'ia', 'iao', 'ie', 'io', 'ua', 'uo', 'ue', 'üe'],
      suffixes: ['jing', 'yang', 'ling', 'ming', 'feng', 'guo', 'zhou', 'xia', 'shan', 'he', 'men', 'tang', 'hui', 'zhai', 'tian', 'hu', 'gang', 'ye', 'chen', 'an'],
      features: {
        mountain: ['Jade Dragon Peak', 'Silver Crane Mountain', 'Golden Phoenix Summit', 'Eternal Stone Ridge', 'Misty Cloud Peak', 'Phoenix Fire Mountain', 'Celestial Peak', 'Moonlit Crag', 'Sunfire Ridge', 'Serpent Spine Mountain'],
        forest: ['Bamboo Grove', 'Serene Forest', 'Mystic Woodland', 'Ancient Grove', 'Whispering Pines', 'Jade Forest', 'Phoenix Nest Woods', 'Enchanted Garden', 'Moonlit Grove', 'Eternal Glade'],
        sea: ['The Jade Sea', 'The Misty Strait', 'The Eternal Ocean', 'The Pearl Waters', 'The Moonlit Sea', 'The Dragon\'s Waters', 'The Sunlit Expanse', 'The Serene Deep', 'The Crystal Strait', 'The Heaven\'s Mirror'],
        river: ['Jade Dragon River', 'Silver Crescent Flow', 'Golden Phoenix Stream', 'Moonlight Course', 'Whispering River', 'Spirit Flow', 'Eternal Stream', 'Peach Blossom River', 'Star Water', 'Heaven\'s Path River'],
        lake: ['Jade Mirror Lake', 'Serene Pool', 'Moon Reflection Lake', 'Crystal Lotus Lake', 'Azure Heaven Pool', 'Eternal Mirror', 'Dragon\'s Eye Lake', 'Phoenix Nesting Lake', 'Starlight Pool', 'Heaven\'s Breath Lake'],
        desert: ['The Golden Wasteland', 'The Crimson Expanse', 'The Eternal Dunes', 'The Scorched Plains', 'The Endless Sand', 'The Cursed Wastes', 'The Sunblasted Flats', 'The Red Barrens', 'The Forsaken Sands', 'The Dead Lands'],
        swamp: ['Murky Marsh', 'Shadowed Wetland', 'Cursed Bog', 'Rotting Fen', 'Black Mire', 'Fetid Swamp', 'Shadow Marshland', 'Gloomy Wetland', 'Pestilent Bog', 'Sunken Marshes']
      },
      poi: ['Temple of Eternal Light', 'Jade Pagoda', 'Dragon\'s Rest', 'Phoenix Sanctuary', 'Garden of Immortals', 'Tower of Heaven', 'Shrine of Stars', 'Hall of Ancestors', 'Mystic Library', 'Peak of Enlightenment']
    }
  },

  // Helper: Generate compound names from syllables
  _syllableCombo(culture, count = 2) {
    const pool = this.cultures[culture];
    const parts = [];
    if (count >= 1) parts.push(fmPick(pool.prefixes));
    if (count >= 2) parts.push(fmPick(pool.middles));
    if (count >= 3) parts.push(fmPick(pool.suffixes));
    return parts.join('');
  },

  // Kingdom name
  kingdom(culture = 'fantasy') {
    const pool = this.cultures[culture] || this.cultures.fantasy;
    const formats = [
      () => 'The ' + this._syllableCombo(culture, 2) + ' Empire',
      () => 'Kingdom of ' + this._syllableCombo(culture, 2),
      () => 'The ' + this._syllableCombo(culture, 2) + ' Realm',
      () => this._syllableCombo(culture, 2) + ' Domain',
      () => 'The ' + this._syllableCombo(culture, 1) + ' Lands',
      () => 'Dominion of ' + this._syllableCombo(culture, 1),
      () => 'The ' + fmPick(pool.prefixes) + 'hold',
      () => this._syllableCombo(culture, 2) + ' Kingdom'
    ];
    return fmPick(formats)();
  },

  // City name
  city(culture = 'fantasy') {
    const pool = this.cultures[culture] || this.cultures.fantasy;
    const formats = [
      () => this._syllableCombo(culture, 2),
      () => fmPick(pool.prefixes) + fmPick(pool.suffixes),
      () => this._syllableCombo(culture, 3),
      () => fmPick(pool.prefixes) + 'haven',
      () => fmPick(pool.prefixes) + 'port',
      () => fmPick(pool.prefixes) + 'hold'
    ];
    return fmPick(formats)();
  },

  // Town name
  town(culture = 'fantasy') {
    const pool = this.cultures[culture] || this.cultures.fantasy;
    const formats = [
      () => this._syllableCombo(culture, 2),
      () => fmPick(pool.prefixes) + 'field',
      () => fmPick(pool.prefixes) + 'ford',
      () => fmPick(pool.prefixes) + 'wood',
      () => fmPick(pool.prefixes) + 'wick',
      () => fmPick(pool.prefixes) + fmPick(pool.suffixes)
    ];
    return fmPick(formats)();
  },

  // Hamlet name
  hamlet(culture = 'fantasy') {
    const pool = this.cultures[culture] || this.cultures.fantasy;
    const formats = [
      () => fmPick(pool.prefixes) + 'burrow',
      () => 'Old ' + fmPick(pool.prefixes),
      () => fmPick(pool.prefixes) + ' Creek',
      () => fmPick(pool.prefixes) + ' Hollow',
      () => fmPick(pool.prefixes) + ' Rest',
      () => fmPick(pool.prefixes) + ' Stead',
      () => fmPick(pool.suffixes) + ' ' + fmPick(['Spring', 'Shelter', 'Haven', 'Hearth']),
      () => this._syllableCombo(culture, 1) + 'by'
    ];
    return fmPick(formats)();
  },

  // Geographic feature name
  feature(type = 'mountain', culture = 'fantasy') {
    const pool = this.cultures[culture] || this.cultures.fantasy;
    return fmPick(pool.features[type] || pool.features.mountain);
  },

  // POI name
  poi(type = 'dungeon') {
    const typeNames = {
      dungeon: ['The Sunken Crypt', 'The Obsidian Depths', 'Darkfathom Cavern', 'The Infernal Halls', 'Tomb of Kings', 'The Black Abyss', 'Chamber of Sorrows', 'The Endless Dungeon', 'Cavern of Whispers', 'The Iron Pit'],
      ruins: ['Ruins of Aldmoor', 'The Shattered Keep', 'Lost Citadel', 'Fallen Spire', 'The Broken Kingdom', 'Ancient Ramparts', 'The Cursed Tower', 'Remnants of Glory', 'The Forgotten Fort', 'Crumbling Fortress'],
      temple: ['Temple of the Dawn', 'Shrine of Stars', 'Sacred Sanctum', 'The Sunlit Temple', 'Hall of the Divine', 'Temple Eternal', 'The Celestial Shrine', 'House of Prayer', 'The Blessed Sanctuary', 'Temple of Light'],
      tower: ['The Obsidian Tower', 'Wizard\'s Spire', 'The Silent Tower', 'Tower of Ages', 'The Starlight Tower', 'Ebon Tower', 'The Crystal Spire', 'Tower of Echoes', 'The Ancient Lighthouse', 'Tower of Mysteries'],
      cave: ['Cave of Echoes', 'The Deep Cavern', 'Hollow Depths', 'Stone Cathedral', 'The Crystal Caves', 'Cavern of Shadows', 'The Hollow Below', 'Dragon\'s Lair', 'The Singing Caves', 'Abyss Cavern'],
      shrine: ['Shrine of Stars', 'Wayfarer\'s Rest', 'Sacred Stone', 'The Hidden Shrine', 'Shrine of Hope', 'Traveler\'s Blessing', 'The Moonlit Shrine', 'Shrine of Souls', 'The Forgotten Altar', 'Sanctuary of Peace'],
      battlefield: ['Field of Sorrows', 'The Crimson Plains', 'Broken Valley', 'The Shattered Grounds', 'Valley of Echoes', 'The Scarred Earth', 'Field of Bones', 'The Fallen Plain', 'Graveyard Field', 'The Bloodied Grass'],
      mine: ['The Silver Vein', 'Deepdelve Mine', 'The Iron Shaft', 'Goldstrike Mine', 'The Obsidian Quarry', 'Brightstone Mine', 'The Hidden Vein', 'Gemstone Pit', 'The Ancient Mine', 'Deepdark Shaft'],
      camp: ['Bandit\'s Haven', 'The Forsaken Camp', 'Outlaw\'s Rest', 'The Hidden Encampment', 'Brigand\'s Hideout', 'The Nomad Camp', 'Ranger\'s Post', 'The Lost Camp', 'Stronghold Camp', 'The Rebel Base'],
      portal: ['The Void Gate', 'Portal to Beyond', 'The Shattered Gate', 'The Planar Rift', 'Gateway of Souls', 'The Cosmic Tear', 'The Mystic Portal', 'The Star Gate', 'The Dimensional Breach', 'The Eldritch Gate'],
      dragon_lair: ['Dragon\'s Rest', 'The Wyrm\'s Throne', 'The Drake\'s Sanctum', 'Draconic Peak', 'The Golden Hoard', 'Dragon\'s Eyrie', 'The Scaled Palace', 'The Draconic Temple', 'The Wyrm\'s Nest', 'The Dragon Throne']
    };
    return fmPick(typeNames[type] || typeNames.dungeon);
  },

  // NPC ruler name
  person(culture = 'fantasy') {
    const pool = this.cultures[culture] || this.cultures.fantasy;
    const titles = ['Lord', 'Lady', 'King', 'Queen', 'Prince', 'Princess', 'Duke', 'Duchess', 'Count', 'Countess'];
    const name = this._syllableCombo(culture, 2);
    return fmPick(titles) + ' ' + name;
  },

  // Tavern name
  tavern() {
    const colors = ['Red', 'Golden', 'Silver', 'Black', 'Crimson', 'Azure', 'Scarlet', 'White', 'Green', 'Purple'];
    const animals = ['Griffin', 'Dragon', 'Flagon', 'Whistle', 'Stag', 'Wolf', 'Raven', 'Lion', 'Hawk', 'Boar', 'Wyvern', 'Horse', 'Serpent', 'Swan', 'Oak', 'Anvil', 'Crown', 'Cauldron', 'Sword', 'Shield'];
    const formats = [
      () => 'The ' + fmPick(colors) + ' ' + fmPick(animals),
      () => 'The ' + fmPick(animals) + '\'s ' + fmPick(['Rest', 'Haven', 'Inn', 'Hall', 'House']),
      () => 'The ' + fmPick(animals) + ' and ' + fmPick(animals),
      () => fmPick(['The Rusty', 'The Broken', 'The Leaky', 'The Cozy', 'The Warm', 'The Dark', 'The Merry']) + ' ' + fmPick(animals),
      () => fmPick(colors) + ' ' + fmPick(['Lounge', 'Pub', 'Inn', 'Tavern', 'House', 'Lodge'])
    ];
    return fmPick(formats)();
  }
};

// ============================================================================
// 2. KINGDOM GENERATION
// ============================================================================

function fmGenerateKingdoms() {
  const { cols, rows } = FMap.grid;
  // Use world size setting for kingdom count
  var sizeRanges = { small: [5, 7], medium: [6, 9], large: [7, 10] };
  var range = sizeRanges[FMap.world.size] || sizeRanges.medium;
  const numKingdoms = fmRandInt(range[0], range[1]);

  const kingdomColorPalette = [
    {fill:'rgba(180,50,50,0.15)', border:'rgba(180,50,50,0.6)', text:'#b43232'},
    {fill:'rgba(50,100,180,0.15)', border:'rgba(50,100,180,0.6)', text:'#3264b4'},
    {fill:'rgba(50,150,80,0.15)', border:'rgba(50,150,80,0.6)', text:'#329650'},
    {fill:'rgba(140,60,160,0.15)', border:'rgba(140,60,160,0.6)', text:'#8c3ca0'},
    {fill:'rgba(200,130,30,0.15)', border:'rgba(200,130,30,0.6)', text:'#c8821e'},
    {fill:'rgba(40,150,140,0.15)', border:'rgba(40,150,140,0.6)', text:'#28968c'},
    {fill:'rgba(160,80,40,0.15)', border:'rgba(160,80,40,0.6)', text:'#a05028'},
    {fill:'rgba(100,100,150,0.15)', border:'rgba(100,100,150,0.6)', text:'#646496'},
    {fill:'rgba(180,160,40,0.15)', border:'rgba(180,160,40,0.6)', text:'#b4a028'}
  ];

  const cultures = ['fantasy', 'norse', 'celtic', 'arabic', 'eastern'];
  const kingdoms = [];
  const seedCells = [];

  // Find valid seed cells for kingdoms
  function findValidSeedCell(existingSeeds) {
    let attempts = 0;
    while (attempts < 100) {
      const row = fmRandInt(10, rows - 10);
      const col = fmRandInt(10, cols - 10);
      const cell = FMap.grid.cells[row * cols + col];

      // Must be habitable, not water, not mountain
      if (cell && !cell.isWater && !cell.isMountain) {
        // Check distance from other seeds
        let tooClose = false;
        for (let seed of existingSeeds) {
          const dist = Math.sqrt(Math.pow(seed.row - row, 2) + Math.pow(seed.col - col, 2));
          if (dist < 40) {
            tooClose = true;
            break;
          }
        }
        if (!tooClose) return {row, col};
      }
      attempts++;
    }
    return null;
  }

  // Create kingdom seed cells
  for (let i = 0; i < numKingdoms; i++) {
    const seed = findValidSeedCell(seedCells);
    if (seed) {
      seedCells.push(seed);
      const culture = fmPick(cultures);
      const name = fmNameGen.kingdom(culture);
      const ruler = fmNameGen.person(culture);
      const color = kingdomColorPalette[i % kingdomColorPalette.length];

      kingdoms.push({
        id: i,
        name: name,
        ruler: ruler,
        culture: culture,
        color: color,
        seedCell: seed,
        cells: [],
        capital: null,
        cities: [],
        area: 0
      });
    }
  }

  // Flood fill to grow kingdoms
  for (let kingdom of kingdoms) {
    const visited = new Set();
    const queue = [kingdom.seedCell];
    visited.add(`${kingdom.seedCell.row},${kingdom.seedCell.col}`);

    while (queue.length > 0) {
      const current = queue.shift();
      const cell = FMap.grid.cells[current.row * cols + current.col];

      if (!cell || cell.isWater) continue;

      // Assign cell to kingdom
      cell.kingdomId = kingdom.id;
      kingdom.cells.push(cell);

      // Try to expand to neighbors
      const neighbors = [
        {row: current.row - 1, col: current.col},
        {row: current.row + 1, col: current.col},
        {row: current.row, col: current.col - 1},
        {row: current.row, col: current.col + 1}
      ];

      for (let neighbor of neighbors) {
        if (neighbor.row < 0 || neighbor.row >= rows || neighbor.col < 0 || neighbor.col >= cols) continue;
        const key = `${neighbor.row},${neighbor.col}`;
        if (visited.has(key)) continue;
        visited.add(key);

        const nCell = FMap.grid.cells[neighbor.row * cols + neighbor.col];
        if (!nCell || nCell.isWater) continue;

        // Can cross mountains/rivers with difficulty
        let canCross = true;
        let shouldAdd = true;

        if (nCell.isMountain && fmRand() > 0.2) canCross = false;
        if (nCell.isRiver && fmRand() > 0.5) canCross = false;

        if (canCross) {
          queue.push(neighbor);
        }
      }
    }

    kingdom.area = kingdom.cells.length;
  }

  FMap.world.kingdoms = kingdoms;
  return kingdoms;
}

// ============================================================================
// 3. SETTLEMENT PLACEMENT
// ============================================================================

function fmGenerateSettlements() {
  const { cols } = FMap.grid;
  const settlements = [];
  let settlementId = 0;

  const settlementTraits = [
    'trade hub', 'mining town', 'port city', 'fortress', 'holy site',
    'scholar\'s refuge', 'artist colony', 'merchant\'s haven', 'garrison',
    'fishing village', 'agricultural center', 'shipyard', 'library'
  ];

  const buildingNames = {
    tavern: () => fmNameGen.tavern(),
    temple: () => 'Temple of ' + fmNameGen._syllableCombo(fmPick(['fantasy', 'norse', 'celtic']), 1),
    market: () => 'Central Market',
    guild: () => fmPick(['Thieves\' Guild', 'Mages\' College', 'Merchant\'s Guild', 'Craftsmen\'s Hall', 'Adventurers\' Hall']),
    other: () => fmPick(['Blacksmith', 'Town Hall', 'Library', 'Watch House', 'Armory', 'Stable', 'Inn'])
  };

  function getSettlementTraits(settlement) {
    const traits = [];
    if (settlement.isCoastal) traits.push('port city');
    if (settlement.isRiver) traits.push('trade hub');

    // Add random traits
    while (traits.length < 2 && fmRand() > 0.4) {
      const trait = fmPick(settlementTraits);
      if (!traits.includes(trait)) traits.push(trait);
    }
    return traits;
  }

  function getBuildings(settlement) {
    const buildings = [];
    buildings.push(buildingNames.tavern());
    buildings.push(buildingNames.temple());
    if (settlement.population > 500) {
      buildings.push(buildingNames.guild());
    }
    if (settlement.population > 1000) {
      buildings.push(buildingNames.other());
    }
    return buildings;
  }

  function isValidSettlementLocation(row, col, minDist) {
    if (row < 0 || row >= FMap.grid.rows || col < 0 || col >= cols) return false;
    const cell = FMap.grid.cells[row * cols + col];
    if (!cell || cell.isWater || cell.isMountain) return false;

    // Check distance from other settlements
    for (let settlement of settlements) {
      const dist = Math.sqrt(Math.pow(settlement.row - row, 2) + Math.pow(settlement.col - col, 2));
      if (dist < minDist) return false;
    }
    return true;
  }

  // For each kingdom, place settlements
  for (let kingdom of FMap.world.kingdoms) {
    const culture = kingdom.culture;

    // 1. Capital at seed cell
    const seedCell = kingdom.seedCell;
    const capital = {
      id: `settlement_${settlementId++}`,
      name: fmNameGen.city(culture),
      type: 'capital',
      population: fmRandInt(10000, 80000),
      kingdomId: kingdom.id,
      row: seedCell.row,
      col: seedCell.col,
      x: 0,
      y: 0,
      isCoastal: FMap.grid.cells[seedCell.row * cols + seedCell.col].isCoast,
      isRiver: FMap.grid.cells[seedCell.row * cols + seedCell.col].isRiver,
      ruler: kingdom.ruler,
      traits: ['capital'],
      buildings: getBuildings({population: fmRandInt(10000, 80000)}),
      pois: []
    };
    settlements.push(capital);
    kingdom.capital = capital;
    kingdom.cities.push(capital);

    // 2. Cities (2-4 per kingdom)
    const numCities = fmRandInt(2, 5);
    for (let i = 0; i < numCities; i++) {
      let placed = false;
      for (let attempt = 0; attempt < 50; attempt++) {
        const idx = fmRandInt(0, kingdom.cells.length);
        const kCell = kingdom.cells[idx];
        if (isValidSettlementLocation(kCell.row, kCell.col, 15)) {
          const city = {
            id: `settlement_${settlementId++}`,
            name: fmNameGen.city(culture),
            type: 'city',
            population: fmRandInt(3000, 15000),
            kingdomId: kingdom.id,
            row: kCell.row,
            col: kCell.col,
            x: 0,
            y: 0,
            isCoastal: kCell.isCoast,
            isRiver: kCell.isRiver,
            ruler: fmNameGen.person(culture),
            traits: getSettlementTraits({isCoastal: kCell.isCoast, isRiver: kCell.isRiver}),
            buildings: getBuildings({population: fmRandInt(3000, 15000)}),
            pois: []
          };
          settlements.push(city);
          kingdom.cities.push(city);
          placed = true;
          break;
        }
      }
    }

    // 3. Towns (4-8 per kingdom)
    const numTowns = fmRandInt(4, 9);
    for (let i = 0; i < numTowns; i++) {
      let placed = false;
      for (let attempt = 0; attempt < 50; attempt++) {
        const idx = fmRandInt(0, kingdom.cells.length);
        const kCell = kingdom.cells[idx];
        if (isValidSettlementLocation(kCell.row, kCell.col, 8)) {
          const town = {
            id: `settlement_${settlementId++}`,
            name: fmNameGen.town(culture),
            type: 'town',
            population: fmRandInt(500, 3000),
            kingdomId: kingdom.id,
            row: kCell.row,
            col: kCell.col,
            x: 0,
            y: 0,
            isCoastal: kCell.isCoast,
            isRiver: kCell.isRiver,
            ruler: '',
            traits: getSettlementTraits({isCoastal: kCell.isCoast, isRiver: kCell.isRiver}),
            buildings: getBuildings({population: fmRandInt(500, 3000)}),
            pois: []
          };
          settlements.push(town);
          placed = true;
          break;
        }
      }
    }

    // 4. Hamlets (6-12 per kingdom)
    const numHamlets = fmRandInt(6, 13);
    for (let i = 0; i < numHamlets; i++) {
      let placed = false;
      for (let attempt = 0; attempt < 50; attempt++) {
        const idx = fmRandInt(0, kingdom.cells.length);
        const kCell = kingdom.cells[idx];
        if (isValidSettlementLocation(kCell.row, kCell.col, 4)) {
          const hamlet = {
            id: `settlement_${settlementId++}`,
            name: fmNameGen.hamlet(culture),
            type: 'hamlet',
            population: fmRandInt(50, 500),
            kingdomId: kingdom.id,
            row: kCell.row,
            col: kCell.col,
            x: 0,
            y: 0,
            isCoastal: kCell.isCoast,
            isRiver: kCell.isRiver,
            ruler: '',
            traits: [],
            buildings: [],
            pois: []
          };
          settlements.push(hamlet);
          placed = true;
          break;
        }
      }
    }
  }

  FMap.world.settlements = settlements;
  return settlements;
}

// ============================================================================
// 4. ROAD NETWORK WITH A* PATHFINDING
// ============================================================================

// Priority queue for A* algorithm
class PriorityQueue {
  constructor() {
    this.items = [];
  }
  enqueue(item, priority) {
    const newItem = {item, priority};
    let added = false;
    for (let i = 0; i < this.items.length; i++) {
      if (newItem.priority < this.items[i].priority) {
        this.items.splice(i, 0, newItem);
        added = true;
        break;
      }
    }
    if (!added) this.items.push(newItem);
  }
  dequeue() {
    return this.items.shift();
  }
  isEmpty() {
    return this.items.length === 0;
  }
}

// A* Pathfinding
function fmAStarPath(start, goal, cols, rows) {
  const getCost = (cell) => {
    if (!cell || cell.isWater) return Infinity;
    if (cell.isMountain) return 15;
    if (cell.isMountain && cell.height > 0.75) return Infinity;
    if (cell.isForest || cell.biome === 'dense_forest') return 3;
    if (cell.biome === 'swamp') return 8;
    if (cell.biome === 'desert') return 4;
    if (cell.biome === 'grassland' || cell.biome === 'hills') return (cell.biome === 'hills' ? 5 : 1);
    if (cell.isCoast || cell.biome === 'beach') return 2;
    return 2;
  };

  const heuristic = (a, b) => {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
  };

  const openSet = new PriorityQueue();
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  const key = (row, col) => `${row},${col}`;
  const startKey = key(start.row, start.col);
  const goalKey = key(goal.row, goal.col);

  openSet.enqueue(start, 0);
  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(start, goal));

  while (!openSet.isEmpty()) {
    const current = openSet.dequeue().item;
    const currentKey = key(current.row, current.col);

    if (currentKey === goalKey) {
      // Reconstruct path
      const path = [current];
      let prev = current;
      while (cameFrom.has(key(prev.row, prev.col))) {
        prev = cameFrom.get(key(prev.row, prev.col));
        path.unshift(prev);
      }
      return path;
    }

    // Check neighbors
    const neighbors = [
      {row: current.row - 1, col: current.col},
      {row: current.row + 1, col: current.col},
      {row: current.row, col: current.col - 1},
      {row: current.row, col: current.col + 1}
    ];

    for (let neighbor of neighbors) {
      if (neighbor.row < 0 || neighbor.row >= rows || neighbor.col < 0 || neighbor.col >= cols) continue;

      const nCell = FMap.grid.cells[neighbor.row * cols + neighbor.col];
      const nKey = key(neighbor.row, neighbor.col);
      const tentativeG = (gScore.get(currentKey) || 0) + getCost(nCell);

      if (!gScore.has(nKey) || tentativeG < gScore.get(nKey)) {
        cameFrom.set(nKey, current);
        gScore.set(nKey, tentativeG);
        const h = heuristic(neighbor, goal);
        fScore.set(nKey, tentativeG + h);
        openSet.enqueue(neighbor, tentativeG + h);
      }
    }
  }

  // No path found, return empty
  return [];
}

function fmGenerateRoads() {
  const { cols, rows } = FMap.grid;
  const roads = [];
  let roadId = 0;

  const createRoad = (from, to, type) => {
    const fromSettlement = FMap.world.settlements.find(s => s.id === from);
    const toSettlement = FMap.world.settlements.find(s => s.id === to);

    if (!fromSettlement || !toSettlement) return null;

    const startCell = FMap.grid.cells[fromSettlement.row * cols + fromSettlement.col];
    const endCell = FMap.grid.cells[toSettlement.row * cols + toSettlement.col];

    const path = fmAStarPath(startCell, endCell, cols, rows);

    if (path.length > 0) {
      const road = {
        id: `road_${roadId++}`,
        type: type,
        from: from,
        to: to,
        path: path.map(c => ({row: c.row, col: c.col})),
        length: path.length
      };
      return road;
    }
    return null;
  };

  // 1. Major roads: Connect all capitals to each other and to 2-3 nearest cities
  const capitals = FMap.world.settlements.filter(s => s.type === 'capital');
  for (let i = 0; i < capitals.length; i++) {
    for (let j = i + 1; j < capitals.length; j++) {
      const road = createRoad(capitals[i].id, capitals[j].id, 'major');
      if (road) roads.push(road);
    }
  }

  // Connect capitals to nearest cities
  for (let capital of capitals) {
    const capitalCities = FMap.world.settlements.filter(
      s => s.type === 'city' && s.kingdomId === capital.kingdomId && s.id !== capital.id
    );
    const nearest = capitalCities.sort((a, b) => {
      const distA = Math.sqrt(Math.pow(a.row - capital.row, 2) + Math.pow(a.col - capital.col, 2));
      const distB = Math.sqrt(Math.pow(b.row - capital.row, 2) + Math.pow(b.col - capital.col, 2));
      return distA - distB;
    }).slice(0, 3);

    for (let city of nearest) {
      const road = createRoad(capital.id, city.id, 'major');
      if (road) roads.push(road);
    }
  }

  // 2. Minor roads: Connect cities to nearest towns
  const cities = FMap.world.settlements.filter(s => s.type === 'city');
  for (let city of cities) {
    const towns = FMap.world.settlements.filter(
      s => s.type === 'town' && s.kingdomId === city.kingdomId
    );
    const nearest = towns.sort((a, b) => {
      const distA = Math.sqrt(Math.pow(a.row - city.row, 2) + Math.pow(a.col - city.col, 2));
      const distB = Math.sqrt(Math.pow(b.row - city.row, 2) + Math.pow(b.col - city.col, 2));
      return distA - distB;
    }).slice(0, 3);

    for (let town of nearest) {
      const road = createRoad(city.id, town.id, 'minor');
      if (road) roads.push(road);
    }
  }

  // 3. Trails: Connect towns to nearest hamlets
  const towns = FMap.world.settlements.filter(s => s.type === 'town');
  for (let town of towns) {
    const hamlets = FMap.world.settlements.filter(
      s => s.type === 'hamlet' && s.kingdomId === town.kingdomId
    );
    const nearest = hamlets.sort((a, b) => {
      const distA = Math.sqrt(Math.pow(a.row - town.row, 2) + Math.pow(a.col - town.col, 2));
      const distB = Math.sqrt(Math.pow(b.row - town.row, 2) + Math.pow(b.col - town.col, 2));
      return distA - distB;
    }).slice(0, 2);

    for (let hamlet of nearest) {
      const road = createRoad(town.id, hamlet.id, 'trail');
      if (road) roads.push(road);
    }
  }

  FMap.world.roads = roads;
  return roads;
}

// ============================================================================
// 5. POI GENERATION
// ============================================================================

function fmGeneratePOIs() {
  const { cols, rows } = FMap.grid;
  const pois = [];
  let poiId = 0;

  const poiTemplates = {
    dungeon: {
      descriptions: [
        'An ancient crypt said to hold the remains of a forgotten king. Local villagers report ghostly lights at night.',
        'A sunken dungeon complex, its entrance hidden beneath overgrown vines. Strange sounds echo from the depths.',
        'An obsidian tower fallen into ruin, its chambers now infested with creatures of shadow.',
        'The hollow remains of a great fortress, its dungeons still intact but sealed from the world.',
        'A network of caverns carved by ancient civilization, now home to unknown terrors.'
      ],
      levels: [5, 8, 10, 12, 15],
      loot: ['Ancient artifacts', 'Gold and jewels', 'Magical weapons', 'Cursed relics', 'Lost treasures']
    },
    ruins: {
      descriptions: [
        'Crumbling towers of a once-great civilization, reclaimed by nature.',
        'The shattered remains of a grand fortress, now a haunt for bandits and worse.',
        'Ancient stone structures, their purpose long forgotten, covered in mysterious runes.',
        'A field of fallen monuments, each telling of a glory long past.',
        'The broken citadel of an ancient empire, its secrets buried beneath the rubble.'
      ],
      levels: [3, 6, 8, 10, 12],
      loot: ['Artifacts', 'Historical records', 'Gold coins', 'Strange gems', 'Ancient scrolls']
    },
    temple: {
      descriptions: [
        'A sacred temple devoted to ancient gods, its altars still pristine.',
        'An ornate sanctuary hidden in the wilderness, tended by mysterious monks.',
        'A crumbling temple complex, its chambers filled with reliquaries and treasures.',
        'A sunlit shrine built upon a sacred hill, known for miracles and answered prayers.',
        'An ancient temple, its rituals still performed by devoted followers.'
      ],
      levels: [2, 4, 6, 8, 10],
      loot: ['Holy relics', 'Offerings', 'Sacred texts', 'Divine artifacts', 'Blessed items']
    },
    tower: {
      descriptions: [
        'A crumbling watchtower overlooking the valley. Bandits have taken up residence.',
        'An arcane tower once home to a powerful wizard, now sealed and silent.',
        'A lighthouse tower on a cliff, still tended by a mysterious keeper.',
        'A tower of dark stone, radiating an unnatural cold.',
        'A crystal spire visible for miles, its purpose unknown.'
      ],
      levels: [4, 7, 9, 11, 13],
      loot: ['Magical artifacts', 'Spellbooks', 'Treasure hoard', 'Strange devices', 'Potions']
    },
    cave: {
      descriptions: [
        'A vast cavern system beneath the earth, home to ancient creatures.',
        'A limestone cave network, glittering with crystals and underground rivers.',
        'Dark caverns inhabited by things that fear the light.',
        'An echo chamber of vast proportions, its walls carved with ancient script.',
        'A network of flooded caves, accessible only by boat or magic.'
      ],
      levels: [3, 6, 8, 10, 12],
      loot: ['Gemstones', 'Minerals', 'Creatures\' hoard', 'Strange bones', 'Underground treasures']
    },
    shrine: {
      descriptions: [
        'A small wayside shrine, tended by traveling monks and grateful pilgrims.',
        'A hidden shrine nestled in a glade, sacred to druids and nature lovers.',
        'An ancient shrine, worn smooth by centuries of pilgrims seeking blessing.',
        'A roadside shrine marking the grave of a legendary hero.',
        'A shrine dedicated to a mysterious power, its guardians unknown.'
      ],
      levels: [1, 2, 3, 4, 5],
      loot: ['Offerings', 'Blessed water', 'Sacred relics', 'Donations', 'Ancient coins']
    },
    battlefield: {
      descriptions: [
        'A haunted field where thousands fell in ancient war. Spirits still linger.',
        'A valley of bones, where great armies clashed in the distant past.',
        'A scarred plain where a legendary battle decided the fate of nations.',
        'An open field stained with blood, now home to restless spectres.',
        'A grassland littered with ancient weapons and bones, forgotten by history.'
      ],
      levels: [6, 8, 10, 12, 14],
      loot: ['Ancient weapons', 'Armor', 'Coins', 'Treasures', 'Haunted items']
    },
    mine: {
      descriptions: [
        'An abandoned mine shaft, its veins still rich with valuable ore.',
        'A working silver mine, now overrun with dangerous creatures.',
        'An ancient mining complex, its deepest levels unexplored.',
        'A gemstone mine flooded with water, accessible only to those with magic.',
        'A deep iron mine where dwarven craftsmen once worked, now silent.'
      ],
      levels: [4, 6, 8, 10, 12],
      loot: ['Ore', 'Gemstones', 'Gold', 'Rare minerals', 'Dwarven treasures']
    },
    camp: {
      descriptions: [
        'A hidden camp of bandits, well-supplied and heavily guarded.',
        'The makeshift camp of nomadic raiders, abandoned but recently used.',
        'A rebel stronghold hidden in the forest, defended by desperate fighters.',
        'An outlaw\'s hideout, notorious throughout the region.',
        'A mercenary camp, presently abandoned but showing signs of recent occupation.'
      ],
      levels: [3, 5, 7, 9, 11],
      loot: ['Stolen goods', 'Weapons', 'Gold', 'Maps', 'Supplies']
    },
    portal: {
      descriptions: [
        'An ancient gateway of mysterious origins, humming with eldritch energy.',
        'A shimmering rift in reality, leading to unknown planes of existence.',
        'A portal sealed long ago, but still faintly visible to those who know where to look.',
        'A cosmic tear in the fabric of existence, dangerous and unpredictable.',
        'A gateway created by powerful magic, its purpose obscured by time.'
      ],
      levels: [15, 16, 17, 18, 20],
      loot: ['Planar artifacts', 'Alien treasures', 'Impossible items', 'Ancient knowledge', 'Otherworldly power']
    },
    dragon_lair: {
      descriptions: [
        'The cavernous lair of an ancient dragon, filled with gold and jewels beyond measure.',
        'A mountain peak hollowed by a wyrm of immense age and power.',
        'A vast underground palace carved by a dragon\'s claw, its hoard legendary.',
        'The broken nest of a mighty draconic beast, still reeking of brimstone.',
        'A cavern sanctum where a dragon of terrible power makes its home.'
      ],
      levels: [18, 19, 20, 20, 20],
      loot: ['Dragon hoard', 'Ancient artifacts', 'Dragon scales', 'Spell components', 'Legendary treasures']
    }
  };

  const difficulties = ['easy', 'medium', 'hard', 'deadly'];

  const numPOIs = fmRandInt(30, 61);
  const poiTypes = Object.keys(poiTemplates);

  // Add rare POIs first
  const rareTypes = {portal: 2, dragon_lair: 2};
  for (let type in rareTypes) {
    for (let i = 0; i < rareTypes[type]; i++) {
      let placed = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        const row = fmRandInt(10, rows - 10);
        const col = fmRandInt(10, cols - 10);
        const cell = FMap.grid.cells[row * cols + col];

        if (cell && !cell.isWater && (type === 'dragon_lair' ? cell.isMountain : true)) {
          // Find nearest settlement
          let nearest = null;
          let minDist = Infinity;
          for (let settlement of FMap.world.settlements) {
            const dist = Math.sqrt(Math.pow(settlement.row - row, 2) + Math.pow(settlement.col - col, 2));
            if (dist < minDist) {
              minDist = dist;
              nearest = settlement;
            }
          }

          const template = poiTemplates[type];
          const poi = {
            id: `poi_${poiId++}`,
            name: fmNameGen.poi(type),
            type: type,
            description: fmPick(template.descriptions),
            row: row,
            col: col,
            level: fmPick(template.levels),
            difficulty: fmPick(difficulties),
            loot: fmPick(template.loot),
            nearestSettlement: nearest ? nearest.name : 'Unknown',
            kingdomId: cell.kingdomId
          };
          pois.push(poi);
          placed = true;
          break;
        }
      }
    }
  }

  // Generate remaining POIs
  while (pois.length < numPOIs) {
    let attempts = 0;
    while (attempts < 50) {
      const row = fmRandInt(5, rows - 5);
      const col = fmRandInt(5, cols - 5);
      const cell = FMap.grid.cells[row * cols + col];

      if (cell && !cell.isWater) {
        // Check if too close to existing POI
        let tooClose = false;
        for (let poi of pois) {
          const dist = Math.sqrt(Math.pow(poi.row - row, 2) + Math.pow(poi.col - col, 2));
          if (dist < 8) {
            tooClose = true;
            break;
          }
        }

        if (!tooClose) {
          // Filter to non-rare types
          let type = fmPick(poiTypes.filter(t => !rareTypes[t]));

          // Find nearest settlement
          let nearest = null;
          let minDist = Infinity;
          for (let settlement of FMap.world.settlements) {
            const dist = Math.sqrt(Math.pow(settlement.row - row, 2) + Math.pow(settlement.col - col, 2));
            if (dist < minDist) {
              minDist = dist;
              nearest = settlement;
            }
          }

          const template = poiTemplates[type];
          const poi = {
            id: `poi_${poiId++}`,
            name: fmNameGen.poi(type),
            type: type,
            description: fmPick(template.descriptions),
            row: row,
            col: col,
            level: fmPick(template.levels),
            difficulty: fmPick(difficulties),
            loot: fmPick(template.loot),
            nearestSettlement: nearest ? nearest.name : 'Unknown',
            kingdomId: cell.kingdomId
          };
          pois.push(poi);
          break;
        }
      }
      attempts++;
    }
  }

  FMap.world.pois = pois.slice(0, numPOIs);
  return FMap.world.pois;
}

// ============================================================================
// 6. FEATURE NAMING
// ============================================================================

function fmNameFeatures() {
  const { cols, rows } = FMap.grid;
  const visited = new Set();

  const features = {
    mountains: [],
    forests: [],
    seas: [],
    rivers: [],
    lakes: [],
    deserts: [],
    swamps: []
  };

  // Helper: Flood fill to find connected regions
  const floodFill = (startRow, startCol, predicate) => {
    const region = [];
    const queue = [{row: startRow, col: startCol}];
    const key = (r, c) => `${r},${c}`;
    const visited2 = new Set();

    while (queue.length > 0) {
      const current = queue.shift();
      const k = key(current.row, current.col);
      if (visited2.has(k)) continue;
      visited2.add(k);

      const cell = FMap.grid.cells[current.row * cols + current.col];
      if (!cell || !predicate(cell)) continue;

      region.push(cell);

      const neighbors = [
        {row: current.row - 1, col: current.col},
        {row: current.row + 1, col: current.col},
        {row: current.row, col: current.col - 1},
        {row: current.row, col: current.col + 1}
      ];

      for (let neighbor of neighbors) {
        if (neighbor.row < 0 || neighbor.row >= rows || neighbor.col < 0 || neighbor.col >= cols) continue;
        const nk = key(neighbor.row, neighbor.col);
        if (!visited2.has(nk)) {
          queue.push(neighbor);
        }
      }
    }
    return region;
  };

  // Find mountains
  for (let i = 0; i < FMap.grid.cells.length; i++) {
    const cell = FMap.grid.cells[i];
    const key = `${cell.row},${cell.col}`;
    if (cell.isMountain && !visited.has(key)) {
      const region = floodFill(cell.row, cell.col, c => c.isMountain);
      if (region.length > 0) {
        region.forEach(c => visited.add(`${c.row},${c.col}`));
        const culture = fmPick(['fantasy', 'norse', 'celtic']);
        features.mountains.push({
          name: fmNameGen.feature('mountain', culture),
          cells: region,
          center: {row: Math.round(region.reduce((a, c) => a + c.row, 0) / region.length),
                   col: Math.round(region.reduce((a, c) => a + c.col, 0) / region.length)},
          cellCount: region.length
        });
      }
    }
  }

  // Find forests
  visited.clear();
  for (let i = 0; i < FMap.grid.cells.length; i++) {
    const cell = FMap.grid.cells[i];
    const key = `${cell.row},${cell.col}`;
    if ((cell.isForest || cell.biome === 'dense_forest') && !visited.has(key)) {
      const region = floodFill(cell.row, cell.col, c => c.isForest || c.biome === 'dense_forest');
      if (region.length > 20) {
        region.forEach(c => visited.add(`${c.row},${c.col}`));
        const culture = fmPick(['fantasy', 'norse', 'celtic']);
        features.forests.push({
          name: fmNameGen.feature('forest', culture),
          cells: region,
          center: {row: Math.round(region.reduce((a, c) => a + c.row, 0) / region.length),
                   col: Math.round(region.reduce((a, c) => a + c.col, 0) / region.length)},
          cellCount: region.length
        });
      }
    }
  }

  // Find seas (large water bodies)
  visited.clear();
  for (let i = 0; i < FMap.grid.cells.length; i++) {
    const cell = FMap.grid.cells[i];
    const key = `${cell.row},${cell.col}`;
    if (cell.isWater && !visited.has(key)) {
      const region = floodFill(cell.row, cell.col, c => c.isWater);
      if (region.length > 100) {
        region.forEach(c => visited.add(`${c.row},${c.col}`));
        const culture = fmPick(['fantasy', 'norse', 'celtic']);
        features.seas.push({
          name: fmNameGen.feature('sea', culture),
          cells: region,
          center: {row: Math.round(region.reduce((a, c) => a + c.row, 0) / region.length),
                   col: Math.round(region.reduce((a, c) => a + c.col, 0) / region.length)},
          cellCount: region.length
        });
      }
    }
  }

  // Name rivers from FMap.world.rivers
  if (FMap.world.rivers && FMap.world.rivers.length > 0) {
    for (let river of FMap.world.rivers) {
      const culture = fmPick(['fantasy', 'norse', 'celtic']);
      features.rivers.push({
        name: fmNameGen.feature('river', culture),
        cells: river,
        cellCount: river.length
      });
    }
  }

  // Name lakes from FMap.world.lakes
  if (FMap.world.lakes && FMap.world.lakes.length > 0) {
    for (let lake of FMap.world.lakes) {
      const culture = fmPick(['fantasy', 'norse', 'celtic']);
      features.lakes.push({
        name: fmNameGen.feature('lake', culture),
        cells: lake.cells,
        center: lake.center,
        cellCount: lake.cellCount
      });
    }
  }

  // Find deserts
  visited.clear();
  for (let i = 0; i < FMap.grid.cells.length; i++) {
    const cell = FMap.grid.cells[i];
    const key = `${cell.row},${cell.col}`;
    if (cell.biome === 'desert' && !visited.has(key)) {
      const region = floodFill(cell.row, cell.col, c => c.biome === 'desert');
      if (region.length > 50) {
        region.forEach(c => visited.add(`${c.row},${c.col}`));
        const culture = fmPick(['fantasy', 'arabic', 'eastern']);
        features.deserts.push({
          name: fmNameGen.feature('desert', culture),
          cells: region,
          center: {row: Math.round(region.reduce((a, c) => a + c.row, 0) / region.length),
                   col: Math.round(region.reduce((a, c) => a + c.col, 0) / region.length)},
          cellCount: region.length
        });
      }
    }
  }

  // Find swamps
  visited.clear();
  for (let i = 0; i < FMap.grid.cells.length; i++) {
    const cell = FMap.grid.cells[i];
    const key = `${cell.row},${cell.col}`;
    if (cell.biome === 'swamp' && !visited.has(key)) {
      const region = floodFill(cell.row, cell.col, c => c.biome === 'swamp');
      if (region.length > 50) {
        region.forEach(c => visited.add(`${c.row},${c.col}`));
        const culture = fmPick(['fantasy', 'celtic', 'norse']);
        features.swamps.push({
          name: fmNameGen.feature('swamp', culture),
          cells: region,
          center: {row: Math.round(region.reduce((a, c) => a + c.row, 0) / region.length),
                   col: Math.round(region.reduce((a, c) => a + c.col, 0) / region.length)},
          cellCount: region.length
        });
      }
    }
  }

  // Preserve coastlines from terrain generation
  if (FMap.world.features && FMap.world.features.coastlines) {
    features.coastlines = FMap.world.features.coastlines;
  }
  FMap.world.features = features;
  return features;
}

// ============================================================================
// 7. MASTER FUNCTION - BUILD ENTIRE WORLD
// ============================================================================

function fmBuildWorld() {
  console.log('Building political layer...');

  fmGenerateKingdoms();
  console.log(`Generated ${FMap.world.kingdoms.length} kingdoms`);

  fmGenerateSettlements();
  FMap.world.cities = FMap.world.settlements;  // Sync for render/interaction code
  console.log(`Generated ${FMap.world.settlements.length} settlements`);

  fmGenerateRoads();
  console.log(`Generated ${FMap.world.roads.length} roads`);

  fmGeneratePOIs();
  console.log(`Generated ${FMap.world.pois.length} points of interest`);

  fmNameFeatures();
  console.log('Named geographic features');

  console.log('World build complete!');
}

// ============================================================================
// === END PART 2: POLITICAL LAYER ===
// ============================================================================

// === PART 3: RENDERING ENGINE - TOLKIEN-STYLE FANTASY CARTOGRAPHY ===

// Helper: Convert cell coordinates to screen coordinates
function fmCellToScreen(col, row) {
  var b = FMap.mapBounds;
  return {
    x: b.x + (col / FMap.grid.cols) * b.w,
    y: b.y + (row / FMap.grid.rows) * b.h
  };
}

// Helper: Get cell width and height in screen pixels
function fmGetCellSize() {
  var b = FMap.mapBounds;
  return {
    w: b.w / FMap.grid.cols,
    h: b.h / FMap.grid.rows
  };
}

// === 1. PARCHMENT BACKGROUND ===
function fmRenderParchment(ctx, w, h, dark) {
  var imgData = ctx.createImageData(w, h);
  var data = imgData.data;

  // Base color (warm beige/cream or dark brown)
  var baseR = dark ? 60 : 240;
  var baseG = dark ? 50 : 235;
  var baseB = dark ? 40 : 220;

  // Fill with base + noise
  for (var i = 0; i < data.length; i += 4) {
    var noise = (fmRandInt(0, 31) - 15);
    data[i] = Math.max(0, Math.min(255, baseR + noise));     // R
    data[i + 1] = Math.max(0, Math.min(255, baseG + noise)); // G
    data[i + 2] = Math.max(0, Math.min(255, baseB + noise)); // B
    data[i + 3] = 255; // A
  }
  ctx.putImageData(imgData, 0, 0);

  // Vignette effect (darker edges)
  var vignetteGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
  vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
  ctx.fillStyle = vignetteGrad;
  ctx.fillRect(0, 0, w, h);

  // Stain patches using sine waves
  ctx.fillStyle = dark ? 'rgba(40, 30, 20, 0.08)' : 'rgba(139, 100, 60, 0.06)';
  for (var s = 0; s < 4; s++) {
    var stainX = fmRandInt(w * 0.1, w * 0.9);
    var stainY = fmRandInt(h * 0.1, h * 0.9);
    var stainSize = fmRandInt(80, 200);
    for (var angle = 0; angle < Math.PI * 2; angle += 0.05) {
      var wave = Math.sin(angle * 4 + s) * 0.5 + 0.5;
      var r = stainSize * (0.5 + wave * 0.3);
      var x = stainX + Math.cos(angle) * r;
      var y = stainY + Math.sin(angle) * r;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // Coffee ring marks
  ctx.strokeStyle = dark ? 'rgba(100, 70, 40, 0.05)' : 'rgba(139, 100, 60, 0.05)';
  ctx.lineWidth = 2;
  for (var c = 0; c < 3; c++) {
    var ringX = fmRandInt(100, w - 100);
    var ringY = fmRandInt(100, h - 100);
    var ringR = fmRandInt(40, 100);
    ctx.beginPath();
    ctx.arc(ringX, ringY, ringR, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// === 2. DECORATIVE BORDER ===
function fmRenderBorder(ctx, w, h, dark) {
  var borderColor = dark ? '#2a1a0a' : '#3a2a1a';
  var margin = 55;

  // Outer thick border (3px)
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(margin, margin, w - 2 * margin, h - 2 * margin - 5);

  // Inner thin border (1.5px), 4px gap
  ctx.lineWidth = 1.5;
  var inner = margin + 7;
  ctx.strokeRect(inner, inner, w - 2 * inner, h - 2 * inner - 5);

  // Corner decorations (diamond + circle flourishes)
  var corners = [
    { x: margin, y: margin },
    { x: w - margin, y: margin },
    { x: margin, y: h - margin - 5 },
    { x: w - margin, y: h - margin - 5 }
  ];

  ctx.fillStyle = borderColor;
  corners.forEach(function(corner) {
    // Diamond
    var diamondSize = 8;
    ctx.beginPath();
    ctx.moveTo(corner.x, corner.y - diamondSize);
    ctx.lineTo(corner.x + diamondSize, corner.y);
    ctx.lineTo(corner.x, corner.y + diamondSize);
    ctx.lineTo(corner.x - diamondSize, corner.y);
    ctx.closePath();
    ctx.fill();

    // Circle
    ctx.beginPath();
    ctx.arc(corner.x, corner.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Edge tick marks every 80px
  ctx.lineWidth = 1;
  var tickLen = 8;

  // Top and bottom edges
  for (var x = margin; x < w - margin; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, margin - tickLen / 2);
    ctx.lineTo(x, margin + tickLen / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, h - margin - 5 - tickLen / 2);
    ctx.lineTo(x, h - margin - 5 + tickLen / 2);
    ctx.stroke();
  }

  // Left and right edges
  for (var y = margin; y < h - margin; y += 80) {
    ctx.beginPath();
    ctx.moveTo(margin - tickLen / 2, y);
    ctx.lineTo(margin + tickLen / 2, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w - margin - tickLen / 2, y);
    ctx.lineTo(w - margin + tickLen / 2, y);
    ctx.stroke();
  }
}

// === 3. TERRAIN RENDERING ===
function fmRenderTerrain(ctx) {
  var biomeColors = FMap.dark ? {
    deep_ocean: '#000a1a', ocean: '#001840', coast: '#002860',
    beach: '#6a5a3a', grassland: '#2a4a1a', forest: '#1a3810',
    dense_forest: '#0e2a08', swamp: '#2a3020', desert: '#5a4a28',
    tundra: '#3a3a40', mountain: '#4a4540', snow_peak: '#808080',
    hills: '#3a3520', lake: '#0a2050'
  } : {
    deep_ocean: '#1a3a6b', ocean: '#2a5a9b', coast: '#4a8acc',
    beach: '#d4b878', grassland: '#7abf60', forest: '#4a9a38',
    dense_forest: '#2a7020', swamp: '#5a6a40', desert: '#c8a850',
    tundra: '#a0a0a8', mountain: '#8a8580', snow_peak: '#d8d5d0',
    hills: '#9a8a60', lake: '#4a80c0'
  };

  var cellSize = fmGetCellSize();
  var b = FMap.mapBounds;

  for (var row = 0; row < FMap.grid.rows; row++) {
    for (var col = 0; col < FMap.grid.cols; col++) {
      var cell = FMap.grid.cells[row * FMap.grid.cols + col];
      if (!cell) continue;
      var biome = cell.biome || 'grassland';
      var color = biomeColors[biome] || '#7abf60';

      var x = b.x + (col / FMap.grid.cols) * b.w;
      var y = b.y + (row / FMap.grid.rows) * b.h;

      ctx.fillStyle = color;
      ctx.fillRect(x, y, cellSize.w, cellSize.h);

      // Subtle texture noise overlay
      ctx.fillStyle = 'rgba(0, 0, 0, ' + (0.02 * Math.random()) + ')';
      ctx.fillRect(x, y, cellSize.w, cellSize.h);
    }
  }
}

// === 4. COASTLINES ===
function fmRenderCoastlines(ctx) {
  var b = FMap.mapBounds;
  var cellSize = fmGetCellSize();
  var coastColor = FMap.dark ? '#1a0a00' : '#2a0a00';

  var isWater = function(row, col) {
    if (row < 0 || row >= FMap.grid.rows || col < 0 || col >= FMap.grid.cols) return true;
    var cell = FMap.grid.cells[row * FMap.grid.cols + col];
    if (!cell) return true;
    return (cell.biome && (cell.biome.indexOf('ocean') !== -1 || cell.biome === 'coast' || cell.biome === 'lake')) || cell.isWater;
  };

  // Main coastline pass
  var coastPoints = [];

  for (var row = 0; row < FMap.grid.rows; row++) {
    for (var col = 0; col < FMap.grid.cols; col++) {
      var cell = FMap.grid.cells[row * FMap.grid.cols + col];
      var cellWater = isWater(row, col);
      var isCoast = false;

      if (!cellWater) {
        // Check neighbors
        if (isWater(row - 1, col) || isWater(row + 1, col) ||
            isWater(row, col - 1) || isWater(row, col + 1)) {
          isCoast = true;
        }
      }

      if (isCoast) {
        var x = b.x + (col + 0.5) / FMap.grid.cols * b.w;
        var y = b.y + (row + 0.5) / FMap.grid.rows * b.h;
        coastPoints.push({ x: x, y: y, col: col, row: row });
      }
    }
  }

  // Draw 4 parallel coastlines with decreasing prominence
  var lineWidths = [2, 1.5, 1, 0.7];
  var alphas = [1, 0.7, 0.5, 0.3];
  var distances = [0, 5, 9, 14];

  for (var line = 0; line < 4; line++) {
    ctx.strokeStyle = FMap.dark ?
      'rgba(26, 10, 0, ' + alphas[line] + ')' :
      'rgba(42, 10, 0, ' + alphas[line] + ')';
    ctx.lineWidth = lineWidths[line];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (var cp = 0; cp < coastPoints.length; cp++) {
      var point = coastPoints[cp];
      var nextPoint = coastPoints[(cp + 1) % coastPoints.length];

      var jitterX = (fmRandInt(0, 4) - 2);
      var jitterY = (fmRandInt(0, 4) - 2);

      ctx.beginPath();
      ctx.moveTo(point.x + jitterX, point.y + jitterY);

      var cpX = (point.x + nextPoint.x) / 2 + jitterX;
      var cpY = (point.y + nextPoint.y) / 2 + jitterY;

      ctx.quadraticCurveTo(cpX, cpY, nextPoint.x + jitterX, nextPoint.y + jitterY);
      ctx.stroke();
    }
  }
}

// === 5. MOUNTAIN SYMBOLS ===
function fmRenderMountains(ctx) {
  var b = FMap.mapBounds;
  var cellSize = fmGetCellSize();
  var mountainColor = FMap.dark ? '#6a5a4a' : '#4a3a2a';
  var snowColor = '#f0f0f0';
  var shadowColor = FMap.dark ? '#2a1a0a' : '#1a0a00';

  for (var row = 0; row < FMap.grid.rows; row += 2) {
    for (var col = 0; col < FMap.grid.cols; col += 2) {
      var cell = FMap.grid.cells[row * FMap.grid.cols + col];
      if (cell.biome === 'mountain' || cell.biome === 'snow_peak') {
        var x = b.x + (col + 0.5) / FMap.grid.cols * b.w;
        var y = b.y + (row + 0.5) / FMap.grid.rows * b.h;

        var peakHeight = cellSize.h * (0.8 + Math.random() * 0.4);
        var peakWidth = cellSize.w * 0.6;

        // Main mountain
        ctx.fillStyle = mountainColor;
        ctx.beginPath();
        ctx.moveTo(x - peakWidth / 2, y + peakHeight / 2);
        ctx.lineTo(x, y - peakHeight / 2);
        ctx.lineTo(x + peakWidth / 2, y + peakHeight / 2);
        ctx.closePath();
        ctx.fill();

        // Shadow (right side)
        ctx.fillStyle = shadowColor;
        ctx.beginPath();
        ctx.moveTo(x, y - peakHeight / 2);
        ctx.lineTo(x + peakWidth / 2, y + peakHeight / 2);
        ctx.lineTo(x + peakWidth / 4, y + peakHeight / 4);
        ctx.closePath();
        ctx.fill();

        // Highlight (left edge)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - peakWidth / 2, y + peakHeight / 2);
        ctx.lineTo(x, y - peakHeight / 2);
        ctx.stroke();

        // Snow cap
        if (cell.biome === 'snow_peak') {
          ctx.fillStyle = snowColor;
          ctx.beginPath();
          ctx.moveTo(x - peakWidth / 4, y - peakHeight / 4);
          ctx.lineTo(x, y - peakHeight / 2);
          ctx.lineTo(x + peakWidth / 4, y - peakHeight / 4);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  // Hills
  for (var row = 0; row < FMap.grid.rows; row += 2) {
    for (var col = 0; col < FMap.grid.cols; col += 2) {
      var cell = FMap.grid.cells[row * FMap.grid.cols + col];
      if (cell.biome === 'hills') {
        var x = b.x + (col + 0.5) / FMap.grid.cols * b.w;
        var y = b.y + (row + 0.5) / FMap.grid.rows * b.h;

        ctx.fillStyle = FMap.dark ? '#5a4a3a' : '#8a7a5a';
        ctx.beginPath();
        ctx.arc(x, y + cellSize.h / 4, cellSize.w * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = FMap.dark ? '#2a1a0a' : '#3a2a1a';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
}

// === 6. FOREST SYMBOLS ===
function fmRenderForests(ctx) {
  var b = FMap.mapBounds;
  var cellSize = fmGetCellSize();
  var forestColor = FMap.dark ? '#2a5a1a' : '#3a7a28';
  var denseForestColor = FMap.dark ? '#1a3a0a' : '#1a5a10';
  var trunkColor = FMap.dark ? '#4a3a2a' : '#3a2a1a';

  for (var row = 0; row < FMap.grid.rows; row++) {
    for (var col = 0; col < FMap.grid.cols; col++) {
      var cell = FMap.grid.cells[row * FMap.grid.cols + col];
      if (cell.biome === 'forest' || cell.biome === 'dense_forest') {
        var isDense = cell.biome === 'dense_forest';
        var treeCount = isDense ? 5 : 3;
        var spacing = isDense ? 0.25 : 0.35;
        var baseX = b.x + (col + 0.5) / FMap.grid.cols * b.w;
        var baseY = b.y + (row + 0.5) / FMap.grid.rows * b.h;

        var color = isDense ? denseForestColor : forestColor;

        for (var t = 0; t < treeCount; t++) {
          var tX = baseX + (Math.random() - 0.5) * cellSize.w * spacing;
          var tY = baseY + (Math.random() - 0.5) * cellSize.h * spacing;
          var canopySize = (0.85 + Math.random() * 0.3) * cellSize.h * 0.25;

          // Canopy (oval/egg shape)
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.ellipse(tX, tY - canopySize * 0.1, canopySize * 0.6, canopySize, 0, 0, Math.PI * 2);
          ctx.fill();

          // Trunk (if perimeter or random)
          if (Math.random() > 0.6) {
            ctx.fillStyle = trunkColor;
            ctx.fillRect(tX - 1.5, tY + canopySize * 0.3, 3, canopySize * 0.4);
          }
        }
      }
    }
  }
}

// === 7. WATER DETAILS ===
function fmRenderWater(ctx) {
  var b = FMap.mapBounds;
  var cellSize = fmGetCellSize();

  // Wave patterns in deep ocean
  ctx.strokeStyle = FMap.dark ? 'rgba(100, 150, 200, 0.15)' : 'rgba(100, 150, 200, 0.1)';
  ctx.lineWidth = 1;

  for (var row = 0; row < FMap.grid.rows; row += 4) {
    for (var col = 0; col < FMap.grid.cols; col++) {
      var cell = FMap.grid.cells[row * FMap.grid.cols + col];
      if (cell.biome === 'deep_ocean') {
        var x = b.x + (col / FMap.grid.cols) * b.w;
        var y = b.y + (row / FMap.grid.rows) * b.h;

        ctx.beginPath();
        for (var wx = 0; wx < cellSize.w; wx += 8) {
          var waveY = y + Math.sin(wx * 0.1 + row) * 2;
          if (wx === 0) ctx.moveTo(x + wx, waveY);
          else ctx.lineTo(x + wx, waveY);
        }
        ctx.stroke();
      }
    }
  }

  // Stipple dots near coast
  ctx.fillStyle = FMap.dark ? 'rgba(100, 150, 200, 0.2)' : 'rgba(100, 150, 200, 0.15)';
  for (var row = 0; row < FMap.grid.rows; row++) {
    for (var col = 0; col < FMap.grid.cols; col++) {
      var cell = FMap.grid.cells[row * FMap.grid.cols + col];
      if (cell.biome === 'ocean' || cell.biome === 'coast') {
        if (Math.random() > 0.7) {
          var x = b.x + (col / FMap.grid.cols) * b.w + Math.random() * cellSize.w;
          var y = b.y + (row / FMap.grid.rows) * b.h + Math.random() * cellSize.h;
          ctx.fillRect(x, y, 1.5, 1.5);
        }
      }
    }
  }
}

// === 8. RIVER RENDERING ===
function fmRenderRivers(ctx) {
  if (!FMap.world.rivers || FMap.world.rivers.length === 0) return;

  var b = FMap.mapBounds;
  var riverColor = FMap.dark ? '#0a1a4a' : '#1a3a6a';

  FMap.world.rivers.forEach(function(river) {
    var path = river.path || river;
    if (!path || path.length === 0) return;

    var points = path.map(function(pt) {
      // River path points are [row, col, flow] tuples or {row, col} objects
      var ptRow = Array.isArray(pt) ? pt[0] : pt.row;
      var ptCol = Array.isArray(pt) ? pt[1] : pt.col;
      var x = b.x + (ptCol + 0.5) / FMap.grid.cols * b.w;
      var y = b.y + (ptRow + 0.5) / FMap.grid.rows * b.h;
      return { x: x, y: y };
    });

    // Draw river with width increasing downstream
    ctx.strokeStyle = riverColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (var i = 0; i < points.length - 1; i++) {
      var ratio = i / points.length;
      var width = 1 + ratio * 3;
      ctx.lineWidth = width;

      ctx.beginPath();
      ctx.moveTo(points[i].x, points[i].y);

      if (i < points.length - 1) {
        var cp = points[i + 1];
        ctx.quadraticCurveTo(cp.x, cp.y, points[i + 1].x, points[i + 1].y);
      }
      ctx.stroke();
    }

    // River labels (optional, along midpoint)
    if (river.name && points.length > 0) {
      var midIdx = Math.floor(points.length / 2);
      var midPoint = points[midIdx];
      var nextPoint = points[Math.min(midIdx + 1, points.length - 1)];
      var angle = Math.atan2(nextPoint.y - midPoint.y, nextPoint.x - midPoint.x);

      ctx.save();
      ctx.translate(midPoint.x, midPoint.y);
      ctx.rotate(angle);
      ctx.fillStyle = FMap.dark ? '#4a6a9a' : '#1a3a6a';
      ctx.font = 'italic 9px Cinzel';
      ctx.textAlign = 'center';
      ctx.fillText(river.name, 0, -5);
      ctx.restore();
    }
  });
}

// === 9. KINGDOM BORDERS ===
function fmRenderKingdomBorders(ctx) {
  if (!FMap.world.kingdoms || FMap.world.kingdoms.length === 0) return;

  var b = FMap.mapBounds;
  var cellSize = fmGetCellSize();
  var drawn = {};

  for (var row = 0; row < FMap.grid.rows; row++) {
    for (var col = 0; col < FMap.grid.cols; col++) {
      var cell = FMap.grid.cells[row * FMap.grid.cols + col];
      var kingdomId = cell.kingdomId;

      // Check right neighbor
      if (col < FMap.grid.cols - 1) {
        var rightCell = FMap.grid.cells[row * FMap.grid.cols + (col + 1)];
        if (rightCell.kingdomId !== kingdomId && rightCell.kingdomId) {
          var kingdom = FMap.world.kingdoms.find(function(k) { return k.id === kingdomId; });
          if (kingdom) {
            var x = b.x + (col + 1) / FMap.grid.cols * b.w;
            var y1 = b.y + row / FMap.grid.rows * b.h;
            var y2 = b.y + (row + 1) / FMap.grid.rows * b.h;

            ctx.strokeStyle = kingdom.color || '#666666';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 4]);
            ctx.beginPath();
            ctx.moveTo(x, y1);
            ctx.lineTo(x, y2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      // Check bottom neighbor
      if (row < FMap.grid.rows - 1) {
        var bottomCell = FMap.grid.cells[(row + 1) * FMap.grid.cols + col];
        if (bottomCell.kingdomId !== kingdomId && bottomCell.kingdomId) {
          var kingdom = FMap.world.kingdoms.find(function(k) { return k.id === kingdomId; });
          if (kingdom) {
            var x1 = b.x + col / FMap.grid.cols * b.w;
            var x2 = b.x + (col + 1) / FMap.grid.cols * b.w;
            var y = b.y + (row + 1) / FMap.grid.rows * b.h;

            ctx.strokeStyle = kingdom.color || '#666666';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 4]);
            ctx.beginPath();
            ctx.moveTo(x1, y);
            ctx.lineTo(x2, y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
    }
  }
}

// === 10. ROADS ===
function fmRenderRoads(ctx) {
  if (!FMap.world.roads || FMap.world.roads.length === 0) return;

  var b = FMap.mapBounds;

  FMap.world.roads.forEach(function(road) {
    if (!road.path || road.path.length === 0) return;

    var points = road.path.map(function(pt) {
      var x = b.x + (pt.col + 0.5) / FMap.grid.cols * b.w;
      var y = b.y + (pt.row + 0.5) / FMap.grid.rows * b.h;
      return { x: x, y: y };
    });

    var roadColor = FMap.dark ? '#4a3a2a' : '#5a4a3a';
    var roadLightColor = FMap.dark ? '#6a5a4a' : '#8a7a6a';

    ctx.strokeStyle = road.type === 'major' ? roadColor : (road.type === 'minor' ? roadLightColor : roadColor);
    ctx.lineWidth = road.type === 'major' ? 2 : (road.type === 'minor' ? 1.5 : 1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (road.type === 'trail') {
      ctx.setLineDash([4, 4]);
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (var i = 1; i < points.length; i++) {
      var prevIdx = i - 1;
      var nextIdx = i + 1 < points.length ? i + 1 : i;

      var cp = {
        x: (points[prevIdx].x + points[i].x) / 2,
        y: (points[prevIdx].y + points[i].y) / 2
      };

      ctx.quadraticCurveTo(cp.x, cp.y, points[i].x, points[i].y);
    }

    ctx.stroke();
    ctx.setLineDash([]);
  });
}

// === 11. SETTLEMENT ICONS ===
function fmRenderSettlements(ctx) {
  if (!FMap.world.cities || FMap.world.cities.length === 0) return;

  var b = FMap.mapBounds;

  FMap.world.cities.forEach(function(city) {
    var x = b.x + (city.col + 0.5) / FMap.grid.cols * b.w;
    var y = b.y + (city.row + 0.5) / FMap.grid.rows * b.h;

    var iconSize = 14;
    var labelOffset = 15;
    var labelSize = 13;

    if (city.type === 'capital') {
      iconSize = 14;
      labelSize = 13;

      // Castle: towers and keep
      ctx.fillStyle = FMap.dark ? '#3a2a1a' : '#2a1a0a';

      // Left tower
      ctx.fillRect(x - 7, y - 8, 4, 14);
      // Right tower
      ctx.fillRect(x + 3, y - 8, 4, 14);
      // Center keep
      ctx.fillRect(x - 2, y - 6, 4, 12);

      // Crenellations
      ctx.lineWidth = 1;
      ctx.strokeStyle = FMap.dark ? '#3a2a1a' : '#2a1a0a';
      for (var c = -7; c <= 3; c += 4) {
        ctx.strokeRect(x + c, y - 8, 3, 2);
      }

      // Flag
      ctx.fillStyle = '#c41e3a';
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 8);
      ctx.lineTo(x - 2, y - 14);
      ctx.lineTo(x + 2, y - 12);
      ctx.lineTo(x - 2, y - 10);
      ctx.closePath();
      ctx.fill();

    } else if (city.type === 'city') {
      iconSize = 10;
      labelSize = 11;

      // Walled cluster
      ctx.strokeStyle = FMap.dark ? '#3a2a1a' : '#2a1a0a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 5, y - 5, 10, 10);

      // Peaked roofs
      ctx.fillStyle = FMap.dark ? '#5a4a3a' : '#4a3a2a';
      for (var r = 0; r < 3; r++) {
        var rx = x - 3 + r * 3;
        ctx.beginPath();
        ctx.moveTo(rx - 1, y - 1);
        ctx.lineTo(rx, y - 3);
        ctx.lineTo(rx + 1, y - 1);
        ctx.closePath();
        ctx.fill();
      }

    } else if (city.type === 'town') {
      iconSize = 7;
      labelSize = 10;

      ctx.fillStyle = FMap.dark ? '#3a2a1a' : '#2a1a0a';
      ctx.fillRect(x - 3, y - 2, 6, 4);
      ctx.fillRect(x - 1, y - 4, 2, 4);

    } else if (city.type === 'hamlet') {
      iconSize = 5;
      labelSize = 9;

      ctx.fillStyle = FMap.dark ? '#3a2a1a' : '#2a1a0a';
      ctx.beginPath();
      ctx.moveTo(x - 2, y);
      ctx.lineTo(x - 2, y + 2);
      ctx.lineTo(x, y + 3);
      ctx.lineTo(x + 2, y + 2);
      ctx.lineTo(x + 2, y);
      ctx.closePath();
      ctx.fill();

      // Smoke
      ctx.strokeStyle = FMap.dark ? 'rgba(150, 150, 150, 0.4)' : 'rgba(150, 150, 150, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x - 1, y - 2, 1, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Label with halo background
    if (city.name) {
      var labelColor = FMap.dark ? '#d4a574' : '#8a6a3a';
      ctx.font = (city.type === 'capital' ? 'bold ' : '') + labelSize + 'px Cinzel';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      // Halo
      ctx.fillStyle = FMap.dark ? 'rgba(80, 60, 40, 0.6)' : 'rgba(240, 235, 220, 0.7)';
      var textWidth = ctx.measureText(city.name).width;
      ctx.fillRect(x + labelOffset - 2, y - labelSize / 2 - 1, textWidth + 4, labelSize + 2);

      // Text
      ctx.fillStyle = labelColor;
      ctx.fillText(city.name, x + labelOffset, y);
    }
  });
}

// === 12. POI ICONS ===
function fmRenderPOIs(ctx) {
  if (!FMap.world.pois || FMap.world.pois.length === 0) return;

  var b = FMap.mapBounds;
  var iconSize = 8;
  var labelSize = 8;

  FMap.world.pois.forEach(function(poi) {
    var x = b.x + (poi.col + 0.5) / FMap.grid.cols * b.w;
    var y = b.y + (poi.row + 0.5) / FMap.grid.rows * b.h;

    var poiColor = FMap.dark ? '#4a4a4a' : '#2a2a2a';

    switch (poi.type) {
      case 'dungeon':
        // Skull
        ctx.fillStyle = poiColor;
        ctx.beginPath();
        ctx.arc(x, y - 2, 2, 0, Math.PI * 2);
        ctx.fill();

        // Crossed bones
        ctx.strokeStyle = poiColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 3, y + 2);
        ctx.lineTo(x + 3, y + 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 3, y + 2);
        ctx.lineTo(x + 3, y + 4);
        ctx.stroke();
        break;

      case 'ruins':
        // Broken column
        ctx.fillStyle = poiColor;
        ctx.fillRect(x - 1, y - 3, 2, 6);
        ctx.strokeStyle = poiColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 2, y - 2);
        ctx.lineTo(x + 2, y);
        ctx.stroke();
        break;

      case 'temple':
        // Triangle with cross
        ctx.fillStyle = poiColor;
        ctx.beginPath();
        ctx.moveTo(x, y - 4);
        ctx.lineTo(x - 3, y + 2);
        ctx.lineTo(x + 3, y + 2);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y - 2);
        ctx.lineTo(x, y + 1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 1, y - 0.5);
        ctx.lineTo(x + 1, y - 0.5);
        ctx.stroke();
        break;

      case 'tower':
        // Narrow rectangle with pointed top
        ctx.fillStyle = poiColor;
        ctx.fillRect(x - 1.5, y - 2, 3, 5);
        ctx.beginPath();
        ctx.moveTo(x - 1.5, y - 2);
        ctx.lineTo(x, y - 4);
        ctx.lineTo(x + 1.5, y - 2);
        ctx.closePath();
        ctx.fill();
        break;

      case 'cave':
        // Dark semicircle
        ctx.fillStyle = poiColor;
        ctx.beginPath();
        ctx.arc(x, y, 3, Math.PI, 0);
        ctx.lineTo(x + 3, y);
        ctx.closePath();
        ctx.fill();
        break;

      case 'shrine':
        // Star/sparkle
        ctx.fillStyle = poiColor;
        for (var s = 0; s < 8; s++) {
          var angle = (s / 8) * Math.PI * 2;
          var rad = s % 2 === 0 ? 3 : 1.5;
          var px = x + Math.cos(angle) * rad;
          var py = y + Math.sin(angle) * rad;
          if (s === 0) ctx.beginPath();
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        break;

      case 'battlefield':
        // Crossed swords
        ctx.strokeStyle = poiColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - 3, y - 2);
        ctx.lineTo(x + 3, y + 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 3, y - 2);
        ctx.lineTo(x - 3, y + 2);
        ctx.stroke();
        break;

      case 'mine':
        // Pickaxe
        ctx.strokeStyle = poiColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - 2, y - 3);
        ctx.lineTo(x + 2, y - 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 3);
        ctx.lineTo(x, y + 3);
        ctx.stroke();
        break;

      case 'camp':
        // Tent triangle
        ctx.fillStyle = poiColor;
        ctx.beginPath();
        ctx.moveTo(x, y - 3);
        ctx.lineTo(x - 3, y + 2);
        ctx.lineTo(x + 3, y + 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y - 3);
        ctx.lineTo(x, y + 2);
        ctx.stroke();
        break;

      case 'portal':
        // Concentric circles
        ctx.strokeStyle = poiColor;
        ctx.lineWidth = 1;
        for (var p = 1; p <= 3; p++) {
          ctx.beginPath();
          ctx.arc(x, y, p * 1.3, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;

      case 'dragon_lair':
        // Simplified dragon
        ctx.fillStyle = poiColor;
        ctx.beginPath();
        ctx.arc(x - 1, y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 1, y - 1);
        ctx.lineTo(x + 3, y - 2);
        ctx.lineTo(x + 3, y);
        ctx.closePath();
        ctx.fill();
        break;
    }

    // Label below
    if (poi.name) {
      ctx.font = 'italic ' + labelSize + 'px Spectral';
      ctx.textAlign = 'center';
      ctx.fillStyle = FMap.dark ? '#8a8a8a' : '#4a4a4a';
      ctx.fillText(poi.name, x, y + 12);
    }
  });
}

// === 13. FEATURE LABELS ===
function fmRenderFeatureLabels(ctx) {
  if (!FMap.world.features) return;

  var b = FMap.mapBounds;
  var labelColor = FMap.dark ? '#6a8aaa' : '#2a4a7a';

  // Mountain ranges
  if (FMap.world.features.mountains && FMap.world.features.mountains.length > 0) {
    FMap.world.features.mountains.forEach(function(range) {
      if (!range.name || range.cells.length === 0) return;

      var avgCol = 0, avgRow = 0;
      range.cells.forEach(function(cell) {
        avgCol += cell.col;
        avgRow += cell.row;
      });
      avgCol /= range.cells.length;
      avgRow /= range.cells.length;

      var x = b.x + (avgCol + 0.5) / FMap.grid.cols * b.w;
      var y = b.y + (avgRow + 0.5) / FMap.grid.rows * b.h;

      ctx.font = 'italic bold 14px Cinzel';
      ctx.fillStyle = FMap.dark ? '#9a7a5a' : '#6a4a2a';
      ctx.textAlign = 'center';
      ctx.fillText(range.name, x, y);
    });
  }

  // Forests
  if (FMap.world.features.forests && FMap.world.features.forests.length > 0) {
    FMap.world.features.forests.forEach(function(forest) {
      if (!forest.name || forest.cells.length === 0) return;

      var avgCol = 0, avgRow = 0;
      forest.cells.forEach(function(cell) {
        avgCol += cell.col;
        avgRow += cell.row;
      });
      avgCol /= forest.cells.length;
      avgRow /= forest.cells.length;

      var x = b.x + (avgCol + 0.5) / FMap.grid.cols * b.w;
      var y = b.y + (avgRow + 0.5) / FMap.grid.rows * b.h;

      ctx.font = 'italic 12px Cinzel';
      ctx.fillStyle = FMap.dark ? '#3a7a28' : '#2a5a18';
      ctx.textAlign = 'center';
      ctx.fillText(forest.name, x, y);
    });
  }

  // Seas/Oceans
  if (FMap.world.features.seas && FMap.world.features.seas.length > 0) {
    FMap.world.features.seas.forEach(function(sea) {
      if (!sea.name || sea.cells.length === 0) return;

      var avgCol = 0, avgRow = 0;
      sea.cells.forEach(function(cell) {
        avgCol += cell.col;
        avgRow += cell.row;
      });
      avgCol /= sea.cells.length;
      avgRow /= sea.cells.length;

      var x = b.x + (avgCol + 0.5) / FMap.grid.cols * b.w;
      var y = b.y + (avgRow + 0.5) / FMap.grid.rows * b.h;

      ctx.font = 'italic 16px Cinzel';
      ctx.fillStyle = FMap.dark ? '#4a8aaa' : '#1a4a7a';
      ctx.textAlign = 'center';
      ctx.fillText(sea.name, x, y);
    });
  }
}

// === 14. COMPASS ROSE ===
function fmRenderCompass(ctx, cx, cy, size) {
  var mainArrowLen = size * 0.35;
  var ordinalArrowLen = size * 0.25;
  var minorArrowLen = size * 0.15;

  // Outer circle
  ctx.strokeStyle = FMap.dark ? '#3a2a1a' : '#2a1a0a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.45, 0, Math.PI * 2);
  ctx.stroke();

  // Inner circle
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.35, 0, Math.PI * 2);
  ctx.stroke();

  // Cardinal points (NESW)
  var cardinals = [
    { angle: -Math.PI / 2, letter: 'N', isNorth: true },
    { angle: 0, letter: 'E', isNorth: false },
    { angle: Math.PI / 2, letter: 'S', isNorth: false },
    { angle: Math.PI, letter: 'W', isNorth: false }
  ];

  cardinals.forEach(function(cardinal) {
    var angle = cardinal.angle;
    var arrowColor = cardinal.isNorth ? '#c41e3a' : (FMap.dark ? '#3a2a1a' : '#2a1a0a');

    // Arrow
    ctx.fillStyle = arrowColor;
    var tipX = cx + Math.cos(angle) * mainArrowLen;
    var tipY = cy + Math.sin(angle) * mainArrowLen;
    var baseAngle1 = angle + Math.PI / 6;
    var baseAngle2 = angle - Math.PI / 6;
    var baseX1 = cx + Math.cos(baseAngle1) * (size * 0.15);
    var baseY1 = cy + Math.sin(baseAngle1) * (size * 0.15);
    var baseX2 = cx + Math.cos(baseAngle2) * (size * 0.15);
    var baseY2 = cy + Math.sin(baseAngle2) * (size * 0.15);

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(baseX1, baseY1);
    ctx.lineTo(baseX2, baseY2);
    ctx.closePath();
    ctx.fill();

    // Letter
    ctx.font = 'bold 12px Cinzel';
    ctx.fillStyle = cardinal.isNorth ? '#c41e3a' : (FMap.dark ? '#3a2a1a' : '#2a1a0a');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var labelDist = size * 0.55;
    ctx.fillText(cardinal.letter, cx + Math.cos(angle) * labelDist, cy + Math.sin(angle) * labelDist);
  });

  // Ordinal points
  var ordinals = [
    -Math.PI / 4, Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4
  ];

  ctx.fillStyle = FMap.dark ? '#3a2a1a' : '#2a1a0a';
  ordinals.forEach(function(angle) {
    var tipX = cx + Math.cos(angle) * ordinalArrowLen;
    var tipY = cy + Math.sin(angle) * ordinalArrowLen;
    var baseAngle1 = angle + Math.PI / 8;
    var baseAngle2 = angle - Math.PI / 8;
    var baseX1 = cx + Math.cos(baseAngle1) * (size * 0.1);
    var baseY1 = cy + Math.sin(baseAngle1) * (size * 0.1);
    var baseX2 = cx + Math.cos(baseAngle2) * (size * 0.1);
    var baseY2 = cy + Math.sin(baseAngle2) * (size * 0.1);

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(baseX1, baseY1);
    ctx.lineTo(baseX2, baseY2);
    ctx.closePath();
    ctx.fill();
  });

  // Minor points
  for (var angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
    var isCardinal = Math.abs(angle % (Math.PI / 2)) < 0.1 || Math.abs(angle % (Math.PI / 2) - Math.PI / 2) < 0.1;
    var isOrdinal = Math.abs((angle + Math.PI / 4) % (Math.PI / 2) - Math.PI / 4) < 0.1;

    if (!isCardinal && !isOrdinal) {
      var tipX = cx + Math.cos(angle) * minorArrowLen;
      var tipY = cy + Math.sin(angle) * minorArrowLen;
      ctx.fillStyle = FMap.dark ? 'rgba(58, 42, 26, 0.5)' : 'rgba(42, 26, 10, 0.5)';
      ctx.fillRect(tipX - 0.5, tipY - 0.5, 1, 1);
    }
  }

  // Center ornament
  ctx.fillStyle = FMap.dark ? '#3a2a1a' : '#2a1a0a';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

// === 15. TITLE CARTOUCHE ===
function fmRenderCartouche(ctx, x, y, title, subtitle) {
  var width = 300;
  var height = 80;
  var curveWidth = 40;
  var textSize = 24;
  var subtextSize = 12;

  // Scroll background
  ctx.fillStyle = FMap.dark ? 'rgba(100, 90, 70, 0.8)' : 'rgba(240, 235, 220, 0.9)';
  ctx.fillRect(x - width / 2 + curveWidth, y - height / 2, width - 2 * curveWidth, height);

  // Left curl
  ctx.beginPath();
  ctx.bezierCurveTo(
    x - width / 2, y - height / 2,
    x - width / 2 - curveWidth, y,
    x - width / 2, y + height / 2
  );
  ctx.fill();

  // Right curl
  ctx.beginPath();
  ctx.bezierCurveTo(
    x + width / 2, y - height / 2,
    x + width / 2 + curveWidth, y,
    x + width / 2, y + height / 2
  );
  ctx.fill();

  // Decorative border
  ctx.strokeStyle = FMap.dark ? '#2a1a0a' : '#2a1a0a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - width / 2 + curveWidth + 2, y - height / 2 + 2, width - 2 * curveWidth - 4, height - 4);

  // Inner line
  ctx.lineWidth = 1;
  ctx.strokeRect(x - width / 2 + curveWidth + 5, y - height / 2 + 5, width - 2 * curveWidth - 10, height - 10);

  // Title text
  ctx.font = 'bold ' + textSize + 'px Cinzel';
  ctx.fillStyle = '#c41e3a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title || 'World Map', x, y - 15);

  // Subtitle text
  ctx.font = 'italic ' + subtextSize + 'px Cinzel';
  ctx.fillStyle = FMap.dark ? '#6a4a3a' : '#3a2a1a';
  ctx.fillText(subtitle || '', x, y + 15);
}

// === 16. SCALE BAR ===
function fmRenderScaleBar(ctx, x, y, label) {
  var barWidth = 100;
  var segmentWidth = barWidth / 6;
  var barHeight = 10;

  // Segments
  for (var s = 0; s < 6; s++) {
    ctx.fillStyle = s % 2 === 0 ? '#000000' : '#ffffff';
    ctx.fillRect(x + s * segmentWidth, y, segmentWidth, barHeight);
  }

  // Border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, barWidth, barHeight);

  // End markers
  ctx.beginPath();
  ctx.moveTo(x, y - 3);
  ctx.lineTo(x, y + barHeight + 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + barWidth, y - 3);
  ctx.lineTo(x + barWidth, y + barHeight + 3);
  ctx.stroke();

  // Label
  ctx.font = '10px Cinzel';
  ctx.textAlign = 'center';
  ctx.fillStyle = FMap.dark ? '#8a8a8a' : '#2a2a2a';
  ctx.fillText(label || 'Scale', x + barWidth / 2, y + barHeight + 15);
}

// === 17. LEGEND ===
function fmRenderLegend(ctx, x, y) {
  var boxWidth = 140;
  var boxHeight = 200;
  var padding = 8;
  var lineHeight = 14;

  // Background parchment
  ctx.fillStyle = FMap.dark ? 'rgba(80, 70, 50, 0.7)' : 'rgba(240, 235, 220, 0.8)';
  ctx.fillRect(x, y, boxWidth, boxHeight);

  // Border
  ctx.strokeStyle = FMap.dark ? '#3a2a1a' : '#2a1a0a';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, boxWidth, boxHeight);

  // Title
  ctx.font = 'bold 12px Cinzel';
  ctx.fillStyle = FMap.dark ? '#d4a574' : '#2a1a0a';
  ctx.textAlign = 'left';
  ctx.fillText('Legend', x + padding, y + padding + 10);

  // Legend items
  var items = [
    { label: 'Capital', color: '#3a2a1a', size: 6 },
    { label: 'City', color: '#3a2a1a', size: 5 },
    { label: 'Town', color: '#3a2a1a', size: 4 },
    { label: 'Hamlet', color: '#3a2a1a', size: 3 },
    { label: 'Mountain', color: '#4a4540', size: 5 },
    { label: 'Forest', color: '#1a3810', size: 4 },
    { label: 'Road', color: '#4a3a2a', size: 2 },
    { label: 'River', color: '#0a1a4a', size: 2 },
    { label: 'Dungeon', color: '#2a2a2a', size: 3 }
  ];

  ctx.font = '9px Cinzel';
  ctx.fillStyle = FMap.dark ? '#a08a6a' : '#3a2a1a';
  ctx.textAlign = 'left';

  for (var i = 0; i < items.length; i++) {
    var itemY = y + padding + 25 + i * lineHeight;
    var item = items[i];

    // Icon
    ctx.fillStyle = item.color;
    if (item.label === 'Road' || item.label === 'River') {
      ctx.fillRect(x + padding, itemY - 1, item.size * 3, item.size);
    } else {
      ctx.beginPath();
      ctx.arc(x + padding + 3, itemY + 2, item.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Label
    ctx.fillStyle = FMap.dark ? '#a08a6a' : '#3a2a1a';
    ctx.fillText(item.label, x + padding + 15, itemY + 3);
  }
}

// === 18. MASTER RENDER FUNCTION ===
function fmRenderWorldMap() {
  // Detect dark mode
  var docEl = document.documentElement;
  if (docEl && docEl.classList) {
    FMap.dark = docEl.classList.contains('dark') || docEl.classList.contains('dark-mode');
  }

  // Ensure canvas is available
  if (!FMap.canvas) {
    FMap.canvas = document.getElementById('fantasyMapCanvas') || document.getElementById('mapCanvas');
    if (!FMap.canvas) return;
  }
  FMap.ctx = FMap.canvas.getContext('2d');

  // Set canvas dimensions
  FMap.canvas.width = FMap.W;
  FMap.canvas.height = FMap.H;

  // Calculate map bounds (margins: 55px top/left/right, 50px bottom)
  FMap.mapBounds = {
    x: 55,
    y: 55,
    w: FMap.W - 110,
    h: FMap.H - 105
  };

  var ctx = FMap.ctx;

  // Render in order
  fmRenderParchment(ctx, FMap.W, FMap.H, FMap.dark);
  fmRenderTerrain(ctx);
  fmRenderCoastlines(ctx);
  fmRenderWater(ctx);
  fmRenderRivers(ctx);
  fmRenderMountains(ctx);
  fmRenderForests(ctx);
  fmRenderKingdomBorders(ctx);
  fmRenderRoads(ctx);
  fmRenderSettlements(ctx);
  fmRenderPOIs(ctx);
  fmRenderFeatureLabels(ctx);

  fmRenderBorder(ctx, FMap.W, FMap.H, FMap.dark);

  // Cartouche at top center
  fmRenderCartouche(ctx, FMap.W / 2, 50, 'The Known World', 'A Realm of Adventure');

  // Compass at bottom-right
  var compassX = FMap.W - 80;
  var compassY = FMap.H - 80;
  fmRenderCompass(ctx, compassX, compassY, 50);

  // Scale bar at bottom-left
  fmRenderScaleBar(ctx, 70, FMap.H - 50, '100 leagues');

  // Legend at bottom-right (above compass)
  fmRenderLegend(ctx, FMap.W - 155, FMap.H - 260);
}

// === END PART 3: RENDERING ENGINE ===

// === PART 4: ZOOM SYSTEM, KINGDOM VIEW, CITY VIEW, INTERACTION HANDLERS, USER INPUT UI ===

// ============================================================================
// 1. KINGDOM ZOOM VIEW
// ============================================================================

function fmRenderKingdomMap(kingdomId) {
  if (!FMap.world.kingdoms) return;

  var kingdom = FMap.world.kingdoms.find(function(k) { return k.id === kingdomId; });
  if (!kingdom) return;

  // Ensure canvas
  if (!FMap.canvas) {
    FMap.canvas = document.getElementById('fantasyMapCanvas') || document.getElementById('mapCanvas');
    if (!FMap.canvas) return;
  }
  FMap.ctx = FMap.canvas.getContext('2d');

  // Kingdom cells are cell objects with .row and .col
  var cells = kingdom.cells || [];
  if (cells.length === 0) return;

  // Extract kingdom bounding box from cell objects
  var minRow = Infinity, maxRow = -Infinity;
  var minCol = Infinity, maxCol = -Infinity;

  for (var i = 0; i < cells.length; i++) {
    var c = cells[i];
    if (c.row < minRow) minRow = c.row;
    if (c.row > maxRow) maxRow = c.row;
    if (c.col < minCol) minCol = c.col;
    if (c.col > maxCol) maxCol = c.col;
  }

  // Add padding around kingdom
  var padding = 10;
  minRow = Math.max(0, minRow - padding);
  maxRow = Math.min(FMap.grid.rows - 1, maxRow + padding);
  minCol = Math.max(0, minCol - padding);
  maxCol = Math.min(FMap.grid.cols - 1, maxCol + padding);

  var kingdomColSpan = maxCol - minCol + 1;
  var kingdomRowSpan = maxRow - minRow + 1;

  FMap.level = 'kingdom';
  FMap.view.currentKingdom = kingdomId;

  // Set up mapBounds so existing render functions zoom into this region.
  // The render functions map col 0..grid.cols to b.x .. b.x+b.w.
  // We need col=minCol to map to the left margin and col=maxCol to the right margin.
  var marginX = 55, marginY = 55;
  var drawW = FMap.W - 2 * marginX;
  var drawH = FMap.H - marginY - 50;

  // b.x + (minCol / grid.cols) * b.w = marginX
  // b.x + (maxCol / grid.cols) * b.w = marginX + drawW
  // Solving: b.w = drawW * grid.cols / kingdomColSpan
  var bw = drawW * FMap.grid.cols / kingdomColSpan;
  var bx = marginX - (minCol / FMap.grid.cols) * bw;

  var bh = drawH * FMap.grid.rows / kingdomRowSpan;
  var by = marginY - (minRow / FMap.grid.rows) * bh;

  FMap.mapBounds = { x: bx, y: by, w: bw, h: bh };

  // Render using the same pipeline as world view, clipped to canvas
  var ctx = FMap.ctx;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, FMap.W, FMap.H);
  ctx.clip();

  // Parchment background & border
  fmRenderParchment(ctx, FMap.W, FMap.H, FMap.dark);
  fmRenderBorder(ctx, FMap.W, FMap.H, FMap.dark);

  // Terrain, coastlines, mountains, forests, water, rivers
  fmRenderTerrain(ctx);
  fmRenderCoastlines(ctx);
  fmRenderMountains(ctx);
  fmRenderForests(ctx);
  fmRenderWater(ctx);
  fmRenderRivers(ctx);

  // Kingdom borders, roads, settlements, POIs
  fmRenderKingdomBorders(ctx);
  fmRenderRoads(ctx);
  fmRenderSettlements(ctx);
  fmRenderPOIs(ctx);
  fmRenderFeatureLabels(ctx);

  ctx.restore();

  // Kingdom title cartouche
  fmDrawKingdomCartouche(ctx, kingdom);

  // Compass in lower-left
  fmRenderCompass(ctx, 60, FMap.H - 80, 40);

  // Scale bar
  fmRenderScaleBar(ctx, FMap.W - 180, FMap.H - 40, kingdomColSpan + ' leagues');
}

function fmDrawKingdomCartouche(ctx, kingdom) {
  const x = FMap.W / 2;
  const y = 30;
  const w = 300;
  const h = 50;

  // Draw cartouche background
  ctx.fillStyle = FMap.dark ? 'rgba(80, 40, 20, 0.9)' : 'rgba(220, 200, 160, 0.9)';
  ctx.strokeStyle = FMap.dark ? '#d4af37' : '#8b6914';
  ctx.lineWidth = 2;
  fmDrawRoundRect(ctx, x - w / 2, y, w, h, 5);
  ctx.fill();
  ctx.stroke();

  // Text
  ctx.font = 'bold 16px Cinzel';
  ctx.fillStyle = FMap.dark ? '#d4af37' : '#8b2e00';
  ctx.textAlign = 'center';
  ctx.fillText(kingdom.name, x, y + 18);

  ctx.font = '12px Cinzel';
  ctx.fillStyle = FMap.dark ? '#d4af37' : '#6b4423';
  ctx.fillText(`Ruler: ${kingdom.ruler || 'Unknown'}`, x, y + 33);
}

// ============================================================================
// 2. CITY ZOOM VIEW
// ============================================================================

function fmRenderCityMap(cityObj) {
  if (!cityObj) return;

  FMap.level = 'city';
  FMap.view.currentCity = cityObj;

  // Ensure canvas
  if (!FMap.canvas) {
    FMap.canvas = document.getElementById('fantasyMapCanvas') || document.getElementById('mapCanvas');
    if (!FMap.canvas) return;
  }
  var ctx = FMap.canvas.getContext('2d');

  // Clear canvas
  ctx.fillStyle = '#90b880';
  ctx.fillRect(0, 0, FMap.W, FMap.H);

  // Generate city layout
  const cityLayout = fmGenerateCityLayout(cityObj);

  // Draw city walls
  fmDrawCityWalls(ctx, cityLayout);

  // Draw districts
  fmDrawCityDistricts(ctx, cityLayout);

  // Draw streets
  fmDrawCityStreets(ctx, cityLayout);

  // Draw landmarks
  const landmarks = fmDrawCityLandmarks(ctx, cityLayout);

  // Draw surrounding countryside
  fmDrawCityCountryside(ctx, cityLayout);

  // Draw city name cartouche
  fmDrawCityCartouche(ctx, cityObj);

  // Store landmark positions for interaction
  FMap.view.cityLandmarks = landmarks;
}

function fmGenerateCityLayout(cityObj) {
  const centerX = FMap.W / 2;
  const centerY = FMap.H / 2;

  // Determine city size based on population
  let radiusBase = 80;
  if (cityObj.population > 100000) radiusBase = 150;
  else if (cityObj.population > 50000) radiusBase = 120;
  else if (cityObj.population > 20000) radiusBase = 100;
  else if (cityObj.population > 5000) radiusBase = 80;
  else if (cityObj.population > 1000) radiusBase = 60;
  else radiusBase = 40;

  const numDistricts = cityObj.type === 'capital' ? 7 :
                       cityObj.type === 'city' ? 5 :
                       cityObj.type === 'town' ? 3 : 2;

  const hasWalls = cityObj.type !== 'hamlet';
  const hasHarbor = cityObj.isCoastal;
  const hasRiver = cityObj.isRiver;

  return {
    centerX, centerY,
    radiusBase,
    numDistricts,
    hasWalls,
    hasHarbor,
    hasRiver,
    cityType: cityObj.type,
    gateAngles: [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2],
    districts: []
  };
}

function fmDrawCityWalls(ctx, layout) {
  if (!layout.hasWalls) return;

  ctx.strokeStyle = '#3d3d3d';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(layout.centerX, layout.centerY, layout.radiusBase, 0, 2 * Math.PI);
  ctx.stroke();

  // Gate towers
  ctx.fillStyle = '#2a2a2a';
  layout.gateAngles.forEach(angle => {
    const gateX = layout.centerX + Math.cos(angle) * layout.radiusBase;
    const gateY = layout.centerY + Math.sin(angle) * layout.radiusBase;
    ctx.fillRect(gateX - 8, gateY - 8, 16, 16);
  });
}

function fmDrawCityDistricts(ctx, layout) {
  const anglePerDistrict = (2 * Math.PI) / layout.numDistricts;
  const districtRadius = layout.radiusBase * 0.75;

  const colors = [
    '#d4a574', // Noble quarter
    '#c9a961', // Market
    '#d4a574', // Temple
    '#b8956a', // Harbor
    '#a89968', // Residential
    '#8b7355', // Slums
    '#a0826d'  // Military
  ];

  for (let i = 0; i < layout.numDistricts; i++) {
    const startAngle = i * anglePerDistrict;
    const endAngle = (i + 1) * anglePerDistrict;

    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.moveTo(layout.centerX, layout.centerY);
    ctx.arc(layout.centerX, layout.centerY, districtRadius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    layout.districts.push({
      angle: startAngle + anglePerDistrict / 2,
      radius: districtRadius,
      index: i
    });
  }
}

function fmDrawCityStreets(ctx, layout) {
  ctx.strokeStyle = '#c4b8a8';
  ctx.lineWidth = 3;

  // Radial streets
  layout.districts.forEach(district => {
    const startX = layout.centerX;
    const startY = layout.centerY;
    const endX = layout.centerX + Math.cos(district.angle) * layout.radiusBase;
    const endY = layout.centerY + Math.sin(district.angle) * layout.radiusBase;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  });

  // Ring roads
  ctx.strokeStyle = '#c4b8a8';
  ctx.lineWidth = 2;
  for (let r = 0.3; r < 1; r += 0.35) {
    const radius = layout.radiusBase * r;
    ctx.beginPath();
    ctx.arc(layout.centerX, layout.centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();
  }
}

function fmDrawCityLandmarks(ctx, layout) {
  const landmarks = [];

  // Central castle/keep for capitals
  if (layout.cityType === 'capital') {
    const castleX = layout.centerX;
    const castleY = layout.centerY;
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(castleX - 15, castleY - 15, 30, 30);
    ctx.strokeStyle = '#5c2e0a';
    ctx.lineWidth = 2;
    ctx.strokeRect(castleX - 15, castleY - 15, 30, 30);
    landmarks.push({
      x: castleX, y: castleY,
      name: 'Castle',
      type: 'castle',
      radius: 20
    });
  }

  // Market square
  const marketAngle = 0;
  const marketDist = layout.radiusBase * 0.4;
  const marketX = layout.centerX + Math.cos(marketAngle) * marketDist;
  const marketY = layout.centerY + Math.sin(marketAngle) * marketDist;

  ctx.fillStyle = '#d4af37';
  ctx.fillRect(marketX - 12, marketY - 12, 24, 24);
  ctx.strokeStyle = '#8b6914';
  ctx.lineWidth = 1;
  ctx.strokeRect(marketX - 12, marketY - 12, 24, 24);
  // Draw stall symbols
  for (let i = 0; i < 4; i++) {
    const sx = marketX - 8 + (i % 2) * 8;
    const sy = marketY - 8 + Math.floor(i / 2) * 8;
    ctx.fillRect(sx, sy, 4, 4);
  }

  landmarks.push({
    x: marketX, y: marketY,
    name: 'Market Square',
    type: 'market',
    radius: 18
  });

  // Temple
  const templeAngle = Math.PI / 2;
  const templeDist = layout.radiusBase * 0.5;
  const templeX = layout.centerX + Math.cos(templeAngle) * templeDist;
  const templeY = layout.centerY + Math.sin(templeAngle) * templeDist;

  ctx.fillStyle = '#d4af37';
  ctx.beginPath();
  ctx.moveTo(templeX, templeY - 15);
  ctx.lineTo(templeX + 10, templeY + 10);
  ctx.lineTo(templeX - 10, templeY + 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8b6914';
  ctx.lineWidth = 2;
  ctx.stroke();

  landmarks.push({
    x: templeX, y: templeY,
    name: 'Temple',
    type: 'temple',
    radius: 18
  });

  // Tavern
  const tavernAngle = Math.PI;
  const tavernDist = layout.radiusBase * 0.45;
  const tavernX = layout.centerX + Math.cos(tavernAngle) * tavernDist;
  const tavernY = layout.centerY + Math.sin(tavernAngle) * tavernDist;

  ctx.fillStyle = '#8b4513';
  ctx.fillRect(tavernX - 10, tavernY - 10, 20, 20);
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(tavernX - 8, tavernY - 8, 16, 16);

  landmarks.push({
    x: tavernX, y: tavernY,
    name: 'Tavern',
    type: 'tavern',
    radius: 18
  });

  // Barracks (if military district exists)
  if (layout.numDistricts >= 7) {
    const barracksAngle = 3 * Math.PI / 2;
    const barracksDist = layout.radiusBase * 0.45;
    const barracksX = layout.centerX + Math.cos(barracksAngle) * barracksDist;
    const barracksY = layout.centerY + Math.sin(barracksAngle) * barracksDist;

    ctx.fillStyle = '#666666';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(barracksX - 12 + i * 6, barracksY - 8, 4, 8);
    }

    landmarks.push({
      x: barracksX, y: barracksY,
      name: 'Barracks',
      type: 'barracks',
      radius: 18
    });
  }

  return landmarks;
}

function fmDrawCityCountryside(ctx, layout) {
  ctx.globalAlpha = 0.3;

  // Draw farms/fields outside walls
  const farmRadius = layout.radiusBase + 60;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * 2 * Math.PI;
    const farmX = layout.centerX + Math.cos(angle) * farmRadius;
    const farmY = layout.centerY + Math.sin(angle) * farmRadius;

    ctx.fillStyle = '#90b880';
    ctx.fillRect(farmX - 20, farmY - 20, 40, 40);

    // Field pattern
    ctx.strokeStyle = '#6b8e5f';
    ctx.lineWidth = 1;
    for (let row = -1; row <= 1; row++) {
      ctx.beginPath();
      ctx.moveTo(farmX - 20, farmY - 20 + (row + 1) * 20);
      ctx.lineTo(farmX + 20, farmY - 20 + (row + 1) * 20);
      ctx.stroke();
    }
  }

  ctx.globalAlpha = 1.0;
}

function fmDrawCityCartouche(ctx, cityObj) {
  const x = FMap.W / 2;
  const y = 30;
  const w = 280;
  const h = 60;

  ctx.fillStyle = FMap.dark ? 'rgba(80, 40, 20, 0.9)' : 'rgba(220, 200, 160, 0.9)';
  ctx.strokeStyle = FMap.dark ? '#d4af37' : '#8b6914';
  ctx.lineWidth = 2;
  fmDrawRoundRect(ctx, x - w / 2, y, w, h, 5);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 16px Cinzel';
  ctx.fillStyle = FMap.dark ? '#d4af37' : '#8b2e00';
  ctx.textAlign = 'center';
  ctx.fillText(cityObj.name, x, y + 18);

  ctx.font = '11px Cinzel';
  ctx.fillStyle = FMap.dark ? '#d4af37' : '#6b4423';
  ctx.fillText(`${cityObj.type} (Pop: ~${cityObj.population})`, x, y + 34);
  ctx.fillText(`Ruler: ${cityObj.ruler || 'Unknown'}`, x, y + 48);
}

// ============================================================================
// 3. INTERACTION SYSTEM
// ============================================================================

function fmSetupInteraction() {
  if (!FMap.canvas) return;

  // Tooltip element
  let tooltip = document.getElementById('mapTooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'mapTooltip';
    tooltip.style.cssText = `
      position: fixed;
      display: none;
      background: var(--bg-card);
      border: 2px solid var(--border);
      border-radius: 6px;
      padding: 8px 12px;
      font-family: Cinzel, serif;
      font-size: 12px;
      color: var(--text);
      z-index: 1000;
      pointer-events: none;
      white-space: nowrap;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(tooltip);
  }

  // Mouse move handler
  FMap.canvas.addEventListener('mousemove', (e) => {
    const rect = FMap.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert to grid coords
    const gridCoords = fmScreenToGridCoords(mouseX, mouseY);
    if (!gridCoords) {
      tooltip.style.display = 'none';
      return;
    }

    let hoveredEntity = null;
    let tooltipText = '';
    let isClickable = false;

    if (FMap.level === 'world') {
      // Check kingdoms via cell's kingdomId
      var cell = FMap.grid.cells[gridCoords.cellId];
      if (cell && cell.kingdomId !== null && cell.kingdomId !== undefined) {
        var kingdom = (FMap.world.kingdoms || []).find(function(k) { return k.id === cell.kingdomId; });
        if (kingdom) {
          hoveredEntity = { type: 'kingdom', data: kingdom };
          tooltipText = kingdom.name + ' - Click to zoom in';
          isClickable = true;
        }
      }

      // Check settlements
      if (!hoveredEntity && FMap.world.cities) {
        for (let city of FMap.world.cities) {
          const dx = city.col - gridCoords.col;
          const dy = city.row - gridCoords.row;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 2) { // ~20px radius
            hoveredEntity = { type: 'settlement', data: city };
            tooltipText = `${city.name} (${city.type}, Pop ~${city.population})`;
            isClickable = true;
            break;
          }
        }
      }
    } else if (FMap.level === 'kingdom') {
      // Check settlements
      if (FMap.world.cities) {
        for (let city of FMap.world.cities) {
          if (city.kingdomId === FMap.view.currentKingdom) {
            const screenPos = fmCellToScreen(city.col, city.row);
            const dx = screenPos.x - mouseX;
            const dy = screenPos.y - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 25) {
              hoveredEntity = { type: 'settlement', data: city };
              tooltipText = `${city.name} - Click to enter`;
              isClickable = true;
              break;
            }
          }
        }
      }

      // Check POIs
      if (!hoveredEntity && FMap.world.pois) {
        for (let poi of FMap.world.pois) {
          if (poi.kingdomId === FMap.view.currentKingdom) {
            const screenPos = fmCellToScreen(poi.col, poi.row);
            const dx = screenPos.x - mouseX;
            const dy = screenPos.y - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 20) {
              hoveredEntity = { type: 'poi', data: poi };
              tooltipText = `${poi.name} (${poi.type}) - Click for details`;
              isClickable = true;
              break;
            }
          }
        }
      }
    } else if (FMap.level === 'city') {
      // Check landmarks
      if (FMap.view.cityLandmarks) {
        for (let landmark of FMap.view.cityLandmarks) {
          const dx = landmark.x - mouseX;
          const dy = landmark.y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < landmark.radius) {
            hoveredEntity = { type: 'landmark', data: landmark };
            tooltipText = `${landmark.name} - Click for details`;
            isClickable = true;
            break;
          }
        }
      }
    }

    FMap.view.hoveredEntity = hoveredEntity;
    FMap.canvas.style.cursor = isClickable ? 'pointer' : 'default';

    if (hoveredEntity && tooltipText) {
      tooltip.textContent = tooltipText;
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + 10) + 'px';
      tooltip.style.top = (e.clientY + 10) + 'px';
    } else {
      tooltip.style.display = 'none';
    }
  });

  // Click handler
  FMap.canvas.addEventListener('click', (e) => {
    if (!FMap.view.hoveredEntity) return;

    const entity = FMap.view.hoveredEntity;

    if (entity.type === 'kingdom') {
      fmRenderKingdomMap(entity.data.id);
      fmUpdateBreadcrumb();
      fmUpdateInfoPanel();
    } else if (entity.type === 'settlement') {
      fmRenderCityMap(entity.data);
      fmUpdateBreadcrumb();
      fmUpdateInfoPanel();
    } else if (entity.type === 'poi') {
      fmShowPOIDetail(entity.data);
    } else if (entity.type === 'landmark') {
      fmShowLandmarkDetail(entity.data);
    }
  });

  // Context menu handler
  FMap.canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();

    if (!FMap.view.hoveredEntity) {
      // Show "add POI here" option
      const rect = FMap.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const gridCoords = fmScreenToGridCoords(mouseX, mouseY);
      if (gridCoords) {
        fmShowContextMenu(e.clientX, e.clientY, 'empty', { row: gridCoords.row, col: gridCoords.col });
      }
    } else {
      fmShowContextMenu(e.clientX, e.clientY, FMap.view.hoveredEntity.type, FMap.view.hoveredEntity.data);
    }
  });

  // Canvas resize listener
  window.addEventListener('resize', () => {
    if (FMap.level === 'world') {
      fmRenderWorldMap();
    } else if (FMap.level === 'kingdom') {
      fmRenderKingdomMap(FMap.view.currentKingdom);
    } else if (FMap.level === 'city') {
      fmRenderCityMap(FMap.view.currentCity);
    }
  });
}

function fmScreenToGridCoords(screenX, screenY) {
  var b = FMap.mapBounds;
  if (!b || b.w === 0 || b.h === 0) return null;

  // Both world and kingdom views use mapBounds to map grid to screen:
  // screenX = b.x + (col / grid.cols) * b.w  →  col = (screenX - b.x) / b.w * grid.cols
  var col, row;

  if (FMap.level === 'world' || FMap.level === 'kingdom') {
    col = Math.floor((screenX - b.x) / b.w * FMap.grid.cols);
    row = Math.floor((screenY - b.y) / b.h * FMap.grid.rows);
  } else {
    return null; // City view doesn't use grid coords
  }

  if (col < 0 || col >= FMap.grid.cols || row < 0 || row >= FMap.grid.rows) {
    return null;
  }

  var cellId = row * FMap.grid.cols + col;
  return { col: col, row: row, cellId: cellId };
}

// ============================================================================
// 4. CONTEXT MENU
// ============================================================================

function fmShowContextMenu(x, y, entityType, entityData) {
  // Remove existing menu
  const existingMenu = document.getElementById('mapContextMenu');
  if (existingMenu) existingMenu.remove();

  const menu = document.createElement('div');
  menu.id = 'mapContextMenu';
  menu.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    background: var(--bg-card);
    border: 2px solid var(--border);
    border-radius: 6px;
    min-width: 150px;
    z-index: 1100;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  `;

  const options = [];

  if (entityType === 'settlement' || entityType === 'poi') {
    options.push({ label: 'Rename', action: () => fmShowEditPanel(entityData.id, entityData.name) });
    options.push({ label: 'Add Note', action: () => fmShowNotePanel(entityData.id) });
  }

  if (entityType === 'empty') {
    options.push({ label: 'Add POI Here', action: () => fmAddUserPOI(entityData.row, entityData.col) });
  }

  options.push({ label: 'Close', action: () => menu.remove() });

  options.forEach(opt => {
    const item = document.createElement('div');
    item.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      border-bottom: 1px solid var(--border);
      font-family: Cinzel, serif;
      font-size: 12px;
      color: var(--text);
    `;
    item.textContent = opt.label;
    item.addEventListener('mouseover', () => {
      item.style.background = 'var(--accent)';
      item.style.color = '#fff';
    });
    item.addEventListener('mouseout', () => {
      item.style.background = '';
      item.style.color = 'var(--text)';
    });
    item.addEventListener('click', () => {
      opt.action();
      menu.remove();
    });
    menu.appendChild(item);
  });

  document.body.appendChild(menu);

  // Close menu on outside click
  const closeMenu = () => {
    menu.remove();
    document.removeEventListener('click', closeMenu);
  };
  setTimeout(() => document.addEventListener('click', closeMenu), 100);
}

// ============================================================================
// 5. BREADCRUMB NAVIGATION
// ============================================================================

function fmUpdateBreadcrumb() {
  const breadcrumb = document.getElementById('mapBreadcrumb');
  if (!breadcrumb) return;

  let html = '';

  if (FMap.level === 'world') {
    html = `<span style="color: crimson; font-weight: bold;">${FMap.world.name || 'World'}</span>`;
  } else if (FMap.level === 'kingdom') {
    const kingdom = FMap.world.kingdoms.find(k => k.id === FMap.view.currentKingdom);
    if (kingdom) {
      html = `
        <span style="cursor: pointer; color: var(--text);" onclick="fmRenderWorldMap(); fmUpdateBreadcrumb(); fmUpdateInfoPanel();">
          ${FMap.world.name || 'World'}
        </span>
        <span style="margin: 0 6px;">></span>
        <span style="color: crimson; font-weight: bold;">${kingdom.name}</span>
      `;
    }
  } else if (FMap.level === 'city') {
    const kingdom = FMap.world.kingdoms.find(k => k.id === FMap.view.currentCity.kingdomId);
    const city = FMap.view.currentCity;
    if (kingdom && city) {
      html = `
        <span style="cursor: pointer; color: var(--text);" onclick="fmRenderWorldMap(); fmUpdateBreadcrumb(); fmUpdateInfoPanel();">
          ${FMap.world.name || 'World'}
        </span>
        <span style="margin: 0 6px;">></span>
        <span style="cursor: pointer; color: var(--text);" onclick="fmRenderKingdomMap('${kingdom.id}'); fmUpdateBreadcrumb(); fmUpdateInfoPanel();">
          ${kingdom.name}
        </span>
        <span style="margin: 0 6px;">></span>
        <span style="color: crimson; font-weight: bold;">${city.name}</span>
      `;
    }
  }

  breadcrumb.innerHTML = html;
}

// ============================================================================
// 6. INFO PANEL
// ============================================================================

function fmUpdateInfoPanel() {
  const panel = document.getElementById('mapInfoPanel');
  if (!panel) return;

  let html = '';

  if (FMap.level === 'world') {
    html = fmBuildWorldInfoPanel();
  } else if (FMap.level === 'kingdom') {
    const kingdom = FMap.world.kingdoms.find(k => k.id === FMap.view.currentKingdom);
    if (kingdom) {
      html = fmBuildKingdomInfoPanel(kingdom);
    }
  } else if (FMap.level === 'city') {
    const city = FMap.view.currentCity;
    if (city) {
      html = fmBuildCityInfoPanel(city);
    }
  }

  panel.innerHTML = html;
}

function fmBuildWorldInfoPanel() {
  let html = `
    <h3>${FMap.world.name || 'World'}</h3>
    <p>Total Kingdoms: ${FMap.world.kingdoms.length}</p>
    <p>Total Settlements: ${FMap.world.cities.length}</p>

    <h4>Kingdoms</h4>
    <ul style="font-size: 12px; max-height: 200px; overflow-y: auto;">
  `;

  FMap.world.kingdoms.forEach(k => {
    const capital = k.capital ? FMap.world.cities.find(c => c.id === k.capital) : null;
    html += `
      <li style="cursor: pointer; margin: 4px 0;" onclick="fmRenderKingdomMap('${k.id}'); fmUpdateBreadcrumb(); fmUpdateInfoPanel();">
        <strong>${k.name}</strong> - Ruler: ${k.ruler || 'Unknown'}
        ${capital ? `<br/>Capital: ${capital.name}` : ''}
      </li>
    `;
  });

  html += '</ul>';
  return html;
}

function fmBuildKingdomInfoPanel(kingdom) {
  const cities = FMap.world.cities.filter(c => c.kingdomId === kingdom.id);
  const pois = FMap.world.pois.filter(p => p.kingdomId === kingdom.id);

  let html = `
    <h3>${kingdom.name}</h3>
    <p><strong>Ruler:</strong> ${kingdom.ruler || 'Unknown'}</p>
    <p><strong>Culture:</strong> ${kingdom.culture || 'Unknown'}</p>
    <p><strong>Settlements:</strong> ${cities.length}</p>

    <h4>Cities & Towns</h4>
    <ul style="font-size: 11px; max-height: 150px; overflow-y: auto;">
  `;

  cities.forEach(city => {
    html += `
      <li style="cursor: pointer; margin: 3px 0;" onclick="fmRenderCityMap({...${JSON.stringify(city)}}); fmUpdateBreadcrumb(); fmUpdateInfoPanel();">
        <strong>${city.name}</strong> (${city.type}, Pop ~${city.population})
      </li>
    `;
  });

  html += `</ul>`;

  if (pois.length > 0) {
    html += `<h4>Points of Interest</h4><ul style="font-size: 11px;">`;
    pois.slice(0, 5).forEach(poi => {
      html += `<li>${poi.name} (${poi.type})</li>`;
    });
    if (pois.length > 5) {
      html += `<li><em>...and ${pois.length - 5} more</em></li>`;
    }
    html += `</ul>`;
  }

  return html;
}

function fmBuildCityInfoPanel(city) {
  const pois = FMap.world.pois.filter(p => p.nearestSettlement === city.id);

  let html = `
    <h3>${city.name}</h3>
    <p><strong>Type:</strong> ${city.type}</p>
    <p><strong>Population:</strong> ~${city.population}</p>
    <p><strong>Ruler:</strong> ${city.ruler || 'Unknown'}</p>

    <h4>Notable Landmarks</h4>
    <ul style="font-size: 11px;">
      <li>Market Square</li>
      <li>Temple</li>
      <li>Tavern</li>
      ${city.type === 'capital' ? '<li>Castle</li>' : ''}
      ${city.isCoastal ? '<li>Harbor & Docks</li>' : ''}
    </ul>

    ${pois.length > 0 ? `
    <h4>Nearby POIs</h4>
    <ul style="font-size: 11px;">
      ${pois.slice(0, 3).map(p => `<li>${p.name} (${p.type})</li>`).join('')}
    </ul>
    ` : ''}
  `;

  return html;
}

// ============================================================================
// 7. POI & LANDMARK DETAIL PANELS
// ============================================================================

function fmShowPOIDetail(poi) {
  fmShowDetailPanel('POI', poi.name, `
    <p><strong>Type:</strong> ${poi.type}</p>
    <p><strong>Difficulty:</strong> Level ${poi.difficulty || '?'}</p>
    <p><strong>Description:</strong> ${poi.description || 'No description available.'}</p>
    <p><strong>Loot:</strong> ${poi.loot || 'Unknown'}</p>
    <p><strong>Nearest Settlement:</strong> ${fmGetCityName(poi.nearestSettlement)}</p>
  `);
}

function fmShowLandmarkDetail(landmark) {
  fmShowDetailPanel('Landmark', landmark.name, `
    <p><strong>Type:</strong> ${landmark.type}</p>
    <p><strong>Part of:</strong> ${FMap.view.currentCity.name}</p>
    <p>A notable location in the city.</p>
  `);
}

function fmShowDetailPanel(title, name, content) {
  let panel = document.getElementById('mapDetailPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'mapDetailPanel';
    panel.style.cssText = `
      position: fixed;
      right: 0;
      top: 0;
      width: 300px;
      height: 100vh;
      background: var(--bg-card);
      border-left: 2px solid var(--border);
      padding: 20px;
      overflow-y: auto;
      z-index: 800;
      box-shadow: -4px 0 8px rgba(0,0,0,0.2);
      font-family: 'Segoe UI', sans-serif;
      font-size: 13px;
    `;
    document.body.appendChild(panel);
  }

  panel.innerHTML = `
    <button onclick="document.getElementById('mapDetailPanel').style.display='none';" style="float:right; background:none; border:none; font-size:18px; cursor:pointer;">×</button>
    <h2 style="margin-top:0; color:var(--accent);">${title}</h2>
    <h3 style="color:var(--text);">${name}</h3>
    ${content}
  `;
  panel.style.display = 'block';
}

function fmGetCityName(cityId) {
  if (!cityId) return 'Unknown';
  const city = FMap.world.cities.find(c => c.id === cityId);
  return city ? city.name : 'Unknown';
}

// ============================================================================
// 8. USER CUSTOMIZATION PANELS
// ============================================================================

function fmShowEditPanel(entityId, currentName) {
  const modal = fmCreateModal('Edit Entity', `
    <label style="display:block; margin-bottom:8px;">
      <strong>Rename:</strong><br/>
      <input type="text" id="editNameInput" value="${currentName}" style="width:100%; padding:6px; box-sizing:border-box; margin-top:4px;">
    </label>
    <label style="display:block; margin-bottom:12px;">
      <strong>Notes:</strong><br/>
      <textarea id="editNoteInput" style="width:100%; height:80px; padding:6px; box-sizing:border-box; margin-top:4px; resize:vertical;"></textarea>
    </label>
    <button onclick="fmSaveEntityEdit('${entityId}'); this.closest('.mapModal').remove();" style="padding:8px 16px; background:var(--accent); color:#fff; border:none; border-radius:4px; cursor:pointer; margin-right:8px;">Save</button>
    <button onclick="this.closest('.mapModal').remove();" style="padding:8px 16px; background:#999; color:#fff; border:none; border-radius:4px; cursor:pointer;">Cancel</button>
  `);

  // Load existing note if available
  if (FMap.userEdits.notes[entityId]) {
    document.getElementById('editNoteInput').value = FMap.userEdits.notes[entityId];
  }
}

function fmShowNotePanel(entityId) {
  const modal = fmCreateModal('Add Note', `
    <textarea id="noteInput" placeholder="Add a note..." style="width:100%; height:100px; padding:6px; box-sizing:border-box; resize:vertical;"></textarea><br/><br/>
    <button onclick="fmSaveEntityNote('${entityId}'); this.closest('.mapModal').remove();" style="padding:8px 16px; background:var(--accent); color:#fff; border:none; border-radius:4px; cursor:pointer; margin-right:8px;">Save Note</button>
    <button onclick="this.closest('.mapModal').remove();" style="padding:8px 16px; background:#999; color:#fff; border:none; border-radius:4px; cursor:pointer;">Cancel</button>
  `);

  if (FMap.userEdits.notes[entityId]) {
    document.getElementById('noteInput').value = FMap.userEdits.notes[entityId];
  }

  setTimeout(() => document.getElementById('noteInput').focus(), 100);
}

function fmAddUserPOI(row, col) {
  const modal = fmCreateModal('Add POI', `
    <label style="display:block; margin-bottom:8px;">
      <strong>Name:</strong><br/>
      <input type="text" id="poiNameInput" placeholder="POI Name" style="width:100%; padding:6px; box-sizing:border-box; margin-top:4px;">
    </label>
    <label style="display:block; margin-bottom:8px;">
      <strong>Type:</strong><br/>
      <select id="poiTypeInput" style="width:100%; padding:6px; box-sizing:border-box; margin-top:4px;">
        <option>Dungeon</option>
        <option>Tower</option>
        <option>Shrine</option>
        <option>Ruins</option>
        <option>Monster Lair</option>
        <option>Mine</option>
        <option>Temple</option>
        <option>Other</option>
      </select>
    </label>
    <label style="display:block; margin-bottom:12px;">
      <strong>Description:</strong><br/>
      <textarea id="poiDescInput" placeholder="Description..." style="width:100%; height:80px; padding:6px; box-sizing:border-box; margin-top:4px; resize:vertical;"></textarea>
    </label>
    <button onclick="fmSaveUserPOI(${row}, ${col}); this.closest('.mapModal').remove();" style="padding:8px 16px; background:var(--accent); color:#fff; border:none; border-radius:4px; cursor:pointer; margin-right:8px;">Add POI</button>
    <button onclick="this.closest('.mapModal').remove();" style="padding:8px 16px; background:#999; color:#fff; border:none; border-radius:4px; cursor:pointer;">Cancel</button>
  `);

  setTimeout(() => document.getElementById('poiNameInput').focus(), 100);
}

function fmCreateModal(title, content) {
  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 2000;
  `;
  backdrop.onclick = (e) => {
    if (e.target === backdrop) backdrop.remove();
  };

  const modal = document.createElement('div');
  modal.className = 'mapModal';
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--bg-card);
    border: 2px solid var(--border);
    border-radius: 8px;
    padding: 20px;
    min-width: 300px;
    max-width: 500px;
    z-index: 2001;
    font-family: 'Segoe UI', sans-serif;
    font-size: 13px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  `;

  modal.innerHTML = `
    <h2 style="margin-top:0; color:var(--accent);">${title}</h2>
    ${content}
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  return modal;
}

function fmSaveEntityEdit(entityId) {
  const newName = document.getElementById('editNameInput').value;
  const note = document.getElementById('editNoteInput').value;

  if (newName) {
    FMap.userEdits.renamedEntities[entityId] = newName;
  }
  if (note) {
    FMap.userEdits.notes[entityId] = note;
  }

  fmSaveEdits();

  // Refresh current view
  if (FMap.level === 'kingdom') {
    fmRenderKingdomMap(FMap.view.currentKingdom);
  } else if (FMap.level === 'city') {
    fmRenderCityMap(FMap.view.currentCity);
  }
  fmUpdateInfoPanel();
}

function fmSaveEntityNote(entityId) {
  const note = document.getElementById('noteInput').value;
  if (note) {
    FMap.userEdits.notes[entityId] = note;
    fmSaveEdits();
  }
}

function fmSaveUserPOI(row, col) {
  const name = document.getElementById('poiNameInput').value;
  const type = document.getElementById('poiTypeInput').value;
  const description = document.getElementById('poiDescInput').value;

  if (!name) {
    alert('Please enter a name for the POI');
    return;
  }

  const poiId = 'user_' + Date.now();
  const newPOI = {
    id: poiId,
    name: name,
    type: type,
    description: description,
    row: row,
    col: col,
    level: 1,
    difficulty: 1,
    loot: 'Unknown',
    nearestSettlement: null,
    kingdomId: FMap.view.currentKingdom
  };

  FMap.world.pois.push(newPOI);
  FMap.userEdits.addedPOIs.push(poiId);
  fmSaveEdits();

  if (FMap.level === 'kingdom') {
    fmRenderKingdomMap(FMap.view.currentKingdom);
  }
}

function fmDeletePOI(poiId) {
  if (confirm('Remove this POI?')) {
    FMap.world.pois = FMap.world.pois.filter(p => p.id !== poiId);
    FMap.userEdits.removedPOIs.push(poiId);
    fmSaveEdits();

    if (FMap.level === 'kingdom') {
      fmRenderKingdomMap(FMap.view.currentKingdom);
    } else if (FMap.level === 'city') {
      fmRenderCityMap(FMap.view.currentCity);
    }

    const detail = document.getElementById('mapDetailPanel');
    if (detail) detail.style.display = 'none';
  }
}

// ============================================================================
// 9. SAVE/LOAD USER EDITS
// ============================================================================

function fmSaveEdits() {
  const editsJSON = JSON.stringify(FMap.userEdits);
  localStorage.setItem('fmap_user_edits', editsJSON);
}

function fmLoadEdits() {
  const stored = localStorage.getItem('fmap_user_edits');
  if (stored) {
    try {
      FMap.userEdits = JSON.parse(stored);

      // Apply renames
      Object.keys(FMap.userEdits.renamedEntities).forEach(id => {
        const city = FMap.world.cities.find(c => c.id === id);
        if (city) city.name = FMap.userEdits.renamedEntities[id];

        const poi = FMap.world.pois.find(p => p.id === id);
        if (poi) poi.name = FMap.userEdits.renamedEntities[id];
      });

      // Restore user-added POIs
      FMap.userEdits.addedPOIs.forEach(poiId => {
        // POIs should already be in the world from a previous session
        // If they're not, they were deleted
      });

      // Remove deleted POIs
      FMap.world.pois = FMap.world.pois.filter(p =>
        !FMap.userEdits.removedPOIs.includes(p.id)
      );
    } catch (e) {
      console.error('Failed to load user edits:', e);
    }
  }
}

// ============================================================================
// 10. DOWNLOAD FUNCTION
// ============================================================================

function fmDownloadMap() {
  const canvas = FMap.canvas;
  const link = document.createElement('a');

  let filename = 'fantasy-map';
  if (FMap.level === 'kingdom') {
    const kingdom = FMap.world.kingdoms.find(k => k.id === FMap.view.currentKingdom);
    if (kingdom) filename = `map-${kingdom.name.replace(/\s+/g, '-')}`;
  } else if (FMap.level === 'city') {
    if (FMap.view.currentCity) {
      filename = `map-${FMap.view.currentCity.name.replace(/\s+/g, '-')}`;
    }
  } else {
    filename = `map-${FMap.world.name.replace(/\s+/g, '-')}`;
  }

  link.href = canvas.toDataURL('image/png');
  link.download = filename + '.png';
  link.click();
}

// ============================================================================
// 11. HELPER UTILITIES
// ============================================================================

function fmDrawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fmDrawParchmentBackground(ctx) {
  // Subtle parchment texture
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#8b6f47';
  for (let i = 0; i < FMap.W; i += 50) {
    for (let j = 0; j < FMap.H; j += 50) {
      ctx.fillRect(i + Math.random() * 10 - 5, j + Math.random() * 10 - 5, 20, 20);
    }
  }
  ctx.restore();
}

function fmDrawCompass(ctx, x, y) {
  const radius = 25;

  // Circle
  ctx.fillStyle = FMap.dark ? 'rgba(255, 215, 0, 0.3)' : 'rgba(139, 110, 50, 0.3)';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = FMap.dark ? '#d4af37' : '#8b6e32';
  ctx.lineWidth = 1;
  ctx.stroke();

  // N, S, E, W
  ctx.font = 'bold 10px Cinzel';
  ctx.fillStyle = FMap.dark ? '#d4af37' : '#8b6e32';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillText('N', x, y - radius + 8);
  ctx.fillText('S', x, y + radius - 8);
  ctx.fillText('E', x + radius - 8, y);
  ctx.fillText('W', x - radius + 8, y);

  // Center dot
  ctx.fillStyle = FMap.dark ? '#d4af37' : '#8b6e32';
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, 2 * Math.PI);
  ctx.fill();
}

function fmDrawScaleBar(ctx, x, y, distance) {
  const barWidth = 50;

  ctx.strokeStyle = FMap.dark ? '#d4af37' : '#8b6e32';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + barWidth, y);
  ctx.stroke();

  // End caps
  ctx.beginPath();
  ctx.moveTo(x, y - 5);
  ctx.lineTo(x, y + 5);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + barWidth, y - 5);
  ctx.lineTo(x + barWidth, y + 5);
  ctx.stroke();

  // Label
  ctx.font = '10px Cinzel';
  ctx.fillStyle = FMap.dark ? '#d4af37' : '#8b6e32';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`~${Math.round(distance / 10)}km`, x + barWidth / 2, y + 8);
}

// ============================================================================
// 12. MASTER ENTRY POINT
// ============================================================================

function generateFantasyWorld() {
  // Read options from DOM
  const mapSizeSelect = document.getElementById('mapSize');
  const terrainSelect = document.getElementById('terrainType');
  const nameStyleSelect = document.getElementById('nameStyle');

  const options = {
    size: mapSizeSelect ? mapSizeSelect.value : 'large',
    terrainType: terrainSelect ? terrainSelect.value : 'varied',
    nameStyle: nameStyleSelect ? nameStyleSelect.value : 'fantasy'
  };

  // Check theme
  FMap.dark = document.body.classList.contains('dark') ||
              (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Get canvas
  FMap.canvas = document.getElementById('fantasyMapCanvas') || document.getElementById('mapCanvas');
  if (!FMap.canvas) {
    console.error('Canvas element not found');
    return;
  }

  // Set canvas dimensions
  const container = FMap.canvas.parentElement;
  if (container) {
    FMap.W = container.clientWidth || 1400;
    FMap.H = container.clientHeight || 1000;
  } else {
    FMap.W = 1400;
    FMap.H = 1000;
  }

  FMap.canvas.width = FMap.W;
  FMap.canvas.height = FMap.H;

  // Set random seed
  FMap.seed = Math.floor(Math.random() * 2147483647) + 1;
  options.seed = FMap.seed;

  // Generate world
  fmGenerateWorld(options);
  fmBuildWorld();
  fmRenderWorldMap();
  fmSetupInteraction();
  fmUpdateBreadcrumb();
  fmUpdateInfoPanel();

  // Show canvas container
  var mapContainer = document.getElementById('mapCanvasContainer') || document.getElementById('mapContainer');
  if (mapContainer) mapContainer.style.display = 'block';

  // Load user edits
  fmLoadEdits();
}

function mapZoomTo(level) {
  if (level === 'world') {
    fmRenderWorldMap();
  } else if (level === 'kingdom' && FMap.view.currentKingdom) {
    fmRenderKingdomMap(FMap.view.currentKingdom);
  } else if (level === 'city' && FMap.view.currentCity) {
    fmRenderCityMap(FMap.view.currentCity);
  }
  fmUpdateBreadcrumb();
  fmUpdateInfoPanel();
}

function downloadCurrentMap() {
  fmDownloadMap();
}

// ============================================================================
// 13. LEGACY SHIMS FOR BACKWARD COMPATIBILITY
// ============================================================================

var currentMapScale = 'world';

function switchMapScale() {
  // Legacy function - kept for compatibility
}

function generateCurrentMap() {
  generateFantasyWorld();
}

var worldMapData = null;

function showOtherMapGen(type) {
  // Legacy function - show other map generation options if needed
  console.log('Map generation type:', type);
}

// === END PART 4: INTERACTION & UI ===
