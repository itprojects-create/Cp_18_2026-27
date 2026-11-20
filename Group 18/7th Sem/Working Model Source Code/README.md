# Working Model Source Code

This folder contains the complete working model: application source, dependencies manifest, avatar assets, tests and launch scripts. All tracked project material is maintained inside Group 18.

- [Source folder on GitHub](https://github.com/itprojects-create/Cp_18_2026-27/tree/main/Group%2018/7th%20Sem/Working%20Model%20Source%20Code)
- [Download the current main-branch source ZIP](https://github.com/itprojects-create/Cp_18_2026-27/archive/refs/heads/main.zip)
- [Run instructions, architecture and test status](Application_Guide.md)
- [Application entry point](main.js)
- [Dependency manifest](package.json)
- [Configuration example](.env.example)
- [Provider regression tests](tests/openrouter-service.cjs)

After cloning the repository, run commands from this directory:

```sh
cd "Group 18/7th Sem/Working Model Source Code"
npm ci
npm start
```

The source includes OpenRouter support for both the Agent and ISL summary/gloss requests. Local API keys, dependency downloads, runtime workarounds and logs are excluded from Git.

[Return to 7th Sem](../README.md)
