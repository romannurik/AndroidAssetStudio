import process from 'process';
import path from 'path';
import webpack from 'webpack';

module.exports = {
  entry: {
    app: './app/scripts/app.entry.js',
  },
  output: {
    filename: '[name].js',
    path: path.join(process.cwd(), './dist'),
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /node_modules/,
          chunks: 'initial',
          name: 'vendor',
          enforce: true,
        },
      }
    },
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: process.env.NODE_ENV
      }
    })
  ],
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.js/,
        use: 'import-glob',
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                'env',
                'react'
              ],
            }
          },
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.yaml']
  },
};
