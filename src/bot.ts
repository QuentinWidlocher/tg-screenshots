import { Bot, bold, code, format, pre } from "gramio";
import { config } from "./config";

export const bot = new Bot(config.BOT_TOKEN)
	.command("start", (context) =>
		context.send("Add this bot to a group or a channel (with send permission)"),
	)
	.on("channel_post", async (context) => {
		if (context.from?.id === bot.info?.id) {
			return;
		}

		return context.send(format`
      ${bold`Telegram screenshot sender`}

      Start your bot and point it to this chat id : ${code`${context.chatId}`}

      ${pre(
				`tgscreenshots --chatId=${context.chatId} --directory=<screenshot-dir>`,
			)}
    `);
	})
	.on("new_chat_members", async (context) => {
		// Only cares for itself
		if (!context.eventMembers.some((member) => member.id === bot.info?.id)) {
			return;
		}

		return context.send(format`
      ${bold`Telegram screenshot sender`}

      Start your bot and point it to this chat id : ${code`${context.chatId}`}

      ${pre(`tgscreenshots --chatId ${context.chatId}`)}
    `);
	})
	.onStart(({ info }) => console.log(`✨ Bot ${info.username} was started!`));
