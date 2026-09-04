require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

// Connect Database and auto-seed if fresh DB
connectDB().then(async () => {
  try {
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('⚡ Empty database detected. Auto-seeding initial store data & admin account...');
      const { runSeed } = require('./seed/seed');
      await runSeed({ exitOnComplete: false });
      console.log('✅ Auto-seed complete!');
    }
  } catch (seedErr) {
    console.error('Auto-seed check error:', seedErr.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\nNew Columbu Stores API`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`MongoDB: Connected\n`);
});

