const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (_, env) => ({
  entry: './src/index.ts',

  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'index.js',
  },

  devServer: {
    historyApiFallback: {
      index: 'decrypt.html'
    },
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
    ],
  },

  plugins: [
    new CopyPlugin({
      patterns: [{ from: 'src/decrypt.html' }],
    }),
  ],

  resolve: {
    extensions: ['.ts', '.js'],
    fallback: {
      crypto: false,
      path: false
    },
  },
});
