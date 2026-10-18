import {fileURLToPath} from "node:url";
import path from "node:path";
import {spawn} from "node:child_process";

const STATIC_CHECKS = ["lint", "typecheck"] as const;

type StaticCheck = typeof STATIC_CHECKS[number];
type StaticCheckRunner = (check: StaticCheck) => Promise<number>;

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const runYarnScript: StaticCheckRunner = (check) => new Promise((resolve, reject) => {
    const yarnExecutable = process.platform === "win32" ? "yarn.cmd" : "yarn";
    const child = spawn(yarnExecutable, [check], {
        cwd: projectRoot,
        stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (exitCode) => resolve(exitCode ?? 1));
});

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
        throw new Error(
            `Contrôles statiques en échec : ${failedChecks.map((result) => result.check).join(", ")}`,
        );
    }
};

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
const currentPath = fileURLToPath(import.meta.url);

if (invokedPath === currentPath) {
    void runStaticChecks()
        .then(() => console.log("Lint et typecheck réussis"))
        .catch((error: unknown) => {
            console.error(error instanceof Error ? error.message : "Échec des contrôles statiques");
            process.exitCode = 1;
        });
}
