import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default tseslint.config(
    // Base recommended configs
    js.configs.recommended,
    ...tseslint.configs.recommended,
    
    // Global ignores
    {
        ignores: [
            "out/**",
            "dist/**",
            "node_modules/**",
            ".vscode-test/**",
            "**/*.d.ts",
            "webpack.config.js",
            "webview-resources/**",
            "patches/**",
            "release-notes/**",
            "scripts/**",
        ],
    },
    
    // Main configuration
    {
        files: ["**/*.ts", "**/*.tsx"],
        
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: "module",
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                console: "readonly",
                process: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                module: "readonly",
                require: "readonly",
                window: "readonly",
                document: "readonly",
                navigator: "readonly",
            },
        },
        
        plugins: {
            "@typescript-eslint": tseslint.plugin,
            "react": reactPlugin,
            "react-hooks": reactHooksPlugin,
        },
        
        rules: {
            // Migrated from tslint.json rules
            "no-throw-literal": "error",
            "@typescript-eslint/no-unused-expressions": "warn",
            "curly": "error",
            "semi": ["error", "always"],
            "eqeqeq": ["error", "always"],
            "quotes": "off", // Mixed quotes in codebase
            "no-duplicate-imports": "error",
            "no-eval": "error",
            "no-var": "error",
            "prefer-const": "error",
            "@typescript-eslint/no-require-imports": "error",
            
            // React rules
            "react/react-in-jsx-scope": "off", // Not needed with React 19
            "react/prop-types": "off", // Using TypeScript
            "react/no-unescaped-entities": "off",
            "react/no-deprecated": "warn",
            
            // React Hooks rules
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
            
            // TypeScript rules
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/ban-ts-comment": "warn",
        },
        
        settings: {
            react: {
                version: "detect",
            },
        },
    }
);
