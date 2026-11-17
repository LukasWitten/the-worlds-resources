/**
 * Validates GeoJSON files against core schema rules
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = './data/geojson';

function validateGeoJsonFiles(dir) {
  let errorsCount = 0;
  let filesChecked = 0;

  function scan(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.name.endsWith('.geojson') || entry.name.endsWith('.json')) {
        filesChecked++;
        try {
          const raw = fs.readFileSync(fullPath, 'utf-8');
          const data = JSON.parse(raw);
          if (data.type !== 'FeatureCollection') {
            console.error(`[FAIL] ${fullPath}: Root must be a FeatureCollection`);
            errorsCount++;
            continue;
          }
          if (!Array.isArray(data.features)) {
            console.error(`[FAIL] ${fullPath}: features must be an array`);
            errorsCount++;
            continue;
          }
          for (let i = 0; i < data.features.length; i++) {
            const f = data.features[i];
            if (!f.properties || !f.properties.id || !f.properties.name || !f.properties.type) {
              console.error(`[FAIL] ${fullPath} (feature ${i}): missing required properties (id, name, type)`);
              errorsCount++;
            }
          }
          console.log(`[PASS] ${fullPath} (${data.features.length} features)`);
        } catch (err) {
          console.error(`[ERROR] Parsing ${fullPath}:`, err.message);
          errorsCount++;
        }
      }
    }
  }

  scan(dir);
  console.log(`\nValidation complete: ${filesChecked} files checked, ${errorsCount} errors found.`);
  if (errorsCount > 0) process.exit(1);
}

validateGeoJsonFiles(DATA_DIR);
