let needle = require("needle");
let config = require("config");
let hasHashBotChannels = require("../helpers.js").hasHashBotChannels;
let inPrivate = require("../helpers.js").inPrivate;
let ChannelID = config.get("hashbot").mainchannel;
exports.commands = [
  "hash" // command that is in this file, every command needs it own export as shown below
];

/**
 * Retrieves the information from the APIs
 * @returns {Promise<*[]>}
 */
function getMiningInfo() {
  function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  return Promise.all([
    needle.get("https://explorer.lbry.io/api/v1/status"),
    needle.get("https://whattomine.com/coins/164.json")
  ])
    .then(([explorerResponse, wtmResponse]) => {
      if (
        explorerResponse.statusCode !== 200 ||
        wtmResponse.statusCode !== 200
      ) {
        return Promise.reject(
          (explorerResponse.statusCode !== 200 ? "Explorer" : "WhatToMine") +
            "API is not available"
        );
      }
      let data = explorerResponse.body.status;
      let height = Number(data.height);
      let hashRate = data.hashrate;
      let difficulty = Number(data.difficulty);

      let wtmData = wtmResponse.body;
      let reward = Number(wtmData.block_reward);
      let block_time = Number(wtmData.block_time);
      let difficulty24 = Number(wtmData.difficulty24);

      let description = `Hashrate: ${numberWithCommas(hashRate)}
Difficulty: ${numberWithCommas(difficulty.toFixed(0))}
Difficulty 24 Hour Average: ${numberWithCommas(difficulty24.toFixed(0))}
Current block: ${numberWithCommas(height.toFixed(0))}
Block Time: ${numberWithCommas(block_time.toFixed(0))} seconds 
Block Reward: ${numberWithCommas(reward.toFixed(0))} LBC 
Sources: https://explorer.lbry.io & 
https://whattomine.com/coins/164-lbc-lbry`;

      return Promise.resolve({
        description: description,
        color: 7976557,
        author: {
          name: "LBRY Network Stats",
          icon_url: "https://i.imgur.com/yWf5USu.png"
        }
      });
    })
    .catch(error => {
      return Promise.reject(error);
    });
}

exports.custom = ["timedhash"];

exports.timedhash = function(bot) {
  setInterval(function() {
    sendMiningInfo(bot);
  }, 6 * 60 * 60 * 1000);

  function sendMiningInfo(bot) {
    getMiningInfo()
      .then(data => {
        bot.channels.get(ChannelID).send({ data });
      })
      .catch(error => {
        bot.channels.get(ChannelID).send({ error });
      });
  }
};

exports.hash = {
  usage: "",
  description:
    "Displays current Hashrate of Network\n**!hash power <Mh/s>**\n  Displays potential Earnings For Given Hashrate",
  process: function(bot, msg, suffix) {
    let words = suffix
      .trim()
      .split(" ")
      .filter(function(n) {
        return n !== "";
      });
    if (words[0] === "power") {
      sendProfitInfo(bot, msg, suffix);
    } else {
      sendMiningInfo(bot, msg);
    }

    function sendMiningInfo(bot, msg) {
      if (!inPrivate(msg) && !hasHashBotChannels(msg)) {
        msg.channel.send(
          "Please use <#" + ChannelID + "> or DMs to talk to hash bot."
        );
        return;
      }
      getMiningInfo()
        .then(data => {
          msg.channel.send({ data });
        })
        .catch(error => {
          msg.channel.send({ error });
        });
    }

    function sendProfitInfo(bot, msg, suffix) {
      needle.get("https://whattomine.com/coins/164.json", function(
        error,
        response
      ) {
        if (error || response.statusCode !== 200) {
          msg.channel.send("whattomine API is not available");
        } else {
          let words = suffix
            .trim()
            .split(" ")
            .filter(function(n) {
              return n !== "";
            });
          let myhashrate = words[1];
          if (
            myhashrate === "" ||
            myhashrate === null ||
            myhashrate === undefined ||
            myhashrate === " "
          ) {
            myhashrate = "100";
          }
          let Diff = response.body.difficulty24;
          let Reward = response.body.block_reward;
          let myHash = Number(myhashrate);
          let LBCs = myHash / 2000 * (1 / ((Diff * 2) ^ 32) * Reward);
          let LBC = LBCs * 3600;
          let LBC24 = LBCs * 86400;
          let LBC1w = LBCs * 604800;
          let LBC1m = LBCs * 2628000;
          let message = `With **${
            myHash
          } Mh/s** and Average 24 hour Difficulty: **${Diff.toFixed(0)}**
You can potentially earn the following amounts of **LBC**: 
1 Hour = **${LBC.toFixed(4)}** 
1 Day = **${LBC24.toFixed(2)}** 
1 Week = **${LBC1w.toFixed(4)}** 
1 Month = **${LBC1m.toFixed(4)}** 
`;
          const embed = {
            description: message,
            color: 7976557,
            author: {
              name: "Hashing Power Calculator!",
              icon_url: "https://i.imgur.com/nKHVQgq.png"
            }
          };
          msg.channel.send({ embed });
        }
      });
    }
  }
};
