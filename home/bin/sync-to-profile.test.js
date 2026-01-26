// home/bin/sync-to-profile.test.js
const { syncToProfile } = require('./sync-to-profile.js');

console.log('Testing sync-to-profile module...');

// Check that syncToProfile function is exported
if (typeof syncToProfile === 'function') {
  console.log('✅ syncToProfile function is exported');

  // Check if GITHUB_TOKEN is set
  if (!process.env.GITHUB_TOKEN) {
    console.log('⚠️  GITHUB_TOKEN not set - skipping actual sync test');
    console.log('   To run full test: GITHUB_TOKEN=xxx node bin/sync-to-profile.test.js');
    console.log('');
    console.log('Test result: Module structure is valid');
    console.log('Expected sync steps when run with token:');
    console.log('  📖 Reading blog posts...');
    console.log('  ✅ Found N posts, extracted latest 5');
    console.log('  📥 Cloning profile repo...');
    console.log('  ✅ Profile README updated');
    console.log('  📤 Committing to profile repo...');
    console.log('  ✅ Profile repo updated!');
  } else {
    // Run actual sync test
    console.log('🚀 Running actual sync test...');
    syncToProfile().then(result => {
      console.log('Sync result:', result);
    }).catch(error => {
      console.error('Sync error:', error);
    });
  }
} else {
  console.log('❌ syncToProfile function is not exported');
  process.exit(1);
}
