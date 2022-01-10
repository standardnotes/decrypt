const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (_, env) => ({
  entry: './src/index.ts',

  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'index.js',
  },

  devServer: {
    static: {
      directory: path.join(__dirname, 'src'),
      serveIndex: false
    },
    client: {
      overlay: false,
    }
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /(node_modules|snjs)/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: !(env.mode === 'production'),
          },
        },
      },
      {
        test: /\.(s(a|c)ss)$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'sass-loader'
          }
        ],
      },
      {
        test: /\.(svg|jpg|png)$/,
        type: 'asset/resource',
      },
      {
        test: /\.(woff(2)?)(\?[a-z0-9]+)?$/,
        type: 'asset/resource',
      },
    ],
  },

  plugins: [
    new CopyPlugin({
      patterns: [{ from: 'src/assets/images', to: 'assets/images' }],
    }),
    new MiniCssExtractPlugin(),
    new HtmlWebpackPlugin({
      title: 'Decrypt your Standard Notes backup file',
      template: 'src/index.html',
      scriptLoading: 'blocking',
      inject: false
    }),
  ],

  resolve: {
    extensions: [
      '.ts',
      '.js',
      '.css',
      '.sass',
      '.scss'
    ],
    fallback: {
      crypto: false,
      path: false
    },
  },

  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
        },
        extractComments: false,
      })
    ],
  },
});
