import { pool } from '../config/database';
import fs from 'fs';
import path from 'path';

const migrationsDirectory = path.join(__dirname, 'migrations');

interface MigrationRecord {
  id: string;
  name: string;
  executed_at: Date;
}

const initializeMigrationsTable = async (): Promise<void> => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ Migrations table initialized');
  } catch (error) {
    console.error('Error initializing migrations table:', error);
    throw error;
  }
};

const getExecutedMigrations = async (): Promise<string[]> => {
  try {
    const result = await pool.query(`
      SELECT name FROM _migrations ORDER BY executed_at ASC;
    `);
    return result.rows.map((row: MigrationRecord) => row.name);
  } catch (error) {
    console.error('Error retrieving executed migrations:', error);
    throw error;
  }
};

const recordMigration = async (migrationName: string): Promise<void> => {
  try {
    await pool.query(`
      INSERT INTO _migrations (name) VALUES ($1);
    `, [migrationName]);
  } catch (error) {
    console.error(`Error recording migration ${migrationName}:`, error);
    throw error;
  }
};

const getMigrationFiles = (): string[] => {
  try {
    const files = fs.readdirSync(migrationsDirectory);
    return files
      .filter((file) => file.endsWith('.sql'))
      .sort();
  } catch (error) {
    console.error('Error reading migration files:', error);
    throw error;
  }
};

const readMigrationFile = (fileName: string): string => {
  const filePath = path.join(migrationsDirectory, fileName);
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading migration file ${fileName}:`, error);
    throw error;
  }
};

const runMigrations = async (): Promise<void> => {
  let client;
  try {
    console.log('Starting database migrations...\n');

    // Initialize migrations table
    await initializeMigrationsTable();

    // Get list of executed migrations
    const executedMigrations = await getExecutedMigrations();
    console.log(`Found ${executedMigrations.length} previously executed migration(s)\n`);

    // Get list of migration files
    const migrationFiles = getMigrationFiles();
    console.log(`Found ${migrationFiles.length} migration file(s)\n`);

    // Execute pending migrations
    let executedCount = 0;
    for (const migrationFile of migrationFiles) {
      if (executedMigrations.includes(migrationFile)) {
        console.log(`⊘ ${migrationFile} (already executed)`);
        continue;
      }

      try {
        console.log(`→ Running ${migrationFile}...`);

        const migrationSQL = readMigrationFile(migrationFile);

        // Execute migration
        await pool.query(migrationSQL);

        // Record migration
        await recordMigration(migrationFile);

        console.log(`✓ ${migrationFile} executed successfully\n`);
        executedCount++;
      } catch (error) {
        console.error(`✗ Error executing migration ${migrationFile}:`, error);
        throw error;
      }
    }

    if (executedCount === 0) {
      console.log('No pending migrations to execute.');
    } else {
      console.log(`\n✓ Successfully executed ${executedCount} migration(s)`);
    }

    console.log('Database migrations completed successfully!');
  } catch (error) {
    console.error('Migration process failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

export default runMigrations;
