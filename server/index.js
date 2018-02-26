const path = require('path');
var webpack = require('webpack');
const express = require('express');
var config = require('../webpack.config');

const app = express();
var compiler = webpack(config);

const controllers = require('./controllers');
const morgan = require('morgan');
const port = process.env.PORT || 3000;

app.use(require('webpack-dev-middleware')(compiler, {
  publicPath: config.output.publicPath
}));

app.use(require('webpack-hot-middleware')(compiler));

app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.use(morgan('tiny')); //middleware logging
app.use(express.json()); //middleware data parsing

// app.use(express.static(path.join(__dirname, '../client/dist')));
app.use('/api', controllers.api);

app.listen(port, function (err) {
  if (err) {
    return console.error(err);
  }
  
  console.log(`Bot Server listening on port ${port}!`) 
});
