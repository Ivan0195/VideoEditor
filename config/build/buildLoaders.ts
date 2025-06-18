import {ModuleOptions} from "webpack";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import ReactRefreshTypeScript from "react-refresh-typescript";
import {BuildOptions} from "./types/types";
import {buildBabelLoader} from "./babel/buildBabelLoader";

export function buildLoaders(options: BuildOptions): ModuleOptions['rules'] {
    const isDev = options.mode === 'development';

    const assetLoader = {
        test: /\.(png|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
    }

    const svgrLoader = {
        test: /\.svg$/i,
        use: [
            {
                loader: '@svgr/webpack',
                options: {
                    icon: true,
                    svgoConfig: {
                        plugins: [
                            {
                                name: 'convertColors',
                                params: {
                                    currentColor: true,
                                }
                            }
                        ]
                    }
                }
            }
        ],
    }

    const cssLoaderWithModules = {
        loader: "css-loader",
        options: {
            modules: {
                localIdentName: isDev ? '[path][name]__[local]' : '[hash:base64:8]'
            },
        },
    }

    const scssLoader = {
        test: /\.s[ac]ss$/i,
        oneOf: [
            {
                test: /\.module\.s[ac]ss$/i,
                use: [
                    isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 1,
                            modules: {
                                localIdentName: isDev ? '[path][name]__[local]' : '[hash:base64:8]',
                                auto: true
                            },
                        },
                    },
                    'sass-loader',
                ],
            },
            {
                use: [
                    isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
                    'css-loader',
                    'sass-loader',
                ],
            },
        ],
    }

    const tsLoader = {
        exclude: /node_modules/,
        test: /\.tsx?$/,
        use: [
            {
                loader: 'ts-loader',
                options: {
                    transpileOnly: true,
                    getCustomTransformers: () => ({
                        before: [isDev && ReactRefreshTypeScript()].filter(Boolean),
                    }),
                }
            }
        ]
    }

    const ffmpegWorkerLoader = {
        test: /\.worker\.(js|ts)$/,
        use: {
            loader: 'worker-loader',
            options: {
                filename: '[name].[contenthash].worker.js',
                esModule: false
            }
        }
    }

    const wasmLoader = {
        test: /\.wasm$/,
        type: 'asset/resource',
        generator: {
            filename: '[name][ext]'
        }
    }

    return [
        assetLoader,
        scssLoader,
        tsLoader,
        svgrLoader,
        ffmpegWorkerLoader,
        wasmLoader
    ]
}
