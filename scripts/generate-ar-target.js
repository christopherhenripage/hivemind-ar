#!/usr/bin/env node
/**
 * AR Target Generator Helper
 *
 * This script helps prepare AR target files for MindAR.
 *
 * Steps to generate a .mind file:
 * 1. Convert target.svg to target.png (or use any high-contrast image)
 * 2. Go to MindAR Image Target Compiler: https://hiukim.github.io/mind-ar-js-doc/tools/compile
 * 3. Upload your target image
 * 4. Download the generated .mind file
 * 5. Save it as public/ar/targets/targets.mind
 *
 * For quick testing, this script downloads a sample .mind file.
 */

import { writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

async function main() {
  console.log('\n=== AR Target Generator ===\n');

  const targetDir = resolve(ROOT, 'public/ar/targets');
  const mindFile = resolve(targetDir, 'targets.mind');

  // Check if .mind file already exists
  if (existsSync(mindFile)) {
    console.log('targets.mind already exists at:', mindFile);
    console.log('\nTo regenerate, delete the file and run this script again.');
    return;
  }

  console.log('Downloading sample MindAR target file for testing...\n');

  try {
    // Download the sample .mind file from MindAR examples
    const sampleUrl = 'https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/card-example/card.mind';

    const response = await fetch(sampleUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    writeFileSync(mindFile, Buffer.from(buffer));

    console.log('Downloaded sample targets.mind to:', mindFile);
    console.log('\nNOTE: This is a sample target (credit card sized image).');
    console.log('For production, generate your own .mind file:');
    console.log('1. Go to: https://hiukim.github.io/mind-ar-js-doc/tools/compile');
    console.log('2. Upload your target image (e.g., export target.svg as PNG)');
    console.log('3. Download and replace targets.mind');

    // Also download the sample target image
    const sampleImageUrl = 'https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/card-example/card.png';
    const imageResponse = await fetch(sampleImageUrl);
    if (imageResponse.ok) {
      const imageBuffer = await imageResponse.arrayBuffer();
      writeFileSync(resolve(targetDir, 'sample-target.png'), Buffer.from(imageBuffer));
      console.log('\nAlso downloaded sample-target.png for reference.');
    }

    console.log('\n=== Done ===\n');

  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nManual steps to create targets.mind:');
    console.log('1. Go to: https://hiukim.github.io/mind-ar-js-doc/tools/compile');
    console.log('2. Upload any high-contrast image');
    console.log('3. Save the downloaded file as: public/ar/targets/targets.mind');
    process.exit(1);
  }
}

main();
