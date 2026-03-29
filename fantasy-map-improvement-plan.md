# Fantasy Map Generator — Improvement Plan

## Current State Assessment

The generator currently supports a three-level zoom system (World → Nation → City) with parchment backgrounds, basic mountain/forest symbols, coastline hatching, rivers, nation borders, city icons, compass rose, decorative borders, and an info panel. It works, but compared to the gold standard of fantasy cartography (Tolkien maps, Azgaar's generator, professional hand-drawn maps), there are significant visual and structural gaps.

---

## Priority 1: Visual Quality — Tolkien-Style Rendering

These improvements target the biggest gap: making the map *look* like a hand-drawn fantasy map rather than a procedural grid.

### 1A. Mountains — Bold Ink-Style Peaks

**Current:** Simple triangles with a snow cap and shading split. Functional but flat.

**Target:** Tolkien-style mountains have sharp peaks, thick outlines, and mostly solid black/dark shadows. They sit in long narrow ranges rather than scattered dots. Hills are mostly unshaded, giving visual contrast.

**Changes:**
- Redesign `fmapDrawMountainSymbol()` with thicker ink outlines (2-3px), darker shadow fills, and a narrow highlight strip on one side (light from upper-left)
- Add a separate `fmapDrawHillSymbol()` for cells just below mountain threshold — simple humps with minimal shading
- Detect mountain *ranges* by flood-filling adjacent mountain cells, then draw a connected ridgeline rather than isolated triangles
- Vary peak height randomly within a range for more organic feel
- Add a slight "jitter" to line paths to simulate hand-drawn wobble

### 1B. Forests — Egg-Shaped Tree Clusters

**Current:** Three simple triangular trees per cluster. Reads more like generic "pine" than fantasy.

**Target:** Tolkien forests use dense egg-shaped canopies bordered by trees with visible trunks. The interior is packed tightly while the perimeter has individually rendered trees.

**Changes:**
- Redesign `fmapDrawTreeCluster()` to use oval/egg canopy shapes instead of triangles
- For large contiguous forest regions, detect boundaries and draw perimeter trees with trunks, fill interior with dense packed ovals
- Add slight overlap between tree canopies for density
- Vary tree sizes (large oaks at center, smaller at edges)
- Use darker green with ink outlines rather than solid fill

### 1C. Coastlines — Heavy Ink with Parallel Hatch Lines

**Current:** Concentric arc strokes around each coast cell. Creates a halo effect but doesn't look hand-drawn.

**Target:** Traditional cartography uses a bold coastline with 2-4 parallel lines following the shore at increasing distance, getting thinner as they move seaward. This is the single most recognizable element of a classic fantasy map.

**Changes:**
- Extract coastline as a continuous polyline path (marching squares or contour-following algorithm on the heightmap at the water level)
- Draw 3-4 parallel offset curves from the coastline, each progressively thinner and more transparent
- Add slight jitter to all coast paths for hand-drawn feel
- Use Bezier curves rather than straight segments for smoother flow
- Remove the current per-cell arc approach

### 1D. Water Rendering — Stipple & Wave Lines

**Current:** Basic occasional wave squiggles scattered randomly.

**Target:** Traditional maps show open ocean with widely-spaced wave marks, sea labels in italic serif, and sometimes decorative elements (sea serpents, ships).

**Changes:**
- Draw systematic wave rows in deep water (sine-wave dashes at regular intervals, not random)
- Add faint stippling/dots in shallow coastal water
- Draw optional decorative sea creature or ship in one deep-water area for flavor
- Apply italic Cinzel for all sea/ocean labels with gentle curve along a path

---

## Priority 2: Terrain & Geography Realism

### 2A. Voronoi-Based Terrain Instead of Grid

**Current:** Square grid heightmap with diamond-square smoothing. Results in noticeably grid-aligned features.

**Target:** Voronoi-based cell structure (as used by Azgaar and the Red Blob Games approach) produces organic, non-grid-aligned landmasses.

**Changes:**
- Generate ~2000-4000 random points, compute Voronoi tessellation using a simple Fortune's algorithm or the half-edge approach
- Assign elevation to Voronoi cells using noise + distance-from-center falloff
- Use cell adjacency graph for all terrain operations (river flow, coastline detection, nation assignment)
- This is a significant refactor but produces dramatically better coastlines, rivers, and terrain boundaries

### 2B. Biome System

**Current:** Terrain color is purely elevation-based (water → beach → grass → forest → hills → mountain → snow).

**Target:** Real maps have biomes driven by latitude, elevation, and moisture. Deserts form in rain shadows behind mountains. Tundra at high latitudes. Swamps in low-lying wet areas.

**Changes:**
- Compute moisture map: cells near water or downwind of water get high moisture, cells behind mountains get low moisture (rain shadow)
- Combine elevation + moisture + latitude to assign biomes: ocean, coast, grassland, forest, dense forest, swamp, desert, tundra, mountain, snow peak
- Each biome gets its own symbol set and color palette
- Display a terrain legend showing biome types

### 2C. Improved River Generation

**Current:** Rivers trace downhill from peaks using greedy neighbor descent. Often produces short, straight rivers.

**Target:** Rivers should follow valleys, merge at confluences, grow wider downstream, and reach the sea at natural points.

**Changes:**
- Use the Voronoi cell adjacency graph for river routing (flow along cell edges, not through centers)
- Compute drainage basins: every cell drains to its lowest neighbor; accumulate flow
- Draw rivers only where accumulated flow exceeds a threshold
- Rivers automatically merge at confluences
- Width scales with accumulated flow (thin mountain streams → wide lowland rivers)
- Add river name labels along the path using curved text

---

## Priority 3: Political & Cultural Layer

### 3A. Smarter Nation Generation

**Current:** Voronoi-style nearest-center assignment. Nations are roughly circular blobs.

**Target:** Nations should follow natural boundaries (rivers, mountain ranges, coastlines). Capital placement should consider strategic value.

**Changes:**
- Generate nation seeds preferring: river crossings, coastal positions, fertile plains
- Grow nations outward but treat mountains and rivers as expansion barriers (higher cost to cross)
- This produces nations bounded by natural geography, which feels realistic
- Add "disputed" border zones where nations meet without a natural barrier

### 3B. Road & Trade Route Network

**Current:** Nation view shows dashed straight lines between cities.

**Target:** Roads should follow terrain, avoiding mountains, preferring valleys and river crossings.

**Changes:**
- Implement A* pathfinding between cities on the terrain grid
- Terrain cost: water = impassable, mountain = very high, hill = moderate, plains = low, road = very low
- Draw roads as dashed brown lines following the computed path
- Major trade routes (between capitals) get thicker lines
- Add "bridge" markers where roads cross rivers

### 3C. Cultures & Naming

**Current:** Single naming style applied uniformly across the map.

**Target:** Different regions should have different naming conventions, reflecting cultural diversity.

**Changes:**
- Assign each nation a primary culture (randomly from available styles: fantasy, norse, celtic, plus new ones like arabic, eastern, etc.)
- Cities within a nation use that culture's name pool
- Nation names reflect their culture
- Add suffixes/prefixes that indicate terrain (e.g., "-port" for coastal cities, "-peak" for mountain cities)

---

## Priority 4: Decorative & UI Polish

### 4A. Ornate Compass Rose

**Current:** Functional compass with cardinal arrows and a circle. Clean but plain.

**Target:** Traditional maps feature elaborate multi-pointed compass roses with fleur-de-lis north pointer, interlocking rings, and decorative filigree.

**Changes:**
- Draw 16-point star rose (4 cardinal + 4 ordinal + 8 minor)
- Fleur-de-lis or arrow for North
- Alternating filled/outlined points
- Double concentric circles with tick marks
- Optionally add a decorative "wind head" face blowing from one direction

### 4B. Title Cartouche with Scroll Banner

**Current:** Simple rectangle with double border and text.

**Target:** An unfurled scroll/ribbon banner with curled ends, containing the map title.

**Changes:**
- Draw a scroll shape using Bezier curves (curled left and right ends)
- Add ribbon "folds" with shadow
- Title text centered in the banner
- Optional subtitle line below ("A Map of the Known World" or similar)

### 4C. Decorative Border with Corner Filigree

**Current:** Double-line rectangle with corner dots and small diamonds.

**Target:** Elaborate borders with interlocking patterns, corner medallions, and edge decorations.

**Changes:**
- Draw repeating pattern along each edge (dots, dashes, or vine motif)
- Corner pieces with heraldic-style shields or knotwork
- Inner/outer border pair with decorative fill between them

### 4D. Legend Panel on Canvas

**Current:** Legend is in the HTML info panel below the map.

**Target:** A parchment-style legend box drawn directly on the canvas, with icons for each terrain type.

**Changes:**
- Draw a semi-transparent parchment box in a map corner
- List terrain symbols with labels (mountain peak, forest, city, town, road, etc.)
- Match the map's own rendering style

---

## Priority 5: City Map Detail

### 5A. District System

**Current:** Random building blocks scattered inside walls.

**Target:** Cities should have recognizable districts (noble quarter, merchant district, slums, religious quarter, etc.)

**Changes:**
- Divide city interior into 4-6 wedge/sector districts
- Each district has different building density, building sizes, and landmark types
- Label each district
- Noble district has larger buildings, wider streets
- Slums/poor district has dense, small, irregular buildings
- Market district centers around the market square

### 5B. Individual Building Detail

**Current:** Rectangular blocks with no differentiation.

**Target:** Buildings should show basic architectural variety — peaked roofs, towers, courtyards.

**Changes:**
- Multiple building templates: house (rect + peaked roof), tower (circle), manor (large rect + courtyard), shop (rect + awning), church (cross shape + spire)
- Color-code roofs by district type
- Draw shadows to one side for depth

### 5C. Surrounding Countryside

**Current:** Basic green with random grass strokes, farms, and trees.

**Target:** More detailed hinterland with named farms, roads leading to other cities, and terrain features.

**Changes:**
- Draw named farms/estates outside walls
- Roads leading off the map edges toward neighboring cities (with labels: "To Stormhaven →")
- Orchards, vineyards, and crop fields with distinct patterns
- A river or stream if the city was placed near water on the world map

---

## Implementation Order

Given the impact-to-effort ratio, I'd recommend this order:

1. **Coastlines** (1C) — Single biggest visual upgrade. The parallel-line technique transforms the entire map aesthetic.
2. **Mountains** (1A) — Second biggest visual element. Bold ink mountains define the fantasy map style.
3. **Forests** (1B) — Egg-shaped trees complete the "big three" visual elements.
4. **Compass Rose** (4A) — Small effort, big visual payoff.
5. **Title Cartouche** (4B) — Same: small effort, nice polish.
6. **Water Rendering** (1D) — Fills in the ocean areas nicely.
7. **River Improvements** (2C) — Better rivers tie the terrain together.
8. **Road Network** (3B) — Adds connectivity and strategic interest.
9. **Biome System** (2B) — Richer terrain variety.
10. **District System** (5A) — Makes city maps more interesting.
11. **Nation Generation** (3A) — Smarter borders, more realistic politics.
12. **Voronoi Terrain** (2A) — Biggest refactor, biggest quality jump, but most work.
13. **Remaining polish** (4C, 4D, 3C, 5B, 5C)

---

## Research Sources

- [Lord of the Rings Map Style — Here Dragons Abound](https://heredragonsabound.blogspot.com/2018/10/lord-of-rings-map-style.html)
- [Tolkien-Style Mountains Tutorial — Map Effects](https://www.mapeffects.co/tutorials/tolkien-mountains)
- [Tolkien Style Maps in GIS — Adventures in Mapping](https://adventuresinmapping.com/2024/02/12/tolkien-style-maps-in-a-gis-part-1-forests/)
- [Polygonal Map Generation for Games — Red Blob Games](http://www-cs-students.stanford.edu/~amitp/game-programming/polygon-map-generation/)
- [Generating a Fantasy Map — NULLPOINTER](https://www.nullpointer.co.uk/generating-a-fantasy-map.html)
- [Azgaar's Fantasy Map Generator](https://azgaar.github.io/Fantasy-Map-Generator/)
- [Procedural Map Generation with Voronoi — squeakyspacebar](https://squeakyspacebar.github.io/2017/07/12/Procedural-Map-Generation-With-Voronoi-Diagrams.html)
- [Rough.js — Sketchy hand-drawn rendering](https://roughjs.com/)
- [p5.brush — Canvas hatching library](https://github.com/acamposuribe/p5.brush)
