import prompts from 'prompts';
import Fuse from 'fuse.js';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';

const SYNONYMS = {
  "js": "javascript",
  "rtk": "redux toolkit",
  "ts": "typescript",
  "sass": "scss",
  "tw": "tailwind",
};

const MANIFEST_URL = 'https://raw.githubusercontent.com/adiled/viter/main/manifest.json';
/**
 * @type {{ framework: string, url: string, id: string, description: string }}
 */
let manifest;

try {
  manifest = await (await fetch(MANIFEST_URL)).json();
} catch (e) {
  console.log("reading manifest: couldn't fetch remote data, now using local fallback.")
  // @todo: fallback to local file here
  manifest = fs.readFileSync('./manifest.json');
  manifest = JSON.parse(manifest);
}

const fuse = new Fuse(manifest, {
  includeScore: true,
  keys: ['tokens'],
  threshold: 0.001,
});

async function makeScaffolding(repoId, name) {
  const degit = spawn("degit", [repoId, name], {
    cwd: process.cwd()
  });
  degit.stdout.on("data", function (data) {
    console.log(data.toString());
  });
  degit.stderr.on("data", function (err) {
    console.log(err.toString());
  });
}

(async () => {

  const thisPackage = JSON.parse(await fs.readFileSync('./package.json'));

  console.log(
    `\n${thisPackage.name}@${thisPackage.version}\n${thisPackage.description}`,
    `\n\n${manifest.length} templates available`,
    '\n'
  );

  const searchPrompt = async () => {
    const words = (initial = '') => {
      return prompts({
        type: 'list',
        name: 'value',
        message: 'Type your stack away, space-separated:',
        initial: 'react ts rtk',
        separator: ' ',
        validate: value => value.length < 1 ? 'nothing? come on! try \'vanilla\'' : true
      });
    }

    let searchTerms = [];
    let results = [];
    let lastValue = '';

    while (!results.length) {
      const list = (await words(lastValue)).value;
      list.forEach(word => {
        let term = word.replace('-', ' ');
        term = SYNONYMS[term] ? `${SYNONYMS[term]}` : term;
        searchTerms.push(term);
      });

      console.log(searchTerms);

      results = fuse.search({
        $and: searchTerms.map(term => ({tokens: term}))
      });

      if (!results.length) {
        console.log('No full match, try with less!');
      }
      lastValue = list;
      searchTerms = [];
    }

    return results;
  }

  // const wantMore = await prompts({
  //   type: 'confirm',
  //   name: 'value',
  //   message: '\nWant to choose further swag?',
  //   initial: true
  // });

  let results = await searchPrompt();

  const choices = results.map(({ item }) => ({
    title: chalk.yellowBright('* ' + item.name + ' ')
      + (item.stars ? ` ⭐ ${item.stars}` : ''),
    description: item.tokens.join(", ").toLowerCase(),
    value: item.url
  }));

  const funnel = new Fuse(choices, {
    includeScore: true,
    keys: ['description'],
    threshold: 0.6,
  });

  const suggest = async (input) => {
    return (!input)
      ? choices
      : funnel.search(input).map(({ item }) => item);
  }
  
  let selected = await prompts({
    type: 'autocomplete',
    name: 'value',
    message: '\nChoose a template (type to narrow down)',
    choices,
    suggest,
    initial: 1
  });

  const id = results
    .find(r => r.item.url === selected.value)
    .item.id;
  
  const { name } = await prompts({
    type: 'text',
    name: 'name',
    message: '\nYour project directory name'
  });

  console.log(selected, id);
  makeScaffolding(id, name);
})();