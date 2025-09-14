const { execSync } = require('child_process');
const fs = require('fs');

describe('Integration Test: Order → Notification', () => {
  test('order creates notification logs', () => {
    const payload = JSON.stringify({ itemId: ['itemA', 'itemB'] });

    // one-line curl command, safer quoting
    execSync(
      `curl -s -X POST http://localhost:8080/orders -H "Content-Type: application/json" -d '${payload}'`,
      { stdio: 'inherit' } // so you can see curl output in Jest logs
    );

    // wait for consumer
    let found = false;
    for (let i = 0; i < 20; i++) {
      if (fs.existsSync('notification-service/data/notifications.log')) {
        const logs = fs.readFileSync('notification-service/data/notifications.log', 'utf-8');
        if (logs.includes('itemA') && logs.includes('itemB')) {
          found = true;
          break;
        }
      }
      execSync('sleep 1');
    }

    expect(found).toBe(true);
  }, 60000); // give it 60s max
});
