const http = require('axios');
const port = process.env.PORT || 3000;
const baseURL = process.env.BASEURL || 'http://localhost';

http.defaults.baseURL = `${baseURL}:${port}`;
http.defaults.headers.post['Content-Type'] = 'application/json;charset=utf-8';


exports.reportTransition = function(lifecycle, bot, args) {
  console.log(`Reporting | Transition: ${lifecycle.transition} from: ${lifecycle.from} to: ${lifecycle.to}`)

  http.post('./report', {
    bot: bot.id,
    state: lifecycle.to
  })

    .then((response) => {
      if (response.status !== 200) {
        console.log('Server received Report, Status Code: ', response.status);
      } else {
        console.log('Server responded with Status Code: ', response.status);
      }
    })

    .catch((err) => {
      console.error('Server reporting error: ', err);
    });
}


