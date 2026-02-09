const cron = require('node-cron');
const Driver = require('./models/Driver');

// This job runs every day at 12:00 (noon)
cron.schedule('0 12 * * *', async () => {
  try {
    // Find all drivers who are still punched in (customize field as needed)
    const punchedInDrivers = await Driver.find({ driverStatus: 'punched-in' });
    for (const driver of punchedInDrivers) {
      driver.driverStatus = 'completed';
      // Optionally, set punchOut time or other fields here
      await driver.save();
    }
    console.log(`[CRON] Updated ${punchedInDrivers.length} drivers to completed at 12:00.`);
  } catch (err) {
    console.error('[CRON] Error updating driver statuses:', err);
  }
});

module.exports = {};
