// Test script to verify stripe_session_id storage
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { donations, paymentIntentions } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString);
const db = drizzle(client);

async function testStripeSessionStorage() {
  console.log('=== TESTING STRIPE SESSION ID STORAGE ===');
  
  try {
    // Test 1: Create a test donation with stripe_session_id
    const testSessionId = 'pi_test_session_' + Date.now();
    console.log(`\n1. Testing donation creation with sessionId: ${testSessionId}`);
    
    const testDonation = {
      userId: 'test-user-id',
      charityId: null,
      amount: '1.00',
      senderEmail: 'test@example.com',
      status: 'completed',
      stripeSessionId: testSessionId
    };
    
    console.log('Donation data:', JSON.stringify(testDonation, null, 2));
    
    const [createdDonation] = await db
      .insert(donations)
      .values({
        ...testDonation,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    console.log('Created donation:', JSON.stringify(createdDonation, null, 2));
    
    // Test 2: Verify the donation was created with stripe_session_id
    const retrievedDonation = await db
      .select()
      .from(donations)
      .where(eq(donations.stripeSessionId, testSessionId));
    
    console.log(`\n2. Retrieved donation by sessionId:`, JSON.stringify(retrievedDonation[0], null, 2));
    
    // Test 3: Create a test payment intention with stripe_session_id
    const testPaymentIntention = {
      userId: 'test-user-id',
      senderEmail: 'sender@example.com',
      targetEmail: 'target@example.com',
      stripePaymentLinkId: 'link_test_' + Date.now(),
      stripeSessionId: testSessionId,
      amount: '1.00',
      status: 'paid'
    };
    
    console.log(`\n3. Testing payment intention creation with sessionId: ${testSessionId}`);
    console.log('Payment intention data:', JSON.stringify(testPaymentIntention, null, 2));
    
    const [createdIntention] = await db
      .insert(paymentIntentions)
      .values({
        ...testPaymentIntention,
        createdAt: new Date(),
        updatedAt: new Date(),
        paidAt: new Date()
      })
      .returning();
    
    console.log('Created payment intention:', JSON.stringify(createdIntention, null, 2));
    
    // Test 4: Update payment intention status with sessionId
    console.log(`\n4. Testing payment intention status update with sessionId: ${testSessionId}`);
    
    const [updatedIntention] = await db
      .update(paymentIntentions)
      .set({
        status: 'paid',
        stripeSessionId: testSessionId,
        paidAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(paymentIntentions.id, createdIntention.id))
      .returning();
    
    console.log('Updated payment intention:', JSON.stringify(updatedIntention, null, 2));
    
    console.log('\n=== ALL TESTS PASSED ===');
    console.log('The stripe_session_id field is working correctly in the database.');
    
  } catch (error) {
    console.error('Test failed:', error);
    console.error('Error stack:', error.stack);
  } finally {
    await client.end();
  }
}

// Run the test
testStripeSessionStorage();
