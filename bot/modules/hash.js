"use strict";
let needle = require("needle");
let config = require("config");
let hasHashBotChannels = require("../helpers.js").hasHashBotChannels;
let inPrivate = require("../helpers.js").inPrivate;
let ChannelID = config.get("hashbot").mainchannel;

exports.commands = [
  "hash" // command that is in this file, every command needs it own export as shown below
];
const symbols = {
  usd: "$",
  aud: "AU$",
  brl: "R$",
  cad: "Can$",
  chf: "Fr",
  clp: "CLP$",
  cny: "¥",
  czk: "Kč",
  dkk: "kr",
  eur: "€",
  gbp: "£",
  hkd: "HKD$",
  huf: "Ft",
  idr: "Rp",
  ils: "₪",
  inr: "₹",
  jpy: "¥",
  krw: "‎₩",
  mxn: "MXN$",
  myr: "RM",
  nok: "kr",
  nzd: "NZD$",
  php: "₱",
  pkr: "₨",
  pln: "zł",
  rub: "₽",
  sek: "kr",
  sgd: "S$",
  thb: "฿",
  try: "₺",
  twd: "NT$",
  zar: "R"
};

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
    "Displays current Hashrate of Network\n**!hash power <Mh/s> <fait>**\n  Displays potential Earnings For Given Hashrate\n **Supported Currencies:** *usd*, *eur*, *gbp*, *aud*, *brl*, *cad*, *chf*, *clp*, *cny*, *czk*, *dkk*, *hkd*, *huf*, *idr*, *ils*, *inr*, *jpy*, *krw*, *mxn*, *myr*, *nok*, *nzd*, *php*, *pkr*, *pln*, *rub*, *sek*, *sgd*, *thb*, *try*, *twd*, *zar* (case-insensitive)",
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
      let otherfiat = words[2];
      if (
        otherfiat === "" ||
        otherfiat === null ||
        otherfiat === undefined ||
        otherfiat === " "
      ) {
        otherfiat = "usd";
      }
      otherfiat = otherfiat.toLowerCase();
      let cmcurl = `https://api.coinmarketcap.com/v1/ticker/library-credit/?convert=${
        otherfiat
      }`;
      needle.get(cmcurl, function(error, response) {
        if (error || response.statusCode !== 200) {
          msg.channel.send("coinmarketcap API is not available");
        } else {
          let data = response.body[0];
          let otherPrice = data.body[0]["price_" + otherfiat];
          let sign = symbols[otherfiat];
          let myRate = Number(otherPrice);

          needle.get("https://whattomine.com/coins/164.json", function(
            error,
            response
          ) {
            if (error || response.statusCode !== 200) {
              msg.channel.send("whattomine API is not available");
            } else {
              let Diff = response.body.difficulty24;
              let Reward = response.body.block_reward;
              let myHash = Number(myhashrate);
              let LBCs = myHash / 2000 * (1 / ((Diff * 2) ^ 32) * Reward);
              let LBC = LBCs * 3600;
              let LBC24 = LBCs * 86400;
              let LBC1w = LBCs * 604800;
              let LBC1m = LBCs * 2628000;
              let Other = myRate * LBC;
              let Other24 = myRate * LBC24;
              let Other1w = myRate * LBC1w;
              let Other1m = myRate * LBC1m;
              let message = `With **${
                myHash
              } Mh/s** and Average 24 hour Difficulty: **${Diff.toFixed(0)}**
You can potentially earn the following: 
`;
              let lbcrates = `1 Hour = **${LBC.toFixed(4)}** 
1 Day = **${LBC24.toFixed(2)}** 
1 Week = **${LBC1w.toFixed(4)}** 
1 Month = **${LBC1m.toFixed(4)}** 
`;
              let otherrates = `1 Hour = **${sign} ${Other.toFixed(2)}** 
1 Day = **${sign} ${Other24.toFixed(2)}** 
1 Week = **${sign} ${Other1w.toFixed(2)}** 
1 Month = **${sign} ${Other1m.toFixed(2)}** 
`;
              const embed = {
                description: message,
                color: 7976557,
                author: {
                  name: "Hashing Power Calculator!",
                  icon_url: "https://i.imgur.com/nKHVQgq.png"
                },
                fields: [
                  {
                    name: "LBC Rates",
                    value: lbcrates,
                    inline: true
                  },
                  {
                    name: `${otherfiat.toUpperCase()} (${sign}) Rates`,
                    value: otherrates,
                    inline: true
                  }
                ]
              };
              msg.channel.send({ embed });
            }
          });
        }
      });
    }
  }
};
