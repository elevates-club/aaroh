
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfModule = require('pdf-parse');

console.log('Type of pdfModule:', typeof pdfModule);
console.log('pdfModule keys:', Object.keys(pdfModule));

const dataBuffer = fs.readFileSync('/Users/sarhanqadir/Desktop/antigravity/aaroh/AAROH 2026 OFF STAGE LIST..pdf');

// Try calling if it's a function, or properties
if (typeof pdfModule === 'function') {
    pdfModule(dataBuffer).then(function (data) {
        console.log(data.text);
    });
} else if (typeof pdfModule.default === 'function') {
    pdfModule.default(dataBuffer).then(function (data) {
        console.log(data.text);
    });
} else {
    console.log('Could not find pdf function');
}
