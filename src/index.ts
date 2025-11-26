import { watch } from "node:fs/promises";
import { parseArgsWithHelpMessage } from "./args.ts";
import { bot } from "./bot.ts";
import { config } from "./config.ts";
import { sendAllUnsentFile, sendAndStoreScreenshot } from "./screenshots.ts";

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

console.info("Telegram Screenshot Bot\n");

export type Args = typeof args & { chatId: string };

const { values: args } = parseArgsWithHelpMessage({
	args: Bun.argv,
	options: {
		help: {
			type: "boolean",
			default: false,
		},
		directory: {
			type: "string",
			default: ".",
			description: "Path to your screenshot folder",
		},
		chatId: {
			type: "string",
			default: undefined,
			description:
				"Id of the chat to send to (the bot will give you when adding it to the chat)",
		},
		noInitialScan: {
			type: "boolean",
			default: false,
		},
		threadNameFile: {
			type: "string",
			default: undefined,
			description:
				"Path to a .txt file containing a name, to send to the right thread",
		},
		sendAsPhoto: {
			type: "boolean",
			default: true,
			description: "Send with compression (can be used with --sendAsDocument)",
		},
		sendAsDocument: {
			type: "boolean",
			default: false,
			description: "Send without compression (can be used with --sendAsPhoto)",
		},
	},
	allowPositionals: config.NODE_ENV !== "production",
});

await bot.start();

if (!args.chatId) {
	console.error("You need to provide a chat id with `--chatId`");
	console.error(
		"The bot will keep running but you will need to rerun the command with the correct arguments.",
	);
} else {
	if (!args.noInitialScan) {
		try {
			await sendAllUnsentFile(args as Args);
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
				await sendAndStoreScreenshot(fileChange.filename, args as Args);
			} catch (e) {
				console.error(e);
			}
		}
	}
}
