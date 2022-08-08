/** Required */
import fs from 'fs';
import cleverbot from 'cleverbot-free';
import * as googleTTS from 'google-tts-api';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import {
	joinVoiceChannel,
	createAudioResource,
	createAudioPlayer,
} from '@discordjs/voice';
import dot_env from 'dotenv';
import https from 'https';

dot_env.config();

/** Bot init */
let intents = [];
for (const [key, value] of Object.entries( GatewayIntentBits )) {
	if (Number.isInteger( value )) {
		intents.push( value );
	}
}
let partials = [];
for (const [key, value] of Object.entries( Partials )) {
	if (Number.isInteger( value )) {
		partials.push( value );
	}
}
const client = new Client( {
	intents: intents,
	partials: partials,
} );
let guild;
let vocal;
const delay = ms => new Promise( resolve => setTimeout( resolve, ms ) );
let auto = false;
let speak = false;

/** Play the audio */
fs.existsSync( './audio' ) || fs.mkdirSync( './audio' )
const mp3 = './audio/.mp3';

function play() {
	let b = joinVoiceChannel( {
		channelId: process.env.VOCAL_ID,
		guildId: process.env.GUILD_ID,
		adapterCreator: guild.voiceAdapterCreator,
	} ), a = createAudioPlayer(), c = createAudioResource( mp3 );
	a.play( c ), b.subscribe( a );
}

async function chatbot(a) {
	if (context.length > 20) {
		context.shift();
	}
	let b = await cleverbot( a, context, 'FRANCE' );
	return context.push( a ), b;
}

let context = [];
/** On startup */
client.once( 'ready', async bot => {
	console.log( 'Bot started' );
	guild = client.guilds.cache.get( process.env.GUILD_ID );
	vocal = guild.channels.cache.get( process.env.VOCAL_ID );
} );

client.on( 'messageCreate', async message => {
	if (message.channel.id === '1005466814576336956') {
		try {
		if (message.content.includes('`') || message.content === 'disable auto mode') return;
		if (message.author.bot) {
			if (auto) {
				let b = message.reference.messageId;
				b && await delay( new Date().getTime() - message.createdTimestamp + 5e3 );
			} else {
				return;
			}
		} else {
			if (message.content.startsWith('auto')) {
				auto = !auto;
				if (auto) {
					await message.reply( '`Speak to itself : enabled`' );
					await message.reply(  await chatbot( message.content.replace('auto', '') ) );
				} else {await message.reply( '`Speak to itself : disabled`' );}
				return;
			} else if ('speak' === message.content) {
				speak = !speak;
				if (speak) {
					await message.reply( '`Voice output : enabled`' );
				} else {await message.reply( '`Voice output : disabled`' );}
				return;
			} else if ('help' === message.content) {
				await message.reply( '**Commands**\n`speak` (Voice output toggle)\n`auto` + starting message (Bot reply to itself from starting message)\n`repeat` + message (Bot will repeat message)' );
				return;
			} else if ('reset' === message.content) {
				context = [];
				await message.reply( '`Conversation reset`' );
				return;
		}else if (auto) {
				await message.reply( '`disable auto mode to speak`' );
				return;
			}
			
		}
		let a = message.content;
		if (a.startsWith( 'repeat' )) {
			a = a.replace( 'repeat', '' );
		} else {
			a = await chatbot( message.content );
		}
		let slow = a.includes( '*' );
		a = a.replace( /[^a-zA-Z0-9âéêèîôûç \n]+/g, '' );
		if (speak && a.length < 200) {
			try {fs.unlinkSync( mp3 );} catch {}
			https.get( googleTTS.getAudioUrl( a, {
				lang: 'fr',
				slow: slow,
				host: 'https://translate.google.com',
			} ), async (res) => {
				const filePath = fs.createWriteStream( mp3 );
				res.pipe( filePath );
				filePath.on( 'finish', () => {
					filePath.close();
					play();
				} );
			} );
		}
		await message.reply( a );
	} catch {
		await message.reply( 'J`\'ai crashé :(' )
		}
	}
} );

client.login( process.env.TOKEN );