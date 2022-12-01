import prompts from 'prompts';
import Fuse from 'fuse.js';
import fetch from 'node-fetch';

// const GROUP = ['language', 'processing', 'styling', 'framework', 'state', 'testing', 'linting'];
// const REQUIRED = [
//   'language': {
//     label: 'Language',
//     min: 1,
//   },
//   'processing': {
//     label: 'Post-Processor '
//   }
// ]
// const THINGS = {
//   'react': ['view'],
//   'redux': ['state'],
//   'typescript': ['language'],
//   'sass': ['processing', 'styling'],
// }

const SYNONYMS = {
  "javascript": ["javascript", "js"],
  "rtk": ["redux toolkit"],
  "typescript": ["typescript", "ts"],
  "sass": ["sass", "scss"],
  "tailwind": ["tailwind", "tw"],
};

const MANIFEST_URL = 'https://raw.githubusercontent.com/adiled/viter/main/manifest.json';
const MANIGEST_URL = 'https://raw.githubusercontent.com/adiled/viter/main/manifest.json';
let manifest;

try {
  manifest = await (await fetch(MANIFEST_URL)).json()
} catch (e) {
  // @todo: fallback to local file here
  console.error("ERROR::MANIFEST_NOT_FOUND", e);
  process.exit();
}

const fuse = new Fuse(manifest, {
  includeScore: true,
  keys: ['tokens'],
  threshold: 0.001,
});

async function makeScaffolding() {
}

(async () => {

  const queryString = await prompts({
    type: 'list',
    name: 'value',
    message: 'Type your stack away, space-separated:',
    initial: '',
    separator: ' '
  });

  const searchTerms = queryString.value;

  console.log(`You've selected ${searchTerms.join(', ')}`);

  // is item.tokens a subset of searchTerms?

  const wantMore = await prompts({
    type: 'confirm',
    name: 'value',
    message: 'Want to choose further swag?',
    initial: true
  });

  const results = fuse.search({
    $and: searchTerms.map(term => ({tokens: term.replace('-',' ')}))
  });
  console.log(results.length, results.slice(0,1));

  if (wantMore) {
    console.log('not atm, soz');
  }

  makeScaffolding();
})();