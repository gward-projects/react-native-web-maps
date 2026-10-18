/**
 * ESLint rule: inside each block of imports (imports separated by a blank line form
 * separate blocks), `react` comes first, then `react-native`, then the other imports
 * sorted alphabetically, ignoring case, by the first name they import:
 * `import Colors …` comes before `import Constants …`.
 *
 * Side-effect imports (`import "…"`) are never moved: they split a block in two.
 * A comment just above the first import of a block is the block's heading and stays
 * in place; any other comment above an import moves with it, as does a `@ts-…` or
 * `eslint-…` directive above the first import.
 *
 * Copied from gward-app: keep both in sync.
 */

import type {ImportDeclaration, Program} from "estree";
import type {Rule, SourceCode} from "eslint";

type RangedImport = ImportDeclaration & {range: [number, number]};

const DIRECTIVE = /^\s*(@ts-|eslint-)/;

// Libraries placed before every other import, in this order.
const LEADING_SOURCES = ["react", "react-native"];

const firstName = (node: RangedImport): string => {
    const [first] = node.specifiers;

    if (!first) {
        return "";
    }
    if (first.type === "ImportSpecifier") {
        return first.imported.type === "Identifier" ? first.imported.name : String(first.imported.value);
    }

    return first.local.name;
};

const rank = (node: RangedImport): number => {
    const index = LEADING_SOURCES.indexOf(String(node.source.value));

    return index === -1 ? LEADING_SOURCES.length : index;
};

const compareImports = (a: RangedImport, b: RangedImport): number => {
    const byRank = rank(a) - rank(b);

    if (byRank !== 0) {
        return byRank;
    }

    const nameA = firstName(a);
    const nameB = firstName(b);
    const lower = nameA.toLowerCase().localeCompare(nameB.toLowerCase());

    return lower !== 0 ? lower : nameA.localeCompare(nameB);
};

/**
 * Start of an import including the comments that move with it.
 *
 * @param sourceCode source of the linted file
 * @param node import whose start is wanted
 * @param isFirst whether the import opens its block
 */
const startOf = (sourceCode: SourceCode, node: RangedImport, isFirst: boolean): number => {
    const comments = sourceCode.getCommentsBefore(node);
    let start = node.range[0];

    for (let index = comments.length - 1; index >= 0; index--) {
        const comment = comments[index];

        if (!comment?.range) {
            break;
        }

        const gap = sourceCode.text.slice(comment.range[1], start);

        if (!/^[^\S\n]*\n[^\S\n]*$/.test(gap)) {
            break;
        }
        if (isFirst && !DIRECTIVE.test(comment.value)) {
            break;
        }

        start = comment.range[0];
    }

    return start;
};

/**
 * Splits the program's imports into blocks of consecutive imports with specifiers.
 *
 * @param sourceCode source of the linted file
 * @param body statements of the program
 */
const importBlocks = (sourceCode: SourceCode, body: Program["body"]): RangedImport[][] => {
    const blocks: RangedImport[][] = [];
    let current: RangedImport[] = [];

    const close = () => {
        if (current.length > 1) {
            blocks.push(current);
        }
        current = [];
    };

    for (const node of body) {
        if (node.type !== "ImportDeclaration" || node.specifiers.length === 0 || !node.range) {
            close();
            continue;
        }

        const rangedNode = node as RangedImport;
        const previous = current[current.length - 1];

        if (previous) {
            const between = sourceCode.text.slice(previous.range[1], startOf(sourceCode, rangedNode, false));

            if (/\n[^\S\n]*\n/.test(between)) {
                close();
            }
        }

        current.push(rangedNode);
    }

    close();

    return blocks;
};

const rule: Rule.RuleModule = {
    meta: {
        type: "layout",
        fixable: "code",
        docs: {
            description: "Sort the imports of each block by the first name they import",
        },
        messages: {
            unsorted: "Imports of this block are not sorted (react, react-native, then by first imported name): \"{{name}}\" should come before \"{{previous}}\".",
        },
        schema: [],
    },
    create(context) {
        const sourceCode = context.sourceCode;

        return {
            Program(program) {
                for (const block of importBlocks(sourceCode, program.body)) {
                    const unsortedIndex = block.findIndex((node, index) => {
                        const previous = block[index - 1];

                        return previous !== undefined && compareImports(previous, node) > 0;
                    });
                    const unsorted = block[unsortedIndex];
                    const previous = block[unsortedIndex - 1];
                    const first = block[0];
                    const last = block[block.length - 1];

                    if (!unsorted || !previous || !first || !last) {
                        continue;
                    }

                    const pieces = block.map((node, index) => ({
                        node,
                        text: sourceCode.text.slice(startOf(sourceCode, node, index === 0), node.range[1]),
                    }));
                    const sorted = [...pieces].sort((a, b) => compareImports(a.node, b.node));
                    const start = startOf(sourceCode, first, true);
                    const end = last.range[1];

                    context.report({
                        node: unsorted,
                        messageId: "unsorted",
                        data: {
                            name: firstName(unsorted),
                            previous: firstName(previous),
                        },
                        fix: (fixer) => fixer.replaceTextRange([start, end], sorted.map((piece) => piece.text).join("\n")),
                    });
                }
            },
        };
    },
};

export default rule;
