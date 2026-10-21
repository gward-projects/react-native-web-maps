import assert from "node:assert/strict";
import test from "node:test";

import {runStaticChecks} from "../../../tools/checks/staticChecks";

test("every static check starts before any one completes", async () => {
    const startedChecks: string[] = [];
    const resolvers = new Map<string, (exitCode: number) => void>();
    const checksPromise = runStaticChecks((check) => {
        startedChecks.push(check);

        return new Promise((resolve) => resolvers.set(check, resolve));
    });

    assert.deepEqual(startedChecks, ["lint", "typecheck", "dedupe"]);
    for (const resolve of resolvers.values()) {
        resolve(0);
    }

    await assert.doesNotReject(checksPromise);
});

test("the orchestration fails after every check finishes when one fails", async () => {
    const finishedChecks: string[] = [];

    await assert.rejects(
        () => runStaticChecks(async (check) => {
            await Promise.resolve();
            finishedChecks.push(check);
            return check === "lint" ? 1 : 0;
        }),
        /Contrôles statiques en échec : lint/,
    );
    assert.deepEqual(finishedChecks.sort(), ["dedupe", "lint", "typecheck"]);
});

test("a process start error is blocking without cancelling the other checks", async () => {
    const completedChecks: string[] = [];

    await assert.rejects(
        () => runStaticChecks(async (check) => {
            if (check === "lint") {
                throw new Error("spawn failed");
            }

            completedChecks.push(check);
            return 0;
        }),
        /Contrôles statiques en échec : lint/,
    );
    assert.deepEqual(completedChecks, ["typecheck", "dedupe"]);
});

test("a check stopped by a signal is reported with its exit code", async () => {
    await assert.rejects(
        () => runStaticChecks(async (check) => check === "dedupe" ? 129 : 0),
        /Contrôles statiques en échec : dedupe \(code 129, interrompu par un signal, par exemple faute de mémoire\)/,
    );
});
