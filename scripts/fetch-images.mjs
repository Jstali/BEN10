import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, '..', 'src', 'data', 'characters.js');
const imagesPath = path.join(__dirname, '..', 'src', 'data', 'images.json');
const outputDir = path.join(__dirname, '..', 'public', 'characters');

const { default: characters } = await import(dataPath);

const loadMap = async () => {
  try {
    const raw = await readFile(imagesPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/['.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const fetchPageImage = async (endpoint, params) => {
  const url = `${endpoint}?action=query&format=json&formatversion=2&origin=*&${params}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  const page = data?.query?.pages?.[0];
  return page?.original?.source || page?.thumbnail?.source || null;
};

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const scoreTitle = (title, name) => {
  const key = normalize(name);
  const normalized = normalize(title);
  let score = 0;
  if (normalized.includes(key)) score += 10;
  if (normalized.includes('ben10')) score += 3;
  return score;
};

const fetchImageFromFileList = async (endpoint, title, name) => {
  const url = `${endpoint}?action=query&format=json&formatversion=2&origin=*&titles=${encodeURIComponent(
    title,
  )}&prop=images`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  const images = data?.query?.pages?.[0]?.images || [];
  const filtered = images
    .map((image) => image.title)
    .filter((imageTitle) => imageTitle?.startsWith('File:'))
    .filter((imageTitle) => !/logo|symbol|icon|banner|wiki|render/i.test(imageTitle))
    .sort((a, b) => scoreTitle(b, name) - scoreTitle(a, name));

  for (const imageTitle of filtered.slice(0, 5)) {
    const infoUrl = `${endpoint}?action=query&format=json&formatversion=2&origin=*&titles=${encodeURIComponent(
      imageTitle,
    )}&prop=imageinfo&iiprop=url`;
    const infoResponse = await fetch(infoUrl);
    if (!infoResponse.ok) continue;
    const info = await infoResponse.json();
    const url = info?.query?.pages?.[0]?.imageinfo?.[0]?.url;
    if (url) return url;
  }

  return null;
};

const searchImageAt = async (endpoint, name) => {
  const queries = [`${name} Ben 10`, `${name} (Ben 10)`, name];

  for (const query of queries) {
    const image = await fetchPageImage(
      endpoint,
      `generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&gsrnamespace=0&prop=pageimages&piprop=original&pithumbsize=1200`,
    );
    if (image) return image;
  }

  const titles = [
    name,
    `${name} (Ben 10)`,
    `${name} (alien)`,
    `${name} (Ben 10 alien)`,
  ];

  for (const title of titles) {
    const image = await fetchPageImage(
      endpoint,
      `titles=${encodeURIComponent(title)}&prop=pageimages&piprop=original&pithumbsize=1200`,
    );
    if (image) return image;
  }

  for (const title of titles) {
    const image = await fetchImageFromFileList(endpoint, title, name);
    if (image) return image;
  }

  return null;
};

const searchImage = async (name) => {
  const wikipedia = await searchImageAt('https://en.wikipedia.org/w/api.php', name);
  if (wikipedia) return wikipedia;

  return searchImageAt('https://ben10.fandom.com/api.php', name);
};

const downloadImage = async (url, fileBase) => {
  const response = await fetch(url);
  if (!response.ok) return null;

  const contentType = response.headers.get('content-type') || '';
  const extFromType = contentType.includes('png')
    ? 'png'
    : contentType.includes('webp')
      ? 'webp'
      : contentType.includes('jpeg') || contentType.includes('jpg')
        ? 'jpg'
        : null;

  const extFromUrl = path.extname(new URL(url).pathname).slice(1);
  const ext = extFromType || extFromUrl || 'jpg';
  const safeExt = ['png', 'jpg', 'jpeg', 'webp'].includes(ext.toLowerCase())
    ? ext.toLowerCase()
    : 'jpg';

  const buffer = Buffer.from(await response.arrayBuffer());
  const filename = `${fileBase}.${safeExt === 'jpeg' ? 'jpg' : safeExt}`;
  const filepath = path.join(outputDir, filename);
  await writeFile(filepath, buffer);
  return { filename };
};

const run = async () => {
  await mkdir(outputDir, { recursive: true });
  const imageMap = await loadMap();

  for (const character of characters) {
    if (imageMap[character.name]) continue;
    if (character.image) continue;

    const imageUrl = await searchImage(character.name);
    if (!imageUrl) continue;

    const fileBase = slugify(character.name);
    const saved = await downloadImage(imageUrl, fileBase);
    if (!saved) continue;

    imageMap[character.name] = `/characters/${saved.filename}`;
    await writeFile(imagesPath, JSON.stringify(imageMap, null, 2));
    console.log(`Saved ${character.name} -> ${saved.filename}`);
  }

  await writeFile(imagesPath, JSON.stringify(imageMap, null, 2));
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
