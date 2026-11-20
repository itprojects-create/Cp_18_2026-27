# Cp_18_2026-27

## Ishara — Group 18

VESIT, Department of Information Technology. Ishara is an Electron browser prototype with natural language task assistance, accessibility controls and a local 3D Indian Sign Language avatar. The running interface uses the name ZenAI.

## Semester documentation

- [Group 18 documentation and completion register](../../README.md)
- [6th Sem](../../6th%20Sem/README.md): synopsis, project logbook and project reports.
- [7th Sem](../README.md): black book, research paper, project logbook, demonstration video and working model source code.

The register distinguishes prepared documents, drafts, blank activity records and missing evidence. A folder or link does not mean the corresponding academic approval is complete.

## Contributors

- Afnan Mohammed Kazi — Afnankazi
- Siddharth Gupta

The supplied research manuscript retains its original author list. Research authorship and Git commit attribution are separate records.

## Run the working model

Install Node.js and npm, then run:

```sh
git clone https://github.com/itprojects-create/Cp_18_2026-27.git
cd Cp_18_2026-27
cd "Group 18/7th Sem/Working Model Source Code"
npm ci
```

Copy `.env.example` to `.env` and set your own OpenRouter key and model, or use the app's Settings panel. Then:

```sh
npm start
```

The Agent and ISL **Explain this Page** features share `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`. Optional speech and search providers have separate settings. Keys and `.env` must stay out of Git.

Electron ^33.2.1 is the declared dependency. The current Windows development session used a cached Electron 29 runtime with `--disable-gpu` after the normal binary download stalled; this local fallback is excluded from the repository. A fresh installation should use the declared dependency.

## Architecture

| File or directory | Responsibility |
| --- | --- |
| `main.js` | Electron lifecycle, IPC, provider requests and configuration |
| `preload.js` | Context-isolated renderer bridge |
| `src/mistral-service.js` | OpenRouter agent and plain-text ISL requests; historical filename retained |
| `src/config-store.js` | Local provider settings |
| `renderer/app.js` | Browser tabs, DOM extraction, task actions and accessibility controls |
| `renderer/isl/` | Page summary, gloss conversion and avatar animation |
| `renderer/models/` | Local avatar assets |
| `tests/` | Service tests and Electron smoke checks |

## Verification

```sh
node --test tests/openrouter-service.cjs
node tests/check-source.cjs
node tools/check-document-links.cjs
```

Run Electron with `tests/electron-smoke.cjs --provider-only` for focused settings, chat IPC and Explain button checks. Run `tests/electron-smoke.cjs` for the broader application smoke test. Provider fixtures use temporary settings and do not send paid requests.

On 20 November 2026, six service tests, source validation and the focused Electron checks passed. A live sample-form check also completed OpenRouter summary and gloss generation and reached the avatar. The broader smoke test still reported aborted home-page loads during tab navigation.

## Data handling and limitations

OpenRouter receives prompts and relevant page context. Enabled speech and search services may receive text or audio. Avatar rendering runs locally, while language processing requires online services. The current implementation is not a fully offline AI browser or an encrypted credential vault.

The prototype has not been certified for accessibility or production security. Its browser settings include disabled web security and sandboxing that require review before deployment. Signing vocabulary is limited; unsupported words can use fingerspelling. Review consequential browser actions before relying on them.
