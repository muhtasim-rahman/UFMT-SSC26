// crypto.js
// very small reversible obfuscation for hiding URL in front-end
// NOTE: not strong crypto — it's just to avoid showing raw URL in plain text.
function encrypt(text){
  // reverse + base64
  return btoa(text.split('').reverse().join(''));
}
function decrypt(text){
  return atob(text).split('').reverse().join('');
}