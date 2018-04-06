//const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: './src/client/index.tsx',
  output: {
    filename: 'bundle.js',
    path: path.join(__dirname, '/dist')
  },

  devtool: 'source-map',


  module: {
    rules: [
      { test: /\.tsx?$/, loader: 'awesome-typescript-loader' },
      { test: /\.css$/, loaders: ['style-loader', 'css-loader'] },
      { enforce: 'pre', test: /\.js$/, loader: 'source-map-loader' }
    ]
  },

  externals: {
    'react': 'React',
    'react-dom': 'ReactDOM'
  },
};
