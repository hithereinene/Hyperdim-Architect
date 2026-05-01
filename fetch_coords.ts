import https from 'https';
import fs from 'fs';

https.get('https://en.wikipedia.org/wiki/Runcinated_120-cells', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    fs.writeFileSync('wiki.html', data);
    console.log("Done");
  });
});
