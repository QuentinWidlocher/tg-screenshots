# tg-screenshots

Send your screenshots to a telegram channel/group automatically.

## Stack
- [GramIO](https://gramio.dev/)
- [Biome](https://biomejs.dev/)
- [Bun](https://bun.com/)

## Requirements

You'll need to install [Bun](https://bun.com/) to compile the executable.

## Usage

- Create a bot [(see here)](https://core.telegram.org/bots/tutorial#obtain-your-bot-token) and copy its token.
- Clone the repo, add the token in a `.env` file and run `bun install`
- Build the executable with `bun run build` (or `bun run build:win` for windows)
- Put the executable in your screenshots folder and run it, the bot will start
- Add the bot in a channel or a group then send a message if nothing happens
- The bot should give you a negative number, it's your chat id.
- Rerun the executable with your chat id `tgscreenshots --chatId=-0000000000000` and every screenshots you add in this folder will be sent to the group/channel without compressions.

> [!INFO]
> You can configure the tool, run `tgscreenshots --help` to learn more

## How I use it

I made this bot specifically for myself, I want to have access to my screenshots at any time so this is what I did :

- Ran this tool on my Windows machine in `Pictures\Screenshots`
- Binded a shortcut on my controller (with reWASD) to `WIN+PrtScr` so it saves the screenshot in the folder above
- Added a task in the Task Scheduler to run the tool hidden at startup
