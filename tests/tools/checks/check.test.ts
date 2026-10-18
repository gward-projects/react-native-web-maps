import assert from "node:assert/strict";
import test from "node:test";

import {runChecks} from "../../../tools/checks/check";

test("tests start once the static checks succeed", async () => {
    const completedScripts: string[] = [];

    await runChecks(async (script) => {
        completedScripts.push(script);
        return 0;
    }, async () => {
        completedScripts.push("static");
    });
    assert.deepEqual(completedScripts, ["static", "test"]);
});

test("tests do not start after failed static checks", async () => {
    const completedScripts: string[] = [];

    await assert.rejects(
        () => runChecks(async (script) => {
            completedScripts.push(script);
            return 0;
        }, async () => {
            completedScripts.push("static");
            throw new Error("static a échoué");
        }),
        /Contrôles en échec : static a échoué/,
    );
    assert.deepEqual(completedScripts, ["static"]);
});

test("failed tests are blocking", async () => {
    await assert.rejects(
        () => runChecks(async () => 1, async () => undefined),
        /Contrôles en échec : test a échoué/,
    );
});

test("a process start error is blocking", async () => {
    await assert.rejects(
        () => runChecks(async () => {
            throw new Error("spawn failed");
        }, async () => undefined),
        /Contrôles en échec : test a échoué/,
    );
});
