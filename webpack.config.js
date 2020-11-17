const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
const path = require('path');

module.exports = function (env, argv) {
  env = env || {};

  return [{
    name: 'assets',
    mode: 'none',
    entry: {
      overview: './src/overview/assets/index.ts',
      'java-runtime': './src/java-runtime/assets/index.ts',
      'getting-started': './src/getting-started/assets/index.ts',
      'ext-guide': './src/ext-guide/assets/index.ts'
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
            plugins: function () {
              return [require('autoprefixer')];
            }
          }
        }, {
          loader: 'sass-loader'
        }]
      }]
    },
    output: {
      filename: 'assets/[name]/index.js',
      path: path.resolve(__dirname, 'out'),
      publicPath: '/',
      devtoolModuleFilenameTemplate: "../[resource-path]"
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: path.resolve(__dirname, 'out/assets/overview/index.html'),
        template: 'src/overview/assets/index.html',
        inlineSource: '.(js|css)$',
        chunks: ['overview']
      }),
      new HtmlWebpackPlugin({
        filename: path.resolve(__dirname, 'out/assets/java-runtime/index.html'),
        template: 'src/java-runtime/assets/index.html',
        inlineSource: '.(js|css)$',
        chunks: ['java-runtime']
      }),
      new HtmlWebpackPlugin({
        filename: path.resolve(__dirname, 'out/assets/getting-started/index.html'),
        template: 'src/getting-started/assets/index.html',
        inlineSource: '.(js|css)$',
        chunks: ['getting-started']
      }),
      new HtmlWebpackPlugin({
        filename: path.resolve(__dirname, 'out/assets/ext-guide/index.html'),
        template: 'src/ext-guide/assets/index.html',
        inlineSource: '.(js|css)$',
        chunks: ['ext-guide']
      }),
      new HtmlWebpackInlineSourcePlugin(),
    ],
    devtool: 'source-map',
    resolve: {
      extensions: ['.js', '.ts', '.tsx']
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
      extensions: ['.js', '.ts', '.json']
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
