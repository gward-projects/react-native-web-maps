import {fileURLToPath} from "node:url";
import path from "node:path";
import {spawn} from "node:child_process";

import {describeExitCode, runStaticChecks} from "./staticChecks";

// Same guard as gward-app, without its web export and
// bundle budgets: lint, typecheck and the lockfile dedupe check in parallel, then the tests.
type CheckScript = "test";
type CheckRunner = (script: CheckScript) => Promise<number>;
type StaticChecksRunner = () => Promise<void>;

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const runYarnScript: CheckRunner = (script) => new Promise((resolve, reject) => {
    const yarnExecutable = process.platform === "win32" ? "yarn.cmd" : "yarn";
    const child = spawn(yarnExecutable, [script], {
        cwd: projectRoot,
        stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (exitCode) => resolve(exitCode ?? 1));
});

const runBlockingScript = async (
    script: CheckScript,
    runner: CheckRunner,
): Promise<void> => {
    let exitCode: number;

    try {
        exitCode = await runner(script);
    } catch {
        exitCode = 1;
    }

    if (exitCode !== 0) {
        throw new Error(`${script} a échoué (${describeExitCode(exitCode)})`);
    }
};

export const runChecks = async (
    runner: CheckRunner = runYarnScript,
    staticChecksRunner: StaticChecksRunner = runStaticChecks,
): Promise<void> => {
    try {
        await staticChecksRunner();
        await runBlockingScript("test", runner);
    } catch (error: unknown) {
        throw new Error(`Contrôles en échec : ${error instanceof Error ? error.message : "contrôle inconnu"}`);
    }
};

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
const currentPath = fileURLToPath(import.meta.url);

if (invokedPath === currentPath) {
    void runChecks()
        .then(() => console.log("Contrôles validés"))
        .catch((error: unknown) => {
            console.error(error instanceof Error ? error.message : "Échec des contrôles");
            process.exitCode = 1;
        });
}
