import assert from "node:assert/strict";
import test from "node:test";

import {runStaticChecks} from "../../../tools/checks/staticChecks";

test("lint and typecheck start before either one completes", async () => {
    const startedChecks: string[] = [];
    const resolvers = new Map<string, (exitCode: number) => void>();
    const checksPromise = runStaticChecks((check) => {
        startedChecks.push(check);

        return new Promise((resolve) => resolvers.set(check, resolve));
    });

    assert.deepEqual(startedChecks, ["lint", "typecheck"]);
    resolvers.get("typecheck")?.(0);
    resolvers.get("lint")?.(0);

    await assert.doesNotReject(checksPromise);
});

test("the orchestration fails after both checks finish when one fails", async () => {
    const finishedChecks: string[] = [];

    await assert.rejects(
        () => runStaticChecks(async (check) => {
            await Promise.resolve();
            finishedChecks.push(check);
            return check === "lint" ? 1 : 0;
        }),
        /Contrôles statiques en échec : lint/,
    );
    assert.deepEqual(finishedChecks.sort(), ["lint", "typecheck"]);
});

test("a process start error is blocking without cancelling the other check", async () => {
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
    assert.deepEqual(completedChecks, ["typecheck"]);
});
