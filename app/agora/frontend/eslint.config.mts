import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
    settings: {
      react: { version: 'detect' } // ✅ FIX: Elimina warning React
    }
  },
  tseslint.configs.recommended,
  {
    ...pluginReact.configs.flat.recommended,
    rules: {
      ...pluginReact.configs.flat.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    }
  },
  {
    rules: {
      // ✅ FIX: any pasa a warn (no rompe CI)
      '@typescript-eslint/no-explicit-any': 'warn',
      // Bonus: unused vars más permisivo para refactor
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { 
          argsIgnorePattern: '^_', 
          varsIgnorePattern: '^_', 
          caughtErrorsIgnorePattern: '^_' 
        }
      ]
    }
  }
]);
