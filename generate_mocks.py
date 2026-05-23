import json
import random
from datetime import datetime, timedelta

def generate():
    data = []
    start_date = datetime(2025, 1, 1)
    for i in range(365 * 2): # 2 years of daily data
        current = start_date + timedelta(days=i)
        data.append({
            "date": current.strftime("%Y-%m-%d"),
            "activeUsers": random.randint(1000, 50000),
            "newSignups": random.randint(10, 500),
            "revenue": round(random.uniform(1000.0, 10000.0), 2),
            "errors": random.randint(0, 100),
            "cpuUsage": round(random.uniform(20.0, 95.0), 2),
            "memoryUsage": round(random.uniform(40.0, 85.0), 2),
            "latencyMs": random.randint(50, 500)
        })
    
    with open("apps/web/src/mocks/analyticsData.ts", "w") as f:
        f.write("export const analyticsData = [\n")
        for item in data:
            f.write(f"  {json.dumps(item)},\n")
        f.write("];\n")

    events = []
    event_types = ['LOGIN', 'SIGNUP', 'SUBMISSION', 'ERROR', 'PAYMENT']
    for i in range(5000): # 5000 events
        events.append({
            "id": f"evt_{i}",
            "type": random.choice(event_types),
            "userId": f"usr_{random.randint(1, 1000)}",
            "timestamp": (start_date + timedelta(minutes=i*15)).isoformat() + "Z",
            "metadata": {
                "ip": f"192.168.1.{random.randint(1, 255)}",
                "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
            }
        })

    with open("apps/web/src/mocks/eventStream.ts", "w") as f:
        f.write("export const eventStream = [\n")
        for item in events:
            f.write(f"  {json.dumps(item)},\n")
        f.write("];\n")

generate()
