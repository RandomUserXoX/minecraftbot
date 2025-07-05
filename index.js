const mineflayer = require('mineflayer');
const express = require('express');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear } = goals;

const app = express();
app.get("/", (req, res) => res.send("Bot is alive!"));
app.listen(3000, () => console.log("Web server running for UptimeRobot ping."));

let bot;

function createBot() {
  bot = mineflayer.createBot({
    host: 'IIITD_29.aternos.me', // 🔁 Replace with your server IP
    port: 24285,             // Change if different
    username: 'AFK_Bot',
  });

  // Load pathfinder plugin
  bot.loadPlugin(pathfinder);

  bot.on('spawn', () => {
    console.log('Bot has spawned.');
    const defaultMove = new Movements(bot);

    // ==== Idle Movement ====
    setInterval(() => {
      const actions = ['forward', 'back', 'left', 'right'];
      const action = actions[Math.floor(Math.random() * actions.length)];
      bot.setControlState(action, true);
      bot.setControlState('sneak', Math.random() < 0.5);

      bot.look(bot.entity.yaw + (Math.random() - 0.5) * 1.5, bot.entity.pitch, true);

      setTimeout(() => {
        bot.setControlState(action, false);
        bot.setControlState('sneak', false);
      }, 1000 + Math.random() * 1000);
    }, 10000);

    // Camera jitter
    setInterval(() => {
      bot.look(
        bot.entity.yaw + (Math.random() - 0.5) * 0.2,
        bot.entity.pitch + (Math.random() - 0.5) * 0.2,
        true
      );
    }, 700);

    // Wall collision monitor
    monitorWallCollision(bot);
  });

  // ==== Commands ====
  let goalListenerActive = false;

  bot.on('chat', async (username, message) => {
    if (username === bot.username) return;

    if (message.toLowerCase() === '!sleep') {
      if (goalListenerActive) {
        bot.chat("Already heading to bed or sleeping.");
        return;
      }

      const bed = bot.findBlock({
        matching: block => bot.isABed(block),
        maxDistance: 6,
      });

      if (!bed) {
        bot.chat("I can't find a bed nearby.");
        return;
      }

      const bedPos = bed.position;
      bot.pathfinder.setMovements(new Movements(bot));
      bot.chat("Heading to bed...");

      const sleepAfterArriving = async () => {
        bot.removeListener('goal_reached', sleepAfterArriving);
        goalListenerActive = false;

        setTimeout(async () => {
          try {
            await bot.sleep(bed);
            bot.chat("I'm now sleeping 😴");
          } catch (err) {
            bot.chat("Couldn't sleep: " + err.message);
          }
        }, 500);
      };

      goalListenerActive = true;
      bot.on('goal_reached', sleepAfterArriving);
      bot.pathfinder.setGoal(new GoalNear(bedPos.x, bedPos.y, bedPos.z, 1));
    }

    if (message.toLowerCase() === '!wake') {
      try {
        await bot.wake();
        bot.chat("I'm awake now 🌞");
      } catch (err) {
        bot.chat("I'm not asleep or can't wake up.");
      }
    }
  });

  // Auto-reconnect
  bot.on('end', () => {
    console.log("Bot disconnected. Reconnecting in 10s...");
    setTimeout(createBot, 10000);
  });

  bot.on('error', err => {
    console.log("Bot error:", err);
  });
}

// === Wall Collision Monitor ===
function monitorWallCollision(bot) {
  let lastPos = null;
  let stuckStartTime = null;

  setInterval(() => {
    const currentPos = bot.entity.position.clone();

    if (lastPos && currentPos.distanceTo(lastPos) < 0.02) {
      if (!stuckStartTime) stuckStartTime = Date.now();

      const stuckDuration = Date.now() - stuckStartTime;
      if (stuckDuration >= 5000) {
        const yaw = (bot.entity.yaw + Math.PI) % (2 * Math.PI);
        bot.look(yaw, bot.entity.pitch, true);
        stuckStartTime = null;
      }
    } else {
      stuckStartTime = null;
    }

    lastPos = currentPos;
  }, 1000);
}

createBot();
