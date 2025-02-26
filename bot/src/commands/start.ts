import { Context, Input } from 'telegraf';
import createDebug from 'debug';
import countries from '../../../site/src/countries.json';

const debug = createDebug('bot:about_command');

const start = () => async (ctx: Context) => {
  const message = 'Выберите тест:';
  debug(`Triggered "about" command with message \n${message}`);
  await ctx.replyWithMarkdownV2(message, { parse_mode: 'Markdown' });
  await ctx.replyWithPhoto(Input.fromURL(process.env.IMAGE_SRC + countries[0].flag[0]));
};

export { start };
