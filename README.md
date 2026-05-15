# tiktok-captions

> Natural-language vibe → styled TikTok-style subtitle file (`.ass` + `.srt`).

```bash
tiktok-caps generate clip.mp4 --vibe "horror"
# → writes clip.ass and clip.srt to disk, ready for CapCut / Premiere / ffmpeg
```

## Why

Drag a vibe phrase ("horror", "luxury", "cottagecore witch tutorial") at a CLI; get a stylish caption file back in seconds. 26 hand-tuned presets cover the common TikTok aesthetics: 12 semantic-vibe presets, 11 Submagic-inspired editor styles (Karaoke, Deep Diver, Chromatic [née Pod P], Popline, Creator Clean [née Beasty], Pill Dark [née Youshaei], Mozi, Glitch Infinite, Seamless Bounce, Baby Earthquake, Bounce Label), and 3 modern vertical-aligned styles (GRWM Soft, Day Vlog, True Crime). An LLM stylist (Together AI / Llama-4-Maverick) maps any free-form vibe to the closest preset; a keyword scorer is the offline fallback.

Built on patterns from the (private) smart-clip reference: ASS subtitle generation with proper BGR color encoding, font-size scaling vs video height, opaque-box (`BorderStyle=3`) pill captions, and a curated SIL-OFL font catalog.

## How it works

```
input.mp4 ──[ffmpeg → 16kHz mono wav]──> input.wav
input.wav ──[whisper.cpp --output-json]──> Word[]
Word[]   ──[group into ~5-word cues]──>   Cue[]
"horror" ──[Together AI → JSON enum]──>   presetId
preset + cues ─[render ass+srt]───────>   out.ass + out.srt
```

## Install

```bash
git clone https://github.com/Anish-I/tiktok-captions
cd tiktok-captions
npm install
npm run build
npm link    # makes `tiktok-caps` available globally
```

Requirements:
- Node 20+
- `ffmpeg` on `PATH`
- `whisper.cpp` built; set `WHISPER_CPP_BIN` + `WHISPER_CPP_MODEL` in `.env`
- `TOGETHER_API_KEY` (optional — falls back to keyword scoring if missing)

## Use

```bash
# basic
tiktok-caps generate clip.mp4 --vibe "horror"

# choose a specific preset, skip LLM
tiktok-caps generate clip.mp4 --preset gaming

# write to a specific path
tiktok-caps generate clip.mp4 --vibe luxury --out ./captions/luxury.ass

# list available presets
tiktok-caps presets

# dry-run: see what preset the LLM picked without transcribing
tiktok-caps pick "spooky witch tutorial"
```

## Preset gallery

### Vibe presets (semantic, prompt-friendly)

| presetId | Font | Use case |
|---|---|---|
| `horror` | Creepster | Spooky, gothic, halloween, scary stories |
| `luxury` | DM Serif Display | Premium, fashion, classy, elegant |
| `comedy` | Bangers | Funny, meme, sketch, viral |
| `gaming` | Press Start 2P | Esports, twitch, pixel/retro |
| `fitness` | Gabarito Black | Workout, gym, hardcore |
| `motivational` | Anton | Inspire, hustle, mindset |
| `news` | Roboto Bold | Breaking, anchor, headline |
| `podcast` | Montserrat Black | Interview, conversation |
| `storytelling` | Playfair Display | Narrative, drama, "once upon a time" |
| `educational` | Poppins Bold | Tutorial, learn, lesson |
| `wellness` | Roboto | Yoga, calm, mindful, health |
| `cinematic` | Fira Sans Condensed | Trailer, epic, music video |

### Editor-style presets (named, Submagic-inspired)

| presetId | Font | Layout |
|---|---|---|
| `karaoke` | Montserrat Black | Bold caps with one word highlighted in lime pill (v2: rolls per word) |
| `deep_diver` | Poppins | Dark lowercase inside cream sticker pill |
| `chromatic` | Anton | Cyan/magenta/yellow RGB split + CRT scanlines (was: `pod_p`) |
| `popline` | Bebas Neue | Tall condensed white caps, stacked one word per line |
| `creator_clean` | Montserrat Black | Mixed-case white on dark — canonical creator caption (was: `beasty`) |
| `pill_dark` | Montserrat Black | White caps inside black sticker pill (was: `youshaei`) |
| `mozi` | Teko | Two-line stacked neon lime caps |
| `glitch_infinite` | Rubik | Yellow "New" pill + red glitch text below |
| `bounce_label` | Rubik | Black caps inside yellow pill (single-line label) |
| `seamless_bounce` | Rubik | "New" pill + lime "started" — bounce animation in v2 |
| `baby_earthquake` | Rubik | "New" pill + lime "started" — earthquake/shake animation in v2 |

### Modern vertical-aligned presets (round-6 swarm critique)

| presetId | Font | Use case |
|---|---|---|
| `grwm_soft` | Poppins | Beauty/fashion get-ready-with-me, soft cream + cocoa |
| `day_vlog` | Poppins | Minimal daily-vlog aesthetic, casual normal case |
| `true_crime` | Roboto | Cold off-white + deep navy for narration / documentary |

### Localhost preview gallery

```bash
node scripts/preview-server.mjs
# open http://127.0.0.1:5555 to see all 23 presets rendered with @font-face,
# plus an interactive vibe-picker that calls /api/pick
```

## Compound-layout schema

Presets can carry `preview` hints (preview-only metadata; ASS renderer ignores them):

```ts
preview: {
  sampleText?: string;
  lines?: PresetLine[];                // multi-element compositions
  highlightWord?: { index, bg, color };// karaoke word highlight
  stackWords?: boolean;                // popline mode
  scanlines?: boolean;                 // CRT overlay (Pod P)
}
```

Each `PresetLine` can override `primaryColor`, `outlineColor`, `borderStyle`, `fontFamily`, `textCase`, `scale`, and `bold` independently — used to express two-element compositions like Seamless Bounce ("yellow-pill on line 1" + "lime text on line 2").

## ASS output features

- `BorderStyle=1` (outline, default) — text stroke + drop shadow
- `BorderStyle=3` (opaque box) — sticker pill captions; `BackColour` is auto-set to `OutlineColour` for clean rendering
- BGR color encoding (`&HAABBGGRR`) and font-size scaling vs video height — both ported from the smart-clip reference

## Status

v0.1 ships:
- 23 static presets with compound-layout gallery support
- Clean per-cue ASS rendering with both outline + box styles
- Bundled 17 SIL-OFL/Apache font families (~3.6 MB)
- localhost preview gallery with `@font-face`, scanlines, chromatic aberration, and karaoke word-highlight
- 40 vitest specs (all green)

Deferred to v0.2: word-by-word highlight rendered in ASS, animation effects (bounce, earthquake, glitch motion), gradient text via SVG+alphamerge, video burn-in.
