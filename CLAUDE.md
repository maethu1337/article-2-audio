# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A static client-side web app that converts article text to audio using OpenAI's Text-to-Speech API. Deployed on GitHub Pages. No build system, bundler, or package manager — just vanilla HTML/CSS/JS served directly.

## Development

Open `index.html` in a browser. No build or install step. A valid OpenAI API key is required for functionality (stored in localStorage as `openai_access_token`).

## Architecture

- **index.html** — Single page: API key input, textarea, model selector, generate/download buttons, audio player with progress bars
- **script.js** — Core TTS logic: splits text into chunks (512-char first chunk for fast playback, 2048-char subsequent chunks), fetches all chunks from OpenAI TTS API in parallel, plays sequentially via `onended` chaining, stitches into single MP3 blob for download
- **title.js** — Uses OpenAI chat completions API (`gpt-4.1-nano`) to generate a slugified filename when downloading audio
- **style.css** — Dark theme UI using Inter font

## Key Implementation Details

- Two TTS models available: `gpt-4o-mini-tts` (cheap/default) and `tts-1` (not cheap), both use "onyx" voice
- Text chunking splits at sentence boundaries (`.`, `?`, `!`) to avoid mid-sentence cuts
- First chunk is intentionally smaller (512 chars) so audio playback starts quickly while remaining chunks load
- All API calls go directly to `https://api.openai.com/v1/` from the browser (no backend)
- The native `<audio>` element's timeline/time displays are hidden via CSS; custom progress bars are used instead
