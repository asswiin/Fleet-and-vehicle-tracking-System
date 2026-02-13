const cron = require('node-cron');
const Driver = require('./models/Driver');
const PunchRecord = require('./models/PunchRecord');

/**
 * AUTO PUNCH-OUT CRON JOB
 * Runs every day at 00:00 (Midnight)
 * Purpose: Automatically close active punch records for drivers who forgot to punch out
 * and update their status in the Driver collection to ensure they show as offline.
 */
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('[CRON] Starting end-of-day auto punch-out check...');

    // 1. Find all active punch records that haven't been closed (punchOut is null)
    const activePunchRecords = await PunchRecord.find({
      status: 'On-Duty',
      punchOut: null
    });

    if (activePunchRecords.length === 0) {
      console.log('[CRON] No active punch records found to close.');
      return;
    }

    let updatedCount = 0;

    for (const record of activePunchRecords) {
      // 2. Close the PunchRecord
      // Set punchOut to 11:59:59 PM of the record's date
      const endOfDay = new Date(record.date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      record.punchOut = endOfDay;
      record.status = 'Completed';
      await record.save();

      // 3. Update the associated Driver
      // Set isAvailable to false and driverStatus to 'offline'
      const driver = await Driver.findById(record.driver);
      if (driver) {
        driver.isAvailable = false;

        // Only set status to offline if they aren't currently on a trip
        // but typically drivers who forget to punch out should be set to offline for the next day
        if (!['Accepted', 'On-trip'].includes(driver.driverStatus)) {
          driver.driverStatus = 'offline';
        } else {
          // If they were on a trip but forgot to punch out, they are still offline now
          driver.driverStatus = 'offline';
        }

        await driver.save();
        updatedCount++;
      }
    }

    console.log(`[CRON] Successfully auto-punched out ${updatedCount} drivers.`);
  } catch (err) {
    console.error('[CRON] Error during auto-complete driver status:', err);
  }
});

module.exports = {};
