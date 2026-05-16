#!/usr/bin/env node

/**
 * Migration script to rename existing accreditation files to include company names
 * Changes format from: {companyId}/{certificationType}/{timestamp}.{ext}
 * To format: {companyName}/{certificationType}/{timestamp}.{ext}
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateAccreditationPaths() {
  console.log('🚀 Starting accreditation file path migration...\n');

  try {
    // Step 1: List all files in accreditations bucket
    console.log('📋 Fetching all files from accreditations bucket...');
    const { data: files, error: listError } = await supabase.storage
      .from('accreditations')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (listError) {
      console.error('❌ Error listing files:', listError);
      process.exit(1);
    }

    console.log(`✅ Found ${files.length} items in bucket\n`);

    const fileUpdates = [];
    const urlUpdates = [];

    // Step 2: Process each item (folder or file)
    for (const item of files) {
      if (item.id) {
        // It's a folder
        const companyId = item.name;
        console.log(`📁 Processing folder: ${companyId}`);

        try {
          // Fetch company name from database
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('name, id')
            .eq('id', companyId)
            .single();

          if (companyError) {
            console.warn(`⚠️  Could not find company ${companyId}, skipping folder`);
            continue;
          }

          if (!company) {
            console.warn(`⚠️  Company ${companyId} not found in database, skipping`);
            continue;
          }

          // Sanitize company name
          const sanitizedName = company.name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');

          const newFolderName = `${sanitizedName}`;

          // If folder name is already in new format, skip it
          if (item.name.includes('_')) {
            console.log(`✓ Already migrated: ${item.name}\n`);
            continue;
          }

          console.log(`  Company: ${company.name}`);
          console.log(`  New folder name: ${newFolderName}`);

          // List files in this company folder
          const { data: certFiles, error: certError } = await supabase.storage
            .from('accreditations')
            .list(companyId, { limit: 100 });

          if (certError) {
            console.warn(`⚠️  Error listing files in ${companyId}:`, certError.message);
            continue;
          }

          // Process each certificate type folder
          for (const certFolder of certFiles) {
            if (certFolder.id) {
              // It's a certificate type folder
              const certificationType = certFolder.name;

              // List actual files in certificate folder
              const { data: actualFiles, error: filesError } = await supabase.storage
                .from('accreditations')
                .list(`${companyId}/${certificationType}`, { limit: 100 });

              if (filesError) {
                console.warn(`⚠️  Error listing files in ${companyId}/${certificationType}`);
                continue;
              }

              // Move each file
              for (const file of actualFiles) {
                if (!file.id) {
                  // It's a file, not a folder
                  const oldPath = `${companyId}/${certificationType}/${file.name}`;
                  const newPath = `${newFolderName}/${certificationType}/${file.name}`;

                  console.log(`    Moving: ${oldPath}`);
                  console.log(`         → ${newPath}`);

                  // Download the file
                  const { data: fileData, error: downloadError } = await supabase.storage
                    .from('accreditations')
                    .download(oldPath);

                  if (downloadError) {
                    console.warn(`⚠️  Error downloading ${oldPath}:`, downloadError.message);
                    continue;
                  }

                  // Upload to new location
                  const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('accreditations')
                    .upload(newPath, fileData);

                  if (uploadError) {
                    console.warn(`⚠️  Error uploading to ${newPath}:`, uploadError.message);
                    continue;
                  }

                  // Delete old file
                  const { error: deleteError } = await supabase.storage
                    .from('accreditations')
                    .remove([oldPath]);

                  if (deleteError) {
                    console.warn(`⚠️  Error deleting ${oldPath}:`, deleteError.message);
                    continue;
                  }

                  console.log(`    ✅ Moved successfully`);

                  // Track old and new URLs for database updates
                  const oldUrl = `${supabaseUrl}/storage/v1/object/public/accreditations/${oldPath}`;
                  const newUrl = `${supabaseUrl}/storage/v1/object/public/accreditations/${newPath}`;

                  urlUpdates.push({
                    oldUrl,
                    newUrl,
                    companyId,
                  });
                }
              }
            }
          }

          console.log(`✓ Completed folder: ${companyId}\n`);
        } catch (error) {
          console.error(`❌ Error processing folder ${companyId}:`, error.message);
        }
      }
    }

    // Step 3: Update database URLs
    if (urlUpdates.length > 0) {
      console.log(`\n📊 Updating database URLs for ${urlUpdates.length} files...\n`);

      const certificateColumns = [
        { column: 'aep_certificate_url', field: 'aep' },
        { column: 'iso_45001_certificate_url', field: 'iso_45001' },
        { column: 'totika_certificate_url', field: 'totika' },
        { column: 'she_prequal_certificate_url', field: 'she_prequal' },
        { column: 'chas_certificate_url', field: 'chas' },
        { column: 'nzta_certificate_url', field: 'nzta' },
        { column: 'worksafe_certificate_url', field: 'worksafe' },
      ];

      for (const update of urlUpdates) {
        // Find which column contains the old URL
        for (const certInfo of certificateColumns) {
          const { data: company, error: fetchError } = await supabase
            .from('companies')
            .select(certInfo.column)
            .eq('id', update.companyId)
            .single();

          if (!fetchError && company && company[certInfo.column] === update.oldUrl) {
            // Update this column
            const { error: updateError } = await supabase
              .from('companies')
              .update({ [certInfo.column]: update.newUrl })
              .eq('id', update.companyId);

            if (updateError) {
              console.warn(`⚠️  Error updating ${certInfo.column}:`, updateError.message);
            } else {
              console.log(`✅ Updated ${certInfo.field} URL for company ${update.companyId}`);
            }
            break;
          }
        }
      }
    }

    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

migrateAccreditationPaths();
