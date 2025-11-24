import { watch } from "node:fs/promises";
import { parseArgs } from "node:util";
import { bot } from "./bot.ts";
import { config } from "./config.ts";
import { sendAllUnsentFile, sendAndStoreScreenshot } from "./screenshots.ts";

declare const target: "win" | string | undefined;

const ac = new AbortController();
const { signal } = ac;

const signals = ["SIGINT", "SIGTERM"];

for (const signal of signals) {
	process.on(signal, async () => {
		console.log(`Received ${signal}. Initiating graceful shutdown...`);
		await bot.stop();
		ac.abort();
		process.exit(0);
	});
}

process.on("uncaughtException", (error) => {
	console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (error) => {
	console.error("Unhandled rejection:", error);
});

const { values: args } = parseArgs({
	args: Bun.argv,
	options: {
		help: {
			type: "boolean",
		},
		directory: {
			type: "string",
		},
		chatId: {
			type: "string",
		},
		alwaysSend: {
			type: "boolean",
		},
		noInitialScan: {
			type: "boolean",
		},
	},
	allowPositionals: config.NODE_ENV !== "production",
	strict: true,
});

if (args.help) {
	console.log(`
Telegram Screenshots bot

--chatId        id of the chat to send to (the bot will give you when adding it to the chat)
--directory     (default: ".") path to your screenshot folder
--alwaysSend    (default: false) send even if the new file was already sent (won't trigger on launch)
--noInitialScan (default: false )don't scan for unsent screenshots at launch
   `);

	process.exit(0);
}

await bot.start();

if (!args.directory) {
	args.directory = ".";
}

if (!args.chatId) {
	console.error("You need to provide a chat id with `--chatId`");
	console.error(
		"The bot will keep running but you will need to rerun the command with the correct arguments.",
	);
} else {
	if (!args.noInitialScan) {
		try {
			await sendAllUnsentFile(args.directory, args.chatId);
		} catch (e) {
			console.error(e);
		}
	}

	const watcher = watch(args.directory, { signal, recursive: true });

	for await (const fileChange of watcher) {
		if (
			fileChange.eventType === "rename" &&
			fileChange.filename?.endsWith(".png")
		) {
			try {
				await sendAndStoreScreenshot(
					args.directory,
					fileChange.filename,
					args.chatId,
					args.alwaysSend,
				);
			} catch (e) {
				console.error(e);
			}
		}
	}
}
