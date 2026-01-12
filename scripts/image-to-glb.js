/**
 * Convert 2D artwork images to GLB files for AR viewing
 *
 * Usage: node scripts/image-to-glb.js <input-image> <width-inches> <height-inches> <output-name>
 * Example: node scripts/image-to-glb.js artwork.jpg 24 36 my-painting
 *
 * This creates a flat 3D plane with the artwork as a texture,
 * sized to match real-world dimensions for true-scale AR viewing.
 */

import { Document, NodeIO, Buffer as GLTFBuffer } from '@gltf-transform/core';
import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Convert inches to meters (GLB uses meters)
const INCHES_TO_METERS = 0.0254;

async function createArtworkGLB(imagePath, widthInches, heightInches, outputName) {
  console.log(`\nConverting: ${imagePath}`);
  console.log(`Dimensions: ${widthInches}" x ${heightInches}" (${(widthInches * INCHES_TO_METERS).toFixed(3)}m x ${(heightInches * INCHES_TO_METERS).toFixed(3)}m)`);

  // Convert dimensions to meters
  const widthMeters = widthInches * INCHES_TO_METERS;
  const heightMeters = heightInches * INCHES_TO_METERS;
  const halfWidth = widthMeters / 2;
  const halfHeight = heightMeters / 2;

  // Load and process the image
  const imageBuffer = readFileSync(imagePath);
  const processedImage = await sharp(imageBuffer)
    .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();

  // Create a new glTF document
  const document = new Document();

  // Create a single buffer for all data
  const buffer = document.createBuffer();

  // Create texture from image
  const texture = document.createTexture('artwork')
    .setImage(processedImage)
    .setMimeType('image/jpeg');

  // Create material with the artwork texture
  const material = document.createMaterial('artworkMaterial')
    .setBaseColorTexture(texture)
    .setDoubleSided(true)
    .setMetallicFactor(0)
    .setRoughnessFactor(1);

  // Create the flat plane geometry
  // Vertices for a simple quad (2 triangles)
  const positions = new Float32Array([
    -halfWidth, -halfHeight, 0,  // bottom-left
     halfWidth, -halfHeight, 0,  // bottom-right
     halfWidth,  halfHeight, 0,  // top-right
    -halfWidth,  halfHeight, 0,  // top-left
  ]);

  const normals = new Float32Array([
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
  ]);

  const uvs = new Float32Array([
    0, 0,  // bottom-left
    1, 0,  // bottom-right
    1, 1,  // top-right
    0, 1,  // top-left
  ]);

  const indices = new Uint16Array([
    0, 1, 2,  // first triangle
    0, 2, 3,  // second triangle
  ]);

  // Create accessors (all using the same buffer)
  const positionAccessor = document.createAccessor('positions')
    .setType('VEC3')
    .setArray(positions)
    .setBuffer(buffer);

  const normalAccessor = document.createAccessor('normals')
    .setType('VEC3')
    .setArray(normals)
    .setBuffer(buffer);

  const uvAccessor = document.createAccessor('uvs')
    .setType('VEC2')
    .setArray(uvs)
    .setBuffer(buffer);

  const indexAccessor = document.createAccessor('indices')
    .setType('SCALAR')
    .setArray(indices)
    .setBuffer(buffer);

  // Create primitive (the actual geometry)
  const primitive = document.createPrimitive()
    .setIndices(indexAccessor)
    .setAttribute('POSITION', positionAccessor)
    .setAttribute('NORMAL', normalAccessor)
    .setAttribute('TEXCOORD_0', uvAccessor)
    .setMaterial(material);

  // Create mesh from primitive
  const mesh = document.createMesh('artworkPlane')
    .addPrimitive(primitive);

  // Create node (transform)
  const node = document.createNode('Artwork')
    .setMesh(mesh);

  // Create scene
  const scene = document.createScene('ArtworkScene')
    .addChild(node);

  document.getRoot().setDefaultScene(scene);

  // Ensure output directory exists
  const outputDir = join(__dirname, '..', 'public', 'models');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Write the GLB file
  const io = new NodeIO();
  const outputPath = join(outputDir, `${outputName}.glb`);
  await io.write(outputPath, document);

  console.log(`\nCreated: ${outputPath}`);
  console.log(`\nTo use in Model-Viewer:`);
  console.log(`<model-viewer src="/models/${outputName}.glb" ar ar-modes="webxr scene-viewer quick-look" ar-scale="fixed" camera-controls></model-viewer>`);

  return outputPath;
}

// CLI interface
const args = process.argv.slice(2);

if (args.length < 4) {
  console.log(`
Usage: node scripts/image-to-glb.js <input-image> <width-inches> <height-inches> <output-name>

Arguments:
  input-image    Path to the artwork image (jpg, png, etc.)
  width-inches   Width of the artwork in inches
  height-inches  Height of the artwork in inches
  output-name    Name for the output GLB file (without extension)

Example:
  node scripts/image-to-glb.js ./artwork.jpg 24 36 my-painting

This will create: public/models/my-painting.glb
`);
  process.exit(1);
}

const [inputImage, width, height, outputName] = args;

createArtworkGLB(inputImage, parseFloat(width), parseFloat(height), outputName)
  .then(() => console.log('\nDone!'))
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
