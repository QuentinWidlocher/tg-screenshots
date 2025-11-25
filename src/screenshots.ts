import path from "node:path";
import { Glob } from "bun";
import { bot } from "./bot";
import {
	getHash,
	getScreenshotByHash,
	getSentScreenshots,
	getThreadByName,
	storeScreenshot,
	storeThread,
	type Thread,
} from "./database";

function sendScreenshot(file: Bun.BunFile, chatId: string, threadId?: number) {
	console.log(
		"Sending",
		file.name,
		"to",
		chatId,
		threadId ? `in thread ${threadId}` : undefined,
	);

	return bot.api.sendDocument({
		document: file,
		chat_id: chatId,
		message_thread_id: threadId,
	});
}

export async function sendAndStoreScreenshot(
	dir: string,
	fileName: string,
	chatId: string,
	threadNameFilePath?: string,
) {
	const file = Bun.file(path.join(dir, fileName));
	const sentScreenshot = getScreenshotByHash(await getHash(file));

	if (sentScreenshot) {
		return;
	} else {
		const thread = threadNameFilePath
			? await getOrCreateThread(threadNameFilePath, chatId)
			: undefined;

		const { message_id: messageId } = await sendScreenshot(
			file,
			chatId,
			thread?.id,
		);
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

async function getCurrentThreadName(threadNameFilePath: string) {
	try {
		const file = Bun.file(threadNameFilePath);

		const text = await file.text();

		return text.split("\n").at(0)?.trim() || null;
	} catch (e) {
		if (e instanceof Error && "errno" in e && e.errno === -2) {
			console.error(`The appNameFile does not exist at ${threadNameFilePath}.`);
			return null;
		}

		throw e;
	}
}

async function getOrCreateThread(
	threadNameFilePath: string,
	chatId: string,
): Promise<Thread | undefined> {
	const currentThreadName = await getCurrentThreadName(threadNameFilePath);

	if (currentThreadName) {
		const thread = getThreadByName(currentThreadName);
		if (thread) {
			return thread;
		} else {
			const createdThread = await bot.api.createForumTopic({
				chat_id: chatId,
				name: currentThreadName,
			});

			const storedThread = {
				id: createdThread.message_thread_id,
				name: currentThreadName,
			};

			storeThread(storedThread);

			return storedThread;
		}
	}
}
