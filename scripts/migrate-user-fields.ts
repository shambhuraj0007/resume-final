import dbConnect from '@/lib/mongodb'
import User from '@/models/User'

async function migrateUserFields() {
  await dbConnect();
  
  console.log('Starting user fields migration...');
  
  const result = await User.updateMany(
    {
      $or: [
        { cashfreeSubscriptionId: { $exists: false } },
        { subscriptionStartDate: { $exists: false } },
        { subscriptionAmount: { $exists: false } },
      ]
    },
    {
      $set: {
        cashfreeSubscriptionId: null,
        paypalSubscriptionId: null,
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        subscriptionAmount: null,
      }
    }
  );
  
  console.log(`Migration complete: ${result.modifiedCount} users updated`);
  process.exit(0);
}

migrateUserFields().catch(console.error);
