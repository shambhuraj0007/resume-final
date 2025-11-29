import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}
const MONGODB_URI = process.env.MONGODB_URI;
const FREE_CREDITS = 1;

interface IUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  name: string;
}

interface ICredit {
  userId: mongoose.Types.ObjectId;
  credits: number;
  expiryDate: Date | null;
}

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function migrateCredits() {
  console.log('🚀 Starting credit migration...\n');

  try {
    // Import models dynamically
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
      email: String,
      name: String,
    }));

    const Credit = mongoose.models.Credit || mongoose.model('Credit', new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      credits: Number,
      expiryDate: Date,
    }));

    // Get all users
    const users = await User.find({}).lean() as any as IUser[];
    console.log(`📊 Found ${users.length} users in database\n`);

    if (users.length === 0) {
      console.log('ℹ️  No users found. Nothing to migrate.');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each user
    for (const user of users) {
      try {
        // Check if credit record already exists
        const existingCredit = await Credit.findOne({ userId: user._id });

        if (existingCredit) {
          console.log(`⏭️  Skipped: ${user.email} (already has credits: ${existingCredit.credits})`);
          skippedCount++;
          continue;
        }

        // Create new credit record
        const credit = new Credit({
          userId: user._id,
          credits: FREE_CREDITS,
          expiryDate: null, // Free credits don't expire
        });

        await credit.save();
        console.log(`✅ Migrated: ${user.email} (${FREE_CREDITS} credit added)`);
        migratedCount++;

      } catch (error) {
        console.error(`❌ Error migrating ${user.email}:`, error);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📈 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`Total Users:        ${users.length}`);
    console.log(`✅ Migrated:        ${migratedCount}`);
    console.log(`⏭️  Skipped:         ${skippedCount}`);
    console.log(`❌ Errors:          ${errorCount}`);
    console.log('='.repeat(50) + '\n');

    if (migratedCount > 0) {
      console.log('🎉 Migration completed successfully!');
    } else if (skippedCount === users.length) {
      console.log('ℹ️  All users already have credits. No migration needed.');
    } else {
      console.log('⚠️  Migration completed with some errors. Please review the logs.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...\n');

  try {
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}));
    const Credit = mongoose.models.Credit || mongoose.model('Credit', new mongoose.Schema({}));

    const userCount = await User.countDocuments();
    const creditCount = await Credit.countDocuments();

    console.log(`Users in database:   ${userCount}`);
    console.log(`Credit records:      ${creditCount}`);

    if (userCount === creditCount) {
      console.log('✅ Verification passed: All users have credit records\n');
    } else {
      console.log(`⚠️  Warning: ${userCount - creditCount} users are missing credit records\n`);
    }

    // Show sample credit records
    const sampleCredits = await Credit.find().limit(5).populate('userId', 'email');
    
    if (sampleCredits.length > 0) {
      console.log('Sample credit records:');
      sampleCredits.forEach((credit: any) => {
        console.log(`  - ${credit.userId?.email || 'Unknown'}: ${credit.credits} credits`);
      });
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

async function main() {
  console.log('\n' + '='.repeat(50));
  console.log('💳 Credit Migration Script');
  console.log('='.repeat(50) + '\n');

  try {
    await connectDB();
    await migrateCredits();
    await verifyMigration();
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');
  }
}

// Run the migration
main();
