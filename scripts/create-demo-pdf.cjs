const fs = require("node:fs");
const path = require("node:path");
const output = path.resolve(process.argv[2] || "samples/demo-certificate.pdf");
const stream = "BT\n/F1 22 Tf\n72 700 Td\n(ChainProof Local Demo Certificate) Tj\n/F1 12 Tf\n0 -36 Td\n(DEMO ONLY - NOT A REAL QUALIFICATION) Tj\n0 -24 Td\n(Used to demonstrate exact-byte integrity verification.) Tj\nET\n";
const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}endstream`
];
let pdf = "%PDF-1.4\n";
const offsets = [0];
objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf, "ascii")); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
const xrefOffset = Buffer.byteLength(pdf, "ascii");
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, Buffer.from(pdf, "ascii"));
console.log(`Created clearly labelled demo PDF: ${output}`);
