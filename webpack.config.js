const webpack = require('webpack');
const path = require('path');

module.exports = function (env, argv) {
  env = env || {};

  return [{
    name: 'assets',
    mode: 'none',
    entry: {
      overview: './src/overview/assets/index.ts',
      'beginner-tips': './src/beginner-tips/assets/index.tsx',
      'ext-guide': './src/ext-guide/assets/index.ts',
      welcome: './src/welcome/assets/index.ts',
      'project-settings': './src/project-settings/assets/index.tsx',
      'formatter-settings': './src/formatter-settings/assets/index.tsx',
      'install-jdk': './src/install-jdk/assets/index.tsx'
    },
    module: {
      rules: [{
        test: /\.ts(x?)$/,
        exclude: /node_modules/,
        use: 'ts-loader'
      }, {
        test: /\.(scss)$/,
        use: [{
          loader: 'style-loader'
        }, {
          loader: 'css-loader'
        }, {
          loader: 'postcss-loader',
          options: {
            postcssOptions: {
              plugins: [
                [
                  "autoprefixer",
                  {
                    // Options
                  },
                ],
              ],
            },
          }
        }, {
          loader: 'sass-loader'
        }]
      }, {
        test: /\.(jpg|png|svg|ico|icns)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 200000,
          },
        },
      }, {
        test: /\.(css)$/,
        use: [{
          loader: 'style-loader'
        }, {
          loader: 'css-loader'
        }]
      }, {
        test: /\.(woff2|ttf)$/,
        type: 'asset/inline',
      }]
    },
    output: {
      filename: 'assets/[name]/index.js',
      path: path.resolve(__dirname, 'out'),
      publicPath: '/',
      devtoolModuleFilenameTemplate: "../[resource-path]"
    },
    plugins: [
      new webpack.ProvidePlugin({
        process: 'process/browser',
      }),
    ],
    devtool: 'source-map',
    resolve: {
      extensions: ['.js', '.ts', '.tsx'],
      // https://github.com/react-dnd/react-dnd/issues/3425#issuecomment-1214554950
      fallback: {
        'process/browser': require.resolve('process/browser'),
      }
    }
  }, {
    name: 'extension',
    target: 'node',
    mode: 'none',
    entry: {
      extension: './src/extension.ts'
    },
    module: {
      rules: [{
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader'
      }]
    },
    resolve: {
      modules: ['node_modules', path.resolve(__dirname, 'src')],
      mainFiles: ['index'],
      extensions: ['.js', '.ts', '.json'],
      preferRelative: true
    },
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'out'),
      libraryTarget: "commonjs2",
      publicPath: '/',
      devtoolModuleFilenameTemplate: "../[resource-path]"
    },
    externals: {
      'applicationinsights-native-metrics': 'commonjs applicationinsights-native-metrics', // ignored because we don't ship native module
      'diagnostic-channel-publishers': 'commonjs diagnostic-channel-publishers',
      vscode: 'commonjs vscode'
    },
    devtool: 'source-map'
  }]
};
