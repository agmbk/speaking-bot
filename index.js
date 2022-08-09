/** Required */
import cleverbot from 'cleverbot-free';
import * as googleTTS from 'google-tts-api';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import {
	joinVoiceChannel,
	createAudioResource,
	StreamType,
	entersState,
	VoiceConnectionStatus,
	AudioPlayer,
} from '@discordjs/voice';
import dot_env from 'dotenv';
import { Stream } from "stream";

dot_env.config();

/** Bot init */
let intents = [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates];
let partials = [Partials.Channel, Partials.GuildMember, Partials.Message];

const client = new Client({
	intents: intents,
	partials: partials,
});

let guild;
let vocal;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let auto = false;
let speak = true;

let voiceConnection;
const audioPlayer = new AudioPlayer();

/** Play the audio */
async function play(stream) {
	if (!voiceConnection || voiceConnection.state.status == VoiceConnectionStatus.Disconnected) {
		voiceConnection = joinVoiceChannel({
			channelId: process.env.VOCAL_ID,
			guildId: process.env.GUILD_ID,
			adapterCreator: guild.voiceAdapterCreator,
		});
		voiceConnection = await entersState(voiceConnection, VoiceConnectionStatus.Ready, 5_000);
	}

	if (voiceConnection.state.status == VoiceConnectionStatus.Ready) {
		let audioRessource = createAudioResource(stream, { inputType: StreamType.Arbitrary, inlineVolume: true });

		audioPlayer.subscribe(voiceConnection);
		audioPlayer.play(audioRessource);
	}
}

async function chatbot(a) {
	if (context.length > 20) {
		context.shift();
	}
	let b = await cleverbot(a, context, 'FRANCE');
	return context.push(a), b;
}

let context = [];
/** On startup */
client.once('ready', () => {
	console.log('Bot started');
	guild = client.guilds.cache.get(process.env.GUILD_ID);
	vocal = guild.channels.cache.get(process.env.VOCAL_ID);
});

client.on('messageCreate', async message => {
	if (message.channel.id === process.env.CHAT_ID) {
		try {
			if (message.content.includes('`') || message.content === 'disable auto mode') return;
			if (message.author.bot) {
				if (auto) {
					let b = message.reference.messageId;
					b && await delay(new Date().getTime() - message.createdTimestamp + 5e3);
				} else {
					return;
				}
			} else {
				if (message.content.startsWith('auto')) {
					auto = !auto;
					if (auto) {
						await message.reply('`Speak to itself : enabled`');
						await message.reply(await chatbot(message.content.replace('auto', '')));
					} else { await message.reply('`Speak to itself : disabled`'); }
					return;
				} else if ('speak' === message.content) {
					speak = !speak;
					if (speak) {
						await message.reply('`Voice output : enabled`');
					} else { await message.reply('`Voice output : disabled`'); }
					return;
				} else if ('help' === message.content) {
					await message.reply('**Commands**\n`speak` (Voice output toggle)\n`auto` + starting message (Bot reply to itself from starting message)\n`repeat` + message (Bot will repeat message)');
					return;
				} else if ('reset' === message.content) {
					context = [];
					await message.reply('`Conversation reset`');
					return;
				} else if (auto) {
					await message.reply('`disable auto mode to speak`');
					return;
				}

			}
			let a = message.content;
			if (a.startsWith('repeat')) {
				a = a.replace('repeat', '');
			} else {
				a = await chatbot(message.content);
			}
			let slow = a.includes('*');
			a = a.replace(/[^a-zA-Z0-9âéêèîôûç \n]+/g, '');
			if (speak && a.length < 200) {
				await googleTTS.getAudioBase64(a, { lang: "fr", slow, host: 'https://translate.google.com' }).then(base64 => {
					const audioBinaryStream = new Stream.Readable();
					audioBinaryStream.push(Buffer.from(base64, 'base64'));
					audioBinaryStream.push(null);
					return audioBinaryStream;
				}).then(play);
			}
			await message.reply(a);
		} catch (error) {
			console.error(error);
			await message.reply('J`\'ai crashé :(' + error)
		}
	}
});

client.login(process.env.TOKEN);