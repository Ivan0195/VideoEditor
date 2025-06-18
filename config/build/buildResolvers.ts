import {Configuration} from "webpack";
import {BuildOptions} from "./types/types";

export function buildResolvers(options: BuildOptions): Configuration['resolve'] {
    return {
        extensions: ['.tsx', '.ts', '.js'],
        alias: {
            '@': options.paths.src,
        },
        fallback: {
            "path": require.resolve("path-browserify"),
            "fs": false,
            "crypto": false
        }
    }
}
