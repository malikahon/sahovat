import { pool } from '../config/database';

const seedDatabase = async (): Promise<void> => {
  try {
    console.log('Starting database seed...');

    // Create initial admin user
    const adminPhoneNumber = '+998901234567';
    const adminDisplayName = 'Admin';

    const query = `
      INSERT INTO users (
        phone_number,
        display_name,
        is_verified,
        is_admin,
        verification_status,
        language_preference,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        NOW(),
        NOW()
      )
      ON CONFLICT (phone_number) DO NOTHING
      RETURNING id, phone_number, display_name, is_admin;
    `;

    const result = await pool.query(query, [
      adminPhoneNumber,
      adminDisplayName,
      true, // is_verified
      true, // is_admin
      'approved', // verification_status
      'uz', // language_preference
    ]);

    if (result.rows.length > 0) {
      const admin = result.rows[0];
      console.log('✓ Admin user created successfully:');
      console.log(`  ID: ${admin.id}`);
      console.log(`  Phone: ${admin.phone_number}`);
      console.log(`  Name: ${admin.display_name}`);
      console.log(`  Is Admin: ${admin.is_admin}`);
    } else {
      console.log('✓ Admin user already exists, skipping creation');
    }

    console.log('Database seed completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Run seed if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

export default seedDatabase;
