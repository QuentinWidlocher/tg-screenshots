import path from "node:path";
import { Glob } from "bun";
import type { TelegramMessage } from "gramio";
import type { Args } from ".";
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

async function sendScreenshot(
	file: Bun.BunFile,
	chatId: string,
	{
		sendAsPhoto,
		sendAsDocument,
	}: { sendAsPhoto: boolean; sendAsDocument: boolean },
	threadId?: number,
): Promise<TelegramMessage[]> {
	console.log(
		"Sending",
		file.name,
		"to",
		chatId,
		threadId ? `in thread ${threadId}` : undefined,
	);

	const messages: TelegramMessage[] = [];

	if (sendAsPhoto) {
		messages.push(
			await bot.api.sendPhoto({
				chat_id: chatId,
				photo: file,
				message_thread_id: threadId,
			}),
		);
	}

	if (sendAsDocument) {
		messages.push(
			await bot.api.sendDocument({
				chat_id: chatId,
				document: file,
				message_thread_id: threadId,
			}),
		);
	}

	return messages;
}

export async function sendAndStoreScreenshot(
	fileName: string,
	{ directory, chatId, sendAsDocument, sendAsPhoto, threadNameFile }: Args,
) {
	const file = Bun.file(path.join(directory, fileName));
	const sentScreenshot = getScreenshotByHash(await getHash(file));

	if (sentScreenshot) {
		return;
	} else {
		const thread = threadNameFile
			? await getOrCreateThread(threadNameFile, chatId)
			: undefined;

		const messages = await sendScreenshot(
			file,
			chatId,
			{ sendAsDocument, sendAsPhoto },
			thread?.id,
		);

		await Promise.all(
			messages.map(({ message_id: messageId }) =>
				storeScreenshot(messageId, file),
			),
		);
	}
}

export async function sendAllUnsentFile(args: Args) {
	console.log(
		"Scanning",
		args.directory,
		"for screenshots to send to",
		args.chatId,
	);
	const sentScreenshotsHashes = getSentScreenshots().map((s) => s.hash);

	console.log(
		"Found",
		sentScreenshotsHashes.length,
		"already sent screenshots",
	);

	const fileNames = await Array.fromAsync(
		new Glob("**/*.{png,jpg}").scan({ cwd: args.directory }),
	);

	const files = await Promise.all(
		fileNames.map(async (fileName) => {
			const file = Bun.file(path.join(args.directory, fileName));
			return [await getHash(file), file] as const;
		}),
	);
	const unsentFiles = files.filter(
		([hash]) => !sentScreenshotsHashes.includes(hash),
	);

	console.log("Found", unsentFiles.length, "not yet sent screenshots");

	return Promise.all(
		unsentFiles.flatMap(async ([hash, file]) => {
			const messages = await sendScreenshot(file, args.chatId, {
				sendAsDocument: args.sendAsDocument,
				sendAsPhoto: args.sendAsPhoto,
			});

			for (const { message_id: messageId } of messages) {
				// Is not actually async so no need to map over Promises
				await storeScreenshot(messageId, file, hash);
			}
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
