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

/** Play the mp3 */
const mp3 = 'mp3.mp3';
function play() {
	const connection = joinVoiceChannel( {
		channelId: process.env.VOCAL_ID,
		guildId: process.env.GUILD_ID,
		adapterCreator: guild.voiceAdapterCreator,
	} );
	const player = createAudioPlayer();
	const resource = createAudioResource( mp3 );
	
	player.play( resource );
	connection.subscribe( player );
}

async function chatbot(string) {
	let res = await cleverbot( string, context, 'FRANCE' );
	console.log( string, context, res );
	context.push( string );
	return res;
}

const context = [];
/** On startup */
client.once( 'ready', async bot => {
	console.log( 'Bot started' );
	guild = client.guilds.cache.get( process.env.GUILD_ID );
	vocal = guild.channels.cache.get( process.env.VOCAL_ID );
} );

client.on( 'messageCreate', async message => {
	if(message.author.bot) return;
	console.log( message.channel.id, message.channel.id === '1005466814576336956' );
	if (message.channel.id === '1005466814576336956') {
		let data;
		if (message.content.startsWith( 'repeat' )) {
			data = message.content.replace( 'repeat', '' );
		} else {
			data = await chatbot( message.content );
		}
		try {
			fs.unlinkSync( 'mp3.mp3' );
			//file removed
		} catch (err) {
			console.error( err );
		}
		
		const url = googleTTS.getAudioUrl( data, {
			lang: 'fr',
			slow: false,
			host: 'https://translate.google.com',
		} );
		
		https.get( url, async (res) => {
			// Image will be stored at this path
			const filePath = fs.createWriteStream( 'mp3.mp3' );
			res.pipe( filePath );
			filePath.on( 'finish', () => {
				filePath.close();
				play();
			} );
		} );
		await message.reply( data );
	}
} );

client.login( process.env.TOKEN );