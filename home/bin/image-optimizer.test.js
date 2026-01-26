// home/scripts/image-optimizer.test.js
const sharp = require('sharp');
const { downloadAndOptimize } = require('./image-optimizer.js');

async function testOptimize() {
  const testUrl = 'https://picsum.photos/300';
  const outputPath = './test-output';

  const result = await downloadAndOptimize(testUrl, outputPath, 'test-image');
  console.log('Optimization result:', result);

  // Cleanup
  const fs = require('fs');
  fs.rmSync(outputPath, { recursive: true, force: true });
}

testOptimize();
