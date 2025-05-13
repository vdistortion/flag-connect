import { Telegraf } from 'telegraf';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { development, production } from './core';
import { start, about } from './commands';
import { greeting } from './text';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const IMAGE_SRC = process.env.IMAGE_SRC!;
const ENVIRONMENT = process.env.NODE_ENV || '';

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

bot.command('start', start(IMAGE_SRC));
bot.command('about', about());
bot.on('message', greeting());

//prod mode (Vercel)
export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
  await production(req, res, bot);
};

//dev mode
ENVIRONMENT !== 'production' && development(bot);
