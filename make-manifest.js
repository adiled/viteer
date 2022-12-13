import chalk from 'chalk';
import fetch from 'node-fetch';
import fs from 'fs';


const MANIFEST_FILE_NAME = 'manifest.json';

// do-not-use: rewrite for rate-limiting first, not feasible on public api 
async function hydrateManifest() {
  return manifest.map(async (item) => {
    let repoStats;
    try {
      repoStats = await (await fetch(`https://api.github.com/repos/${item.id}`)).json()
    } catch (e) {
    }
    console.log(repoStats);
    return {
      ...item,
      stars: repoStats?.stargazers_counts
    }
  });
}

async function makeManifest() {
  let manifest = [];

  const VITE_AWESOME_URL = 'https://raw.githubusercontent.com/vitejs/awesome-vite/master/README.md';

  const awViteMd =
    Buffer.from(
      await (
        await fetch(VITE_AWESOME_URL)
      ).arrayBuffer()
    ).toString();

  const delimeter = ['## Templates\n', '\n## '];
  const offset =  awViteMd.indexOf(delimeter[0]) + delimeter[0].length;
  const end = awViteMd.indexOf(delimeter[1], offset);
  const extract = awViteMd.substring(offset, end).trim();
  const portions = extract.split("\n#### ");

  const linePattern = /(\[(.*)\])(\((.*)\)) - (.*)/;

  portions.forEach(portion => {
    const lines = portion.trim().split('\n');
    const category = lines[0];
    manifest.push(...lines.slice(2).map(line => {
      console.log(line.match(linePattern));
      const [string, , name, , url, desc] = line.match(linePattern);
      const delimiter = /, and | and |, |\s\+\s|\+/;
      const description = desc.replace(/\.+$/, "");
      return {
        framework: category.toLowerCase(),
        name,
        url,
        id: new URL(url).pathname.slice(1),
        description,
        tokens: description.split(delimiter).map(token => token.trim().replace())
      };
    }));
  });

  console.log(chalk.greenBright('_'), `Fetched ${manifest.length} templates`);
  return manifest;
}

const manifest = await makeManifest();

fs.writeFileSync(`./${MANIFEST_FILE_NAME}`, JSON.stringify(manifest));

console.log(chalk.greenBright('_'), "Done writing to", chalk.greenBright(MANIFEST_FILE_NAME), "\n");