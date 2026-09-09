import type {
	AutocompleteInteraction,
	ButtonInteraction,
	ChatInputCommandInteraction,
	ClientEvents,
	Collection,
	SlashCommandBuilder,
	SlashCommandOptionsOnlyBuilder,
	SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
export type SlashCommand = {
	command:
		| SlashCommandBuilder
		| SlashCommandOptionsOnlyBuilder
		| SlashCommandSubcommandsOnlyBuilder;
	execute: (i: ChatInputCommandInteraction) => Promise<unknown> | unknown;
	autocomplete?: (i: AutocompleteInteraction) => Promise<unknown> | unknown;
};
export type ButtonCommand = {
	prefix: string;
	execute: (i: ButtonInteraction) => Promise<unknown> | unknown;
};
export type BotEvent<N extends keyof ClientEvents = keyof ClientEvents> = {
	name: N;
	once?: boolean;
	execute: (...args: ClientEvents[N]) => void;
};
declare module "discord.js" {
	interface Client {
		commands: Collection<string, SlashCommand>;
		buttons: Collection<string, ButtonCommand>;
	}
}
