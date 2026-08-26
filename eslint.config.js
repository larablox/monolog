import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import robloxTs from "eslint-plugin-roblox-ts";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default [
	{
		ignores: ["out/**", "out-tests/**"],
	},
	{
		files: ["**/*.ts", "**/*.tsx"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 2018,
				sourceType: "module",
				project: ["./tsconfig.json", "./tsconfig.tests.json"],
			},
		},
		plugins: {
			"@typescript-eslint": tseslint,
			"roblox-ts": robloxTs,
			prettier: prettierPlugin,
		},
		rules: {
			...tseslint.configs.recommended.rules,
			...robloxTs.configs.recommended.rules,
			...prettierConfig.rules,
			"prettier/prettier": "warn",
			// A `_`-prefixed parameter is deliberately unused: it keeps a
			// signature that an interface or an upstream Monolog class
			// requires (`FingersCrossedHandler.isHandling()` ignores its
			// record) without eslint reading that as dead code.
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_" },
			],
		},
	},
];
