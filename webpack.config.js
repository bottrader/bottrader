const path = require('path');
const dest = path.resolve(__dirname, 'client/dist');
const src = path.resolve(__dirname, 'client/src');

module.exports = {
  entry: `${src}/index.jsx`,
  output: {
    filename: 'bundle.js',
    path: dest
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          { loader: "style-loader" },
          { loader: "css-loader" }
        ]
      },
      {
        test: /\.jsx$/,
        include: src,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['env', 'react']
          }
        }
      }
    ] 
  }
};