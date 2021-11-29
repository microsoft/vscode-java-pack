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
      'ext-guide': './src/ext-guide/assets/index.ts',
      welcome: './src/welcome/assets/index.ts',
      classpath: './src/classpath/assets/index.tsx',
      'formatter-settings': './src/formatter-settings/assets/index.tsx',
      'install-jdk': './src/install-jdk/asset/index.tsx'
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
      }, {
        test: /\.(jpg|png|svg|ico|icns)$/,
        loader: 'url-loader?limit=200000',
        options: {
          esModule: false
        }
      }, {
        test: /\.(css)$/,
        use: [{
          loader: 'style-loader'
        }, {
          loader: 'css-loader'
        }]
      }, {
        test: /\.(woff2|ttf)$/,
        loader: 'url-loader',
      }]
    },
    output: {
      filename: 'assets/[name]/index.js',
      path: path.resolve(__dirname, 'out'),
      publicPath: '/',
      devtoolModuleFilenameTemplate: "../[resource-path]"
    },
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
