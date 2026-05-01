import https from 'https';

https.get('https://www.qfbox.info/4d/crf', (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log(data.substring(0, 1000));
    });
});
