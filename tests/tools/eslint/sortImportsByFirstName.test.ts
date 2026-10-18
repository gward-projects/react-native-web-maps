import assert from "node:assert/strict";
import test from "node:test";

import {Linter} from "eslint";

import rule from "../../../tools/eslint/sortImportsByFirstName";

// Copied from gward-app (tests/tools/eslint/sortImportsByFirstName.test.ts): keep both in sync.

const config: Linter.Config[] = [{
    plugins: {gward: {rules: {"sort-imports-by-first-name": rule}}},
    rules: {"gward/sort-imports-by-first-name": "error"},
    languageOptions: {sourceType: "module", ecmaVersion: "latest"},
}];

const lint = (code: string): Linter.LintMessage[] => new Linter().verify(code, config);

const fix = (code: string): string => new Linter().verifyAndFix(code, config).output;

test("imports sorted by their first imported name pass, whatever their library", () => {
    assert.deepEqual(lint([
        'import Colors from "./styles/Colors";',
        'import Constants from "expo-constants";',
        'import {Provider} from "react-native-paper";',
        'import * as SplashScreen from "expo-splash-screen";',
    ].join("\n")), []);
});

test("react comes first, then react-native, then the other libraries", () => {
    const code = [
        'import Constants from "expo-constants";',
        'import {StyleSheet, View} from "react-native";',
        'import {Button} from "react-native-paper";',
        'import {useState} from "react";',
        'import Animated from "react-native-reanimated";',
    ].join("\n");

    assert.equal(lint(code).length, 1);
    assert.equal(fix(code), [
        'import {useState} from "react";',
        'import {StyleSheet, View} from "react-native";',
        'import Animated from "react-native-reanimated";',
        'import {Button} from "react-native-paper";',
        'import Constants from "expo-constants";',
    ].join("\n"));
});

test("the comparison ignores case", () => {
    assert.deepEqual(lint([
        'import {ENVIRONMENT} from "./envVar";',
        'import {getEnvironment} from "./env";',
        'import {Turnstile} from "./turnstile";',
    ].join("\n")), []);
});

test("an unsorted block is reported and sorted by the fix", () => {
    const code = [
        'import Constants from "expo-constants";',
        'import Colors from "./styles/Colors";',
        "",
        "const value = 1;",
    ].join("\n");

    assert.equal(lint(code).length, 1);
    assert.equal(fix(code), [
        'import Colors from "./styles/Colors";',
        'import Constants from "expo-constants";',
        "",
        "const value = 1;",
    ].join("\n"));
});

test("each block separated by a blank line is sorted on its own", () => {
    assert.deepEqual(lint([
        'import {useState} from "react";',
        "",
        'import AppButton from "./AppButton";',
    ].join("\n")), []);
});

test("a side-effect import is never moved and splits the block", () => {
    const code = [
        'import {use} from "echarts/core";',
        'import "echarts/lib/chart/line";',
        'import {SvgChart} from "@wuba/react-native-echarts";',
        'import {LineChart} from "echarts/charts";',
    ].join("\n");

    assert.equal(fix(code), [
        'import {use} from "echarts/core";',
        'import "echarts/lib/chart/line";',
        'import {LineChart} from "echarts/charts";',
        'import {SvgChart} from "@wuba/react-native-echarts";',
    ].join("\n"));
});

test("a block heading stays in place while directives and inner comments move with their import", () => {
    const code = [
        "// Own import",
        "//@ts-ignore",
        'import {env} from "$amplify/env/maintenance";',
        "// Load .env file",
        'import * as dotenv from "dotenv";',
        'import {Assertions} from "./assertions";',
    ].join("\n");

    assert.equal(fix(code), [
        "// Own import",
        'import {Assertions} from "./assertions";',
        "// Load .env file",
        'import * as dotenv from "dotenv";',
        "//@ts-ignore",
        'import {env} from "$amplify/env/maintenance";',
    ].join("\n"));
});

test("a renamed import sorts by the name written first", () => {
    assert.deepEqual(lint([
        'import {PinpointClient as Client} from "@aws-sdk/client-pinpoint";',
        'import {SendCommand} from "@aws-sdk/client-sqs";',
    ].join("\n")), []);
});
