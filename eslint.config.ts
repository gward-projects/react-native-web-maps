import {defineConfig, globalIgnores} from "eslint/config";
import expoConfig from "eslint-config-expo/flat";

import sortImportsByFirstName from "./tools/eslint/sortImportsByFirstName";

// Same rules as gward-app (eslint.config.js), minus its project-specific import restrictions.
export default defineConfig([
    globalIgnores([".yarn/**"]),
    expoConfig,
    {
        rules: {
            // Libraries first, then a blank line, then the project's own modules.
            // The order inside each group is left free.
            "import/order": ["error", {
                groups: [["builtin", "external"], ["internal", "parent", "sibling", "index", "object", "unknown"]],
                // eslint-config-expo ignores node_modules/react-native*: the type-only
                // imports of those packages would otherwise land in the project group.
                pathGroups: [{pattern: "react-native{,-*}{,/**}", group: "external"}],
                pathGroupsExcludedImportTypes: ["builtin"],
                "newlines-between": "always-and-inside-groups",
            }],
            // Inside each block of imports, alphabetical order of the first imported name
            // (Colors before Constants), see tools/eslint/sortImportsByFirstName.ts.
            "gward/sort-imports-by-first-name": "error",
            "react-hooks/exhaustive-deps": "error",
            // React Compiler is not used: these rules conflict with manual memoization
            // and mutable refs, as in gward-app.
            "react-hooks/immutability": "off",
            "react-hooks/preserve-manual-memoization": "off",
            "react-hooks/refs": "off",
        },
        plugins: {
            gward: {rules: {"sort-imports-by-first-name": sortImportsByFirstName}},
        },
    },
]);
