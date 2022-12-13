import prompts from 'prompts';
import Fuse from 'fuse.js';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

const SYNONYMS = {
  "js": "javascript",
  "rtk": "redux toolkit",
  "ts": "typescript",
  "sass": "scss",
  "tw": "tailwind",
};

const MANIFEST_URL = 'https://raw.githubusercontent.com/adiled/viter/main/manifest.json';
let manifest;

try {
  manifest = await (await fetch(MANIFEST_URL)).json();
} catch (e) {
  console.log("reading manifest: couldn't fetch remote data, now using local fallback.")
  // @todo: fallback to local file here
  manifest = fs.readFileSync('./manifest.json');
  manifest = JSON.parse(manifest);
}

console.log(manifest.length, "templates found");

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

  const queryString = await prompts({
    type: 'list',
    name: 'value',
    message: 'Type your stack away, space-separated:',
    initial: '',
    separator: ' '
  });

  let searchTerms = [];

  queryString.value
    .forEach(word => {
      let term = word.replace('-', ' ');
      term = SYNONYMS[term] ? `${SYNONYMS[term]}` : term;
      searchTerms.push(term);
    });

  console.log(`You've selected ${searchTerms.join(', ')}`);

  // is item.tokens a subset of searchTerms?

  // const wantMore = await prompts({
  //   type: 'confirm',
  //   name: 'value',
  //   message: '\nWant to choose further swag?',
  //   initial: true
  // });

  const results = fuse.search({
    $and: searchTerms.map(term => ({tokens: term}))
  });

  if (!(results && results.length)) {
    console.log("No templates found");
    process.exit();
  }
  
  let selected;
  selected = await prompts({
    type: 'select',
    name: 'value',
    message: '\nChoose a template',
    choices: results.map(({item}) => ({
      title: item.name
        + (item.stars ? ` ⭐ ${item.stars}` : '')
        + ' | ' + item.tokens.join(", "),
      value: item.url
    })),
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