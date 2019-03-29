`use strict`;
const fs = require(`fs`),
  path = require(`path`);
function getPlugins(srcpath) {
  return fs.readdirSync(srcpath);
}
let plugin_directory = path.join(__dirname, `../`, `plugins`);
let plugins = getPlugins(plugin_directory);
let _ = require(`underscore-node`);
let moment = require(`moment-timezone`);
let config = require(`config`);
let { pm2Name } = config.get(`General`);
config = config.get(`bot`);
var commands = {};
var aliases;
exports.pluginHandler = function(bot) {
  load_plugins(bot);
};
exports.addAliases = function() {
  try {
    var time = moment()
      .tz(`America/Los_Angeles`)
      .format(`MM-DD-YYYY hh:mm a`);
    aliases = require(`../../config/alias.json`);
    console.log(`[${time} PST][${pm2Name}]` + ` ${Object.keys(aliases).length} aliases Loaded!`);
  } catch (e) {
    var time = moment()
      .tz(`America/Los_Angeles`)
      .format(`MM-DD-YYYY hh:mm a`);
    console.log(`[${time} PST][${pm2Name}] No aliases defined`);
  }
};
function load_plugins(bot) {
  let commandCount = 0;
  let otherFunc = 0;
  for (let i = 0; i < plugins.length; i++) {
    let plugin;
    try {
      plugin = require(`${plugin_directory}/${plugins[i]}`);
    } catch (err) {
      var time = moment()
        .tz(`America/Los_Angeles`)
        .format(`MM-DD-YYYY hh:mm a`);
      console.log(`[${time} PST][${pm2Name}]` + ` Improper setup of the ${plugins[i]} plugin. : ${err}`);
    }
    if (plugin) {
      if (`commands` in plugin) {
        for (let j = 0; j < plugin.commands.length; j++) {
          if (plugin.commands[j] in plugin) {
            addCommand(bot, plugin.commands[j], plugin[plugin.commands[j]]);
            commandCount++;
          }
        }
      }
      if (`custom` in plugin) {
        for (let j = 0; j < plugin.custom.length; j++) {
          if (plugin.custom[j] in plugin) {
            addCustomFunc(bot, plugin[plugin.custom[j]]);
            otherFunc++;
          }
        }
      }
    }
  }
  bot.commands = commands;
  var time = moment()
    .tz(`America/Los_Angeles`)
    .format(`MM-DD-YYYY hh:mm a`);
  console.log(`[${time} PST][${pm2Name}]` + ` Loaded ${commandCount} chat commands` + ` and ${otherFunc} custom functions.`);
}
function addCommand(bot, commandName, commandObject) {
  try {
    commands[commandName] = commandObject;
  } catch (err) {
    var time = moment()
      .tz(`America/Los_Angeles`)
      .format(`MM-DD-YYYY hh:mm a`);
    console.log(`[${time} PST][${pm2Name}] Error addCommand: ${err}`);
  }
}
function addCustomFunc(bot, customFunc) {
  try {
    customFunc(bot);
  } catch (err) {
    var time = moment()
      .tz(`America/Los_Angeles`)
      .format(`MM-DD-YYYY hh:mm a`);
    console.log(`[${time} PST][${pm2Name}] Error addCustomFunc: ${err}`);
  }
}
exports.commandCount = function(err) {
  return Object.keys(commands).length;
};
exports.commandNames = function(err) {
  return Object.keys(commands);
};
exports.checkMessageForCommand = function(msg, bot, isEdit) {
  if (msg.author.id != bot.user.id && msg.content.startsWith(config.prefix)) {
    if (!msg.author.presence.status || msg.author.presence.status == `offline` || msg.author.presence.status == `invisible`) {
      msg.author.send(`Please set your Discord Presence to Online to talk to the bot!`).catch(function(error) {
        msg.channel
          .send(
            `${msg.author}, Please enable Direct Messages from server members` +
              ` to communicate fully with our bot, it is located in the user` +
              ` setting area under Privacy & Safety tab, select the option` +
              ` allow direct messages from server members`
          )
          .then(msg.channel.send(`Please set your Discord Presence to Online to talk to the Bot!`));
      });
      return;
    }
    var cmdTxt = msg.content
      .split(` `)[0]
      .substring(config.prefix.length)
      .toLowerCase();
    var suffix = msg.content.substring(cmdTxt.length + config.prefix.length + 1);
    if (msg.isMentioned(bot.user)) {
      try {
        cmdTxt = msg.content.split(` `)[1].toLowerCase();
        suffix = msg.content.substring(bot.user.mention().length + cmdTxt.length + config.prefix.length + 1);
      } catch (e) {
        return;
      }
    }
    let alias = aliases[cmdTxt];
    if (alias) {
      var cmd = commands[alias];
    } else {
      var cmd = commands[cmdTxt];
    }
    if (cmdTxt === `help`) {
      if (suffix) {
        var cmds = suffix.split(` `).filter(function(cmd) {
          if (aliases[cmd]) {
            cmd = aliases[cmd];
            return commands[cmd];
          } else {
            return commands[cmd];
          }
        });
        var info = ``;
        for (var i = 0; i < cmds.length; i++) {
          var cmd = cmds[i];
          if (aliases[cmd]) {
            cmd = aliases[cmd];
          }
          info += `**${config.prefix + cmd}**`;
          var usage = commands[cmd].usage;
          if (usage) {
            info += ` ${usage}`;
          }
          var description = commands[cmd].description;
          if (description instanceof Function) {
            description = description();
          }
          if (description) {
            info += `\n\t${description}`;
          }
          info += `\n`;
        }
        var aliasnames = [];
        _.groupBy(aliases, function(key, value) {
          if (key == cmd) {
            aliasnames.push(value);
          }
        });
        var aliasnames = JSON.stringify(aliasnames)
          .replace(`]`, ``)
          .replace(`[`, ``);
        if (info || cmd) {
          msg.channel.send(`${info}**Other Activators**: \n${cmd},${aliasnames}`);
        }
      } else {
        msg.author.send(`**Available Commands:**`).then(function() {
          var batch = ``;
          var sortedCommands = Object.keys(commands).sort();
          for (var i in sortedCommands) {
            var cmd = sortedCommands[i];
            var info = `**${config.prefix + cmd}**`;
            var usage = commands[cmd].usage;
            if (usage) {
              info += ` ${usage}`;
            }
            var description = commands[cmd].description;
            if (description instanceof Function) {
              description = description();
            }
            if (description) {
              info += `\n\t${description}`;
            }
            var newBatch = `${batch}\n${info}`;
            if (newBatch.length > 1024 - 8) {
              msg.author.send(batch);
              batch = info;
            } else {
              batch = newBatch;
            }
          }
          if (batch.length > 0) {
            msg.author.send(batch);
          }
        });
      }
    } else if (cmd) {
      console.log(`treating ${msg.content} from ` + `${msg.author.username} as command`);
      try {
        suffix = suffix
          .trim()
          .split(` `)
          .filter(function(n) {
            return n !== ``;
          });
        cmd.process(bot, msg, suffix, isEdit);
      } catch (e) {
        var time = moment()
          .tz(`America/Los_Angeles`)
          .format(`MM-DD-YYYY hh:mm a`);
        var msgTxt = `command ${cmdTxt} failed :(`;
        var linebreak = `\n-------------------------------------------------\n`;
        if (config.debug) {
          msgTxt += `\n${e.stack}`;
        }
      }
    } else {
      return;
    }
  } else {
    if (msg.author == bot.user) {
      return;
    }
    if (msg.author != bot.user && msg.isMentioned(bot.user)) {
      return;
    } else {
      return;
    }
  }
};
