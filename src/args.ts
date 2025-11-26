import {
	type ParseArgsConfig,
	type ParseArgsOptionDescriptor,
	parseArgs,
} from "node:util";

type ParseArgsConfigWithDescriptions = ParseArgsConfig & {
	options: {
		[longOption: string]: ParseArgsOptionDescriptor & {
			description?: string;
		};
	};
};

function getArgumentDescriptor<
	T extends ParseArgsConfigWithDescriptions["options"],
>(options: T) {
	const longestKey = Object.keys(options).reduce(
		(longest, key) => Math.max(longest, key.length),
		0,
	);
	const longestAlias = Object.values(options).reduce(
		(longest, values) => Math.max(longest, values.short?.length ?? 0),
		0,
	);
	const longestDescription = Object.values(options).reduce(
		(longest, values) => Math.max(longest, values.description?.length ?? 0),
		0,
	);

	const message = Object.entries(options)
		.reduce((message, [key, value]) => {
			if (!value.description) {
				return message;
			}

			let flags = "";

			if ("default" in value) {
				if (typeof value.default === "undefined") {
					flags = "(optional)";
				} else {
					flags = `(default: ${value.default})`;
				}
			}

			return [
				...message,
				`--${key.padEnd(longestKey + 1, " ")} ${(value.short ?? "").padEnd(
					longestAlias,
					" ",
				)} ${value.description.padEnd(longestDescription, " ")} ${flags}`,
			];
		}, [] as string[])
		.join("\n");

	return [options, message] as const;
}

export function parseArgsWithHelpMessage<
	T extends ParseArgsConfigWithDescriptions,
>(config: T) {
	const [options, message] = getArgumentDescriptor(
		config.options as T["options"],
	);

	const result = parseArgs({
		strict: true,
		allowNegative: true,
		allowPositionals: true,
		...config,
		options: options,
	});

	if ("help" in result.values && result.values.help) {
		console.info(message);
		process.exit(0);
	}

	let allGood = true;

	for (const [key, value] of Object.entries(config.options)) {
		if (
			!("default" in value) &&
			(!(key in result) ||
				typeof result[key as keyof typeof result] === "undefined")
		) {
			allGood = false;
			console.error(`You need to provide a value for --${key}`);
			if (value.description) {
				console.info(`--${key}:`, value.description);
			}
		}
	}

	if (!allGood) {
		process.exit(1);
	}

	return result;
}
