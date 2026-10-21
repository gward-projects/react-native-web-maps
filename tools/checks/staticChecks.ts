import {fileURLToPath} from "node:url";
import path from "node:path";
import {spawn} from "node:child_process";

// Yarn arguments of each static check. The dedupe check keeps the lockfile free of duplicated
// packages, without changing it.
const STATIC_CHECK_ARGUMENTS = {
    "lint": ["lint"],
    "typecheck": ["typecheck"],
    "dedupe": ["dedupe", "--check"],
} as const;

type StaticCheck = keyof typeof STATIC_CHECK_ARGUMENTS;

const STATIC_CHECKS = Object.keys(STATIC_CHECK_ARGUMENTS) as StaticCheck[];
type StaticCheckRunner = (check: StaticCheck) => Promise<number>;

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const runYarnScript: StaticCheckRunner = (check) => new Promise((resolve, reject) => {
    const yarnExecutable = process.platform === "win32" ? "yarn.cmd" : "yarn";
    const child = spawn(yarnExecutable, [...STATIC_CHECK_ARGUMENTS[check]], {
        cwd: projectRoot,
        stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (exitCode) => resolve(exitCode ?? 1));
});

/**
 * Describes a failed exit code. Yarn exits above 128 when its script was stopped by a signal, which
 * is how a process killed for lack of memory ends: it prints nothing itself.
 * @param exitCode exit code of the failed script.
 */
export const describeExitCode = (exitCode: number): string => (
    exitCode > 128
        ? `code ${exitCode}, interrompu par un signal, par exemple faute de mémoire`
        : `code ${exitCode}`
);

/**
 * Runs lint, typecheck and the lockfile dedupe check in parallel, and fails once all have finished
 * if one failed, naming each failed check with its exit code.
 * @param runner runner of the yarn scripts.
 */
export const runStaticChecks = async (
    runner: StaticCheckRunner = runYarnScript,
): Promise<void> => {
    const results = await Promise.all(STATIC_CHECKS.map(async (check) => {
        try {
            return {check, exitCode: await runner(check)};
        } catch {
            return {check, exitCode: 1};
        }
    }));
    const failedChecks = results.filter((result) => result.exitCode !== 0);

    if (failedChecks.length > 0) {
        throw new Error(`Contrôles statiques en échec : ${failedChecks
            .map((result) => `${result.check} (${describeExitCode(result.exitCode)})`)
            .join(", ")}`);
    }
};

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
const currentPath = fileURLToPath(import.meta.url);

if (invokedPath === currentPath) {
    void runStaticChecks()
        .then(() => console.log("Contrôles statiques réussis"))
        .catch((error: unknown) => {
            console.error(error instanceof Error ? error.message : "Échec des contrôles statiques");
            process.exitCode = 1;
        });
}
