import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';

async function checkUserStatus(email: string) {
  await dbConnect();
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🔍 CHECKING USER STATUS FOR:', email);
  console.log('═══════════════════════════════════════════════════════\n');
  
  const user = await User.findOne({ email });
  
  if (!user) {
    console.log('❌ User not found');
    return;
  }
  
  console.log('📧 Email:', user.email);
  console.log('💳 Subscription Status:', user.subscriptionStatus);
  console.log('💰 Credits:', user.credits);
  console.log('👤 Paid User:', user.isPaidUser);
  console.log('📦 Plan ID:', user.subscriptionPlanId);
  console.log('📋 Plan Name:', user.subscriptionPlanName);
  console.log('🔢 CF Subscription ID:', user.cashfreeSubscriptionId);
  console.log('💵 Subscription Amount:', user.subscriptionAmount);
  console.log('📅 Start Date:', user.subscriptionStartDate);
  
  console.log('\n--- TRANSACTIONS ---\n');
  
  const transactions = await Transaction.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5);
  
  transactions.forEach((tx, i) => {
    console.log(`\n[${i + 1}] Transaction ${tx._id}`);
    console.log('  Order ID:', tx.orderId);
    console.log('  CF Subscription ID:', tx.cfSubscriptionId);
    console.log('  Status:', tx.status);
    console.log('  Credits:', tx.credits);
    console.log('  Amount:', tx.amount, tx.currency);
    console.log('  Created:', tx.createdAt);
  });
  
  console.log('\n═══════════════════════════════════════════════════════\n');
  
  process.exit(0);
}

// Run with: npx ts-node scripts/check-user-status.ts
checkUserStatus('shambhuraj960410054@gmail.com').catch(console.error);
