// eslint-config-expo ships no type declarations.
declare module "eslint-config-expo/flat" {
    import type {Linter} from "eslint";

    const config: Linter.Config[];
    export default config;
}
