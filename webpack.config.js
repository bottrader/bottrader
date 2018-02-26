const webpack = require('webpack')
const path = require('path');

module.exports = {
  devtool: 'cheap-module-eval-source-map',
  entry: [
    'webpack-hot-middleware/client',
    './client/src/index.js'
  ],
  output: {
    filename: 'bundle.js',
    path: path.join(__dirname, 'client/dist'),
    publicPath: '/static/'
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ],
  module: {
    loaders: [{
      test: /\.css$/,
      loaders: ['style-loader', 'css-loader']
    },
    {
      test: /\.jsx?$/,
      loaders: ['react-hot', 'babel'],
      include: path.join(__dirname, 'client/src')
    }]
  }
};
