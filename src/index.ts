// Not a real barrel -- consumers deep-import (`@larablox/monolog/out/Monolog/Logger`).
// This file only exists because roblox-ts requires every scope listed in
// `typeRoots` to resolve as an implicit type library, and TypeScript needs
// something at `package.json`'s `types` entry to satisfy that scan.
export {};
