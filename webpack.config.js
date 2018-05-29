const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
const path = require('path');

module.exports = function (env, argv) {
  env = env || {};

  return {
    entry: {
      welcome: './src/welcome/assets/index.ts'
    },
    module: {
      rules: [{
        test: /\.ts$/,
        use: 'ts-loader'
      }]
    },
    mode: 'development',
    output: {
      filename: '[name]/assets/index.js',
      path: path.resolve(__dirname, 'out'),
      publicPath: '/'
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: path.resolve(__dirname, 'out/welcome/assets/index.html'),
        template: 'src/welcome/assets/index.html',
        inlineSource: '.(js|css)$'
      }),
      new HtmlWebpackInlineSourcePlugin(),
    ]
  }
};
