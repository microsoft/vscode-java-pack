const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
const path = require('path');

module.exports = function (env, argv) {
  env = env || {};

  return {
    entry: {
      overview: './src/overview/assets/index.ts'
    },
    module: {
      rules: [{
        test: /\.ts$/,
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
    mode: 'development',
    output: {
      filename: '[name]/assets/index.js',
      path: path.resolve(__dirname, 'out'),
      publicPath: '/'
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: path.resolve(__dirname, 'out/overview/assets/index.html'),
        template: 'src/overview/assets/index.html',
        inlineSource: '.(js|css)$'
      }),
      new HtmlWebpackInlineSourcePlugin(),
    ]
  }
};
