// Builds the prototype into one self-contained page (dist/practice-system.html) for publishing.
const result = await Bun.build({
  entrypoints: ['./src/main.tsx'],
  target: 'browser',
  minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
});
if (!result.success) {
  console.error(result.logs);
  process.exit(1);
}
// pdf-lib keeps a few U+FFFD characters in string literals; write them as escapes so the page has none.
const js = (await result.outputs[0].text()).replace(/<\/script/gi, '<\\/script').replace(/\uFFFD/g, '\\uFFFD');
const css = await Bun.file('./src/ui/styles.css').text();

const html = `<meta charset="utf-8">
<title>FD on Call Practice System</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=JetBrains+Mono:wght@500&family=Source+Sans+3:wght@400;600&display=swap">
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${js}
</script>
`;
await Bun.write('./dist/practice-system.html', html);
console.log(`dist/practice-system.html ${(html.length / 1024).toFixed(0)} KB`);
