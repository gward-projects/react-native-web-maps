import {fileURLToPath} from "node:url";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";

// Same runner as gward-app (tools/checks/test.ts), with a single group: the tests
// live in tests/ and mirror the sources (src/utils/region.ts is tested by
// tests/src/utils/region.test.ts).
const TESTS_ROOT = "tests";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Every *.test.ts file below a directory, sorted.
 *
 * @param directory directory to search
 */
const collectTestFiles = (directory: string): string[] => {
    const entries = fs.readdirSync(directory, {withFileTypes: true});
    const testFiles: string[] = [];

    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            testFiles.push(...collectTestFiles(entryPath));
            continue;
        }

        if (entry.isFile() && entry.name.endsWith(".test.ts")) {
            testFiles.push(entryPath);
        }
    }

    return testFiles.sort();
};

const testsRoot = path.join(projectRoot, TESTS_ROOT);

if (!fs.existsSync(testsRoot)) {
    throw new Error(`Le dossier ${TESTS_ROOT}/ est introuvable : aucun test ne peut être exécuté`);
}

const files = collectTestFiles(testsRoot).map((testFile) => path.relative(projectRoot, testFile));

// A silently empty run would turn this blocking control into a no-op.
if (files.length === 0) {
    throw new Error("Aucun fichier *.test.ts trouvé : le contrôle serait sans effet");
}

console.log(`\n▶ Tests : ${files.length} fichier(s) — ${TESTS_ROOT}/`);

const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--test", ...files],
    {
        cwd: projectRoot,
        stdio: "inherit",
    },
);

if (result.error) {
    throw result.error;
}

if (result.status !== 0) {
    process.exit(1);
}
