import fs from 'node:fs/promises';
import QRCode from 'qrcode';
import sharp from 'sharp';
const directory = new URL('./fixtures/', import.meta.url);
await fs.mkdir(directory,{recursive:true});
const values = {
  url: 'http://127.0.0.1:3012/r/scanner-no-match',
  qrs: 'https://qr-s.ru/r/scanner-demo-not-a-real-code',
  text: 'Демонстрационный текст. Ссылка сама не открывается.',
  wifi: 'WIFI:T:WPA;S:Preview\\; Guest;P:demo\\;password;;',
  vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:Тестовый контакт\nTEL:+79990000000\nEMAIL:scanner@example.test\nEND:VCARD',
  unsafe: 'javascript:alert(1)',
};
for (const [name,value] of Object.entries(values)) {
  await fs.writeFile(new URL(`${name}.png`,directory),await QRCode.toBuffer(value,{width:600,margin:4,errorCorrectionLevel:'H'}));
}
await sharp(new URL('url.png',directory).pathname).rotate(17,{background:'white'}).blur(0.5).toFile(new URL('angled.png',directory).pathname);
await sharp({create:{width:600,height:400,channels:3,background:'white'}}).png().toFile(new URL('blank.png',directory).pathname);
await fs.writeFile(new URL('not-image.txt',directory),'This is a text file, not an image.');
await fs.writeFile(new URL('expected.json',directory),JSON.stringify(values,null,2));
