import path from "node:path";
import { Glob } from "bun";
import { bot } from "./bot";
import {
	getHash,
	getScreenshotByHash,
	getSentScreenshots,
	storeScreenshot,
} from "./database";

function sendScreenshot(file: Bun.BunFile, chatId: string) {
	console.log("Sending", file.name, "to", chatId);

	return bot.api.sendDocument({
		document: file,
		chat_id: chatId,
	});
}

export async function sendAndStoreScreenshot(
	dir: string,
	fileName: string,
	chatId: string,
	alwaysSend = false,
) {
	const file = Bun.file(path.join(dir, fileName));
	const sentScreenshot = getScreenshotByHash(await getHash(file));
	if (sentScreenshot) {
		if (!alwaysSend) {
			console.log("Screenshot", file.name, "already sent.");
			return;
		}

		console.log(
			"Screenshot",
			file.name,
			"already sent but we --alwaysSend, so forwarding...",
		);
		await bot.api.forwardMessage({
			from_chat_id: chatId,
			message_id: sentScreenshot.messageId,
			chat_id: chatId,
		});
	} else {
		const { message_id: messageId } = await sendScreenshot(file, chatId);
		await storeScreenshot(messageId, file);
	}
}

export async function sendAllUnsentFile(dir: string, chatId: string) {
	console.log("Scanning", dir, "for screenshots to send to", chatId);
	const sentScreenshotsHashes = getSentScreenshots().map((s) => s.hash);

	console.log(
		"Found",
		sentScreenshotsHashes.length,
		"already sent screenshots",
	);

	const fileNames = await Array.fromAsync(
		new Glob("**/*.{png,jpg}").scan({ cwd: dir }),
	);

	const files = await Promise.all(
		fileNames.map(async (fileName) => {
			const file = Bun.file(path.join(dir, fileName));
			return [await getHash(file), file] as const;
		}),
	);
	const unsentFiles = files.filter(
		([hash]) => !sentScreenshotsHashes.includes(hash),
	);

	console.log("Found", unsentFiles.length, "not yet sent screenshots");

	return Promise.all(
		unsentFiles.map(async ([hash, file]) => {
			const { message_id: messageId } = await sendScreenshot(file, chatId);
			await storeScreenshot(messageId, file, hash);
		}),
	);
}
