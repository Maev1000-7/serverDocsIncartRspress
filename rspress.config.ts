import * as path from 'node:path';
import { defineConfig } from '@rspress/core';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  title: 'IncartDev',
  description: 'Сайт с документацией продуктов Incart',
  lang: 'ru',

  locales: [
      {
      lang: 'ru',
      label: 'Русский',
      title: 'Incart',
      description: 'Сайт на Rspress',
    }
  ],
  base: '/rspress/',

  builderConfig: {
    server: {  
      port: 9090,
    }
  }
});
