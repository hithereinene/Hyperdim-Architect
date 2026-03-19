async function run() {
  const res = await fetch('https://oeis.org/search?q=1%2C1%2C3%2C7%2C18%2C45&fmt=text', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const text = await res.text();
  console.log(text.substring(0, 1000));
}
run();