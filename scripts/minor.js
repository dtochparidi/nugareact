var fs = require('fs');

var path = __dirname.split('/');
path.pop();
path = path.join('/');
path += '/src/CurrentVersion.json';

console.log(path);

var currentVersion = JSON.parse(fs.readFileSync(path));

let { major, minor, patch } = currentVersion;

minor++;
patch = 0;

const newFile = JSON.stringify({ major, minor, patch });
fs.writeFileSync(path, newFile);
