let moment = require(`moment-timezone`);
let { checkMessageForCommand } = require(`./plugin-handler.js`);
let config = require(`config`);
let { prefix } = config.get(`bot`);
exports.eventHandler = function(bot) {
  bot.on(`ready`, async function() {
    var time = moment()
      .tz(`America/Los_Angeles`)
      .format(`MM-DD-YYYY hh:mm a`);
    console.log(`[${time} PST]` + ` Logged in! Serving in ${bot.guilds.array().length} servers`);
    bot.user.setActivity(`${prefix}help`);
  });
  bot.on(`message`, msg => {
    checkMessageForCommand(msg, bot, !1);
  });
  bot.on(`messageUpdate`, (oldMessage, newMessage) => {
    checkMessageForCommand(newMessage, bot, !0);
  });
};
