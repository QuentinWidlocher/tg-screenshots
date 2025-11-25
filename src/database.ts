import { Database } from "bun:sqlite";
import type { EmptyObject, UnionToTuple } from "type-fest";

const db = new Database("db.sqlite", { create: true });

db.run(
	`create table if not exists screenshots (messageId integer primary key, hash text not null, sentAt integer not null)`,
);

db.run(
	`create table if not exists threads (id integer primary key, name text not null)`,
);

const storeScreenshotQuery = db.query<void, ScreenshotInsert>(
	`insert into screenshots (messageId, hash, sentAt) values ($messageId, $hash, $sentAt)`,
);

const getScreenshotByHashQuery = db.query<
	ScreenshotRow,
	Pick<ScreenshotInsert, "$hash">
>(`select * from screenshots where hash = $hash limit 1`);

const getSentScreenshotsQuery = db.query<ScreenshotRow, EmptyObject>(
	`select * from screenshots order by sentAt desc`,
);

const getThreadByNameQuery = db.query<Thread, Pick<ThreadInsert, "$name">>(
	`select * from threads where name = $name`,
);

const storeThreadQuery = db.query<void, ThreadInsert>(
	`insert into threads (id, name) values ($id, $name)`,
);

export type Screenshot = {
	messageId: number;
	hash: string;
	sentAt: Date;
};

export type ScreenshotRow = {
	messageId: number;
	hash: string;
	sentAt: number;
};

type ScreenshotInsert = {
	[k in UnionToTuple<
		{
			[k in keyof ScreenshotRow]: [`$${k}`, ScreenshotRow[k]];
		}[keyof ScreenshotRow]
	>[number] as k[0]]: k[1];
};

export type Thread = {
	id: number;
	name: string;
};

export type ThreadRow = Thread;

type ThreadInsert = {
	[k in UnionToTuple<
		{
			[k in keyof ThreadRow]: [`$${k}`, ThreadRow[k]];
		}[keyof ThreadRow]
	>[number] as k[0]]: k[1];
};

export async function getHash(file: Bun.BunFile) {
	return Bun.hash.crc32(await file.arrayBuffer()).toString();
}

export async function storeScreenshot(
	messageId: Screenshot["messageId"],
	file: Bun.BunFile,
	hash?: Screenshot["hash"],
) {
	console.log("Marking", file.name, "as sent");

	storeScreenshotQuery.run({
		$messageId: messageId,
		$hash: hash ?? (await getHash(file)),
		$sentAt: Date.now(),
	});
}

export function getScreenshotByHash(hash: Screenshot["hash"]) {
	return getScreenshotByHashQuery.get({ $hash: hash });
}

export function getSentScreenshots() {
	return getSentScreenshotsQuery.all({});
}

export function storeThread(thread: Thread) {
	storeThreadQuery.run({
		$id: thread.id,
		$name: thread.name,
	});
}

export function getThreadByName(name: Thread["name"]) {
	return getThreadByNameQuery.get({ $name: name });
}
