const runMigrations = async (db) => {
    console.log('🔄 Running simple migrations...');
    
    await new Promise((resolve, reject) => {
        db.run(`
            ALTER TABLE users 
            ADD COLUMN profile_pic TEXT
        `, (err) => {
            if (err && !err.message.includes('duplicate column name') && !err.message.includes('no such column')) {
                console.warn('Could not add profile_pic column (may already exist):', err.message);
            } else if (!err) {
                console.log('✅ Added profile_pic column to users table');
            }
            resolve();
        });
    });
    
    console.log('✅ Migrations complete');
};

module.exports = { runMigrations };