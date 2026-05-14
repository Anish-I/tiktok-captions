# tiktok-captions

> Natural-language vibe → styled TikTok-style subtitle file (`.ass` + `.srt`).

```bash
tiktok-caps generate clip.mp4 --vibe "horror"
# → writes clip.ass and clip.srt to disk, ready for CapCut / Premiere / ffmpeg
```

## Why

Drag a vibe phrase ("horror", "luxury", "cottagecore witch tutorial") at a CLI; get a stylish caption file back in seconds. Twelve hand-tuned presets cover the common TikTok aesthetics; an LLM stylist (Together AI / Llama-4-Maverick) maps any free-form vibe to the closest preset; a keyword scorer is the offline fallback.

Built on patterns from the (private) smart-clip reference: ASS subtitle generation with proper BGR color encoding, font-size scaling vs video height, and a curated SIL-OFL font catalog.

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
| `cinematic` | Fira Sans Condensed Black | Trailer, epic, music video |

## Status

v0.1 ships clean per-cue ASS rendering. Per-word highlight animation, gradient text, and direct video burn-in are deferred to v0.2.
