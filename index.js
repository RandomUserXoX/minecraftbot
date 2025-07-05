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
    host: 'IIITD_29.aternos.me',
    port: 24285,
    username: 'AFK_Bot',
    version: '1.20.1'
  });

  bot.loadPlugin(pathfinder);

  bot.on('spawn', () => {
    const defaultMove = new Movements(bot);
    bot.pathfinder.setMovements(defaultMove);
    startIdleMovement(bot);
    monitorWallCollision(bot);
  });

  let goalListenerActive = false;

  bot.on('chat', async (username, message) => {
    if (username === bot.username) return;

    if (message.toLowerCase() === '!sleep') {
      if (goalListenerActive) return;

      const bed = bot.findBlock({
        matching: block => bot.isABed(block),
        maxDistance: 6,
      });

      if (!bed) return;

      const bedPos = bed.position;
      bot.pathfinder.setMovements(new Movements(bot));

      const sleepAfterArriving = async () => {
        bot.removeListener('goal_reached', sleepAfterArriving);
        goalListenerActive = false;
        setTimeout(async () => {
          try {
            await bot.sleep(bed);
          } catch (err) {
            console.log("Sleep error:", err.message);
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
      } catch (err) {
        console.log("Wake error:", err.message);
      }
    }
  });

  // Reconnect on disconnect
  bot.on('end', () => {
    console.log("Bot disconnected. Reconnecting in 10s...");
    setTimeout(createBot, 10000);
  });

  bot.on('error', err => {
    if (err.code === 'ECONNABORTED') {
      console.log("Connection aborted. Possibly due to server shutdown.");
    } else {
      console.log("Bot error:", err);
    }
  });
}

// === Idle Movement ===
function startIdleMovement(bot) {
  setInterval(() => {
    if (!bot || !bot.entity || !bot.player || bot.isSleeping) return;

    const actions = ['forward', 'back', 'left', 'right'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    bot.setControlState(action, true);
    bot.setControlState('sneak', Math.random() < 0.5);

    try {
      bot.look(
        bot.entity.yaw + (Math.random() - 0.5) * 1.5,
        bot.entity.pitch,
        true
      );
    } catch (e) {}

    setTimeout(() => {
      bot.setControlState(action, false);
      bot.setControlState('sneak', false);
    }, 1000 + Math.random() * 1000);
  }, 10000);

  setInterval(() => {
    if (!bot || !bot.entity) return;
    try {
      bot.look(
        bot.entity.yaw + (Math.random() - 0.5) * 0.2,
        bot.entity.pitch + (Math.random() - 0.5) * 0.2,
        true
      );
    } catch (e) {}
  }, 700);
}

// === Wall Collision Monitor ===
function monitorWallCollision(bot) {
  let lastPos = null;
  let stuckStartTime = null;

  setInterval(() => {
    if (!bot || !bot.entity) return;

    const currentPos = bot.entity.position.clone();

    if (lastPos && currentPos.distanceTo(lastPos) < 0.02) {
      if (!stuckStartTime) stuckStartTime = Date.now();

      const stuckDuration = Date.now() - stuckStartTime;
      if (stuckDuration >= 5000) {
        try {
          const yaw = (bot.entity.yaw + Math.PI) % (2 * Math.PI);
          bot.look(yaw, bot.entity.pitch, true);
        } catch (e) {}
        stuckStartTime = null;
      }
    } else {
      stuckStartTime = null;
    }

    lastPos = currentPos;
  }, 1000);
}

createBot();
