import { ExtensionContext } from 'vscode';

import * as fs from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';

import { Language, Words } from '../interface';

export const getWordWebviewHtml = (
  context: ExtensionContext,
  words: Words[]
) => {
  let html = fs.readFileSync(
    path.join(
      context.extensionPath, './src/html/word.ejs'
    )
  ).toString();

  html = ejs.render(html, { words });
  return html;
};

export const getLoadingHtml = (
  context: ExtensionContext,
) => {
  return fs.readFileSync(
    path.join(context.extensionPath, './src/html/loading.ejs')
  ).toString();
};

export const getTranslateWebviewHtml = (
  context: ExtensionContext,
  translateWords: Words[],
  languages: Language[],
) => {
  let html = fs.readFileSync(
    path.join(context.extensionPath, './src/html/translate.ejs')
  ).toString();
  html = ejs.render(html, {
    words: translateWords,
    languages: languages,
  });
  return html;
};
