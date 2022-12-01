import fetch from 'node-fetch';
import fs from 'fs';

let manifest = [];

const VITE_AWESOME_URL = 'https://raw.githubusercontent.com/vitejs/awesome-vite/master/README.md';
const MANIFEST_FILE_NAME = 'manifest.json';

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
    const [string, n, name, u, url, desc] = line.match(linePattern);
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

fs.writeFileSync(`./${MANIFEST_FILE_NAME}`, JSON.stringify(manifest));

console.log("Done writing to", MANIFEST_FILE_NAME);