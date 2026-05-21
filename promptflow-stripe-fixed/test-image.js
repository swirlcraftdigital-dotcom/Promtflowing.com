const keywords = encodeURIComponent('Creative Writing' + ' visually stunning premium digital art high resolution cinematic lighting');
const seed = Math.floor(Math.random() * 1000000);
const url = `https://image.pollinations.ai/prompt/${keywords}?width=600&height=400&nologo=true&seed=${seed}`;
console.log(url);
