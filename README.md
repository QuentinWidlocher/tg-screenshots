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

I made this bot specifically for myself.

I wanted to be able to screenshot my games with my controller and have access to the screenshots at any time so this is what I did :

- Created a group with topics enables
- Added the bot with topic management rights
- Ran this tool on my Windows machine in `Pictures\Screenshots`
- Binded a shortcut on my controller (with reWASD) to `WIN+PrtScr` so it saves the screenshot in the folder above
- Added a simple script to my game launcher [Playnite](https://playnite.link/) to write the running game name in `Pictures\game.txt`

*After game is started running.*
```powershell
$game.name | Out-File -FilePath C:\Users\<me>\Pictures\Screenshots\game.txt
```

*After game has stopped running.*
```powershell
"" | Out-File -FilePath C:\Users\<me>\Pictures\Screenshots\game.txt
```

- Added a task in the Task Scheduler to run the tool hidden at startup

```
tgscreenshots --chatId=-0000000000000 --threadNameFile=game.txt
```
