const path = require('path');
global.appRoot = path.resolve('__dirname');
const express = require('express');
const app = express();
const controllers = require('./controllers');
const morgan = require('morgan');
const port = process.env.PORT || 3000;


app.use(morgan('tiny')); //middleware logging
app.use(express.json()); //middleware data parsing

app.use(express.static(path.join(__dirname, '../client/dist')));
app.use('/api', controllers.api);

app.listen(port, function () { console.log(`Bot Server listening on port ${port}!`) });




