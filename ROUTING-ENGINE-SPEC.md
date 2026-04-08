# Tippd Routing Engine — Data Model & Rules Spec

## Operating Rules

### Trucks
- 1 box per truck at a time (standard roll-off)
- 2 trucks: 2008 Mack Granite GU713, 2012 Mack TerraPro
- Work days: Monday - Saturday
- 8-hour shift per driver (480 min)
- 30-min lunch break (built into schedule, ~midday)
- Trucks carry 1 box OUT from yard, deliver, then either pick up or return empty

### Time Constants (initial — become dynamic with learning)
- Drop at customer: 20 min
- Pickup at customer: 20 min
- Dump at transfer station: 25 min
- Lunch break: 30 min
- Drive time: from HERE Truck Routing (real-time traffic)
- Total available work time: 480 - 30 = 450 min productive

### After Every Pickup
- Default: drive to dump, unload (25 min)
- Driver override: skip dump if box is half-full and going to another customer (rare)
- After dump decision tree:
  - Same size needed at next drop + Grade A/B → reuse (skip yard)
  - Same size + Grade C + non-residential → reuse with soft prompt
  - Same size + Grade C + residential → driver prompted
  - Grade D → driver prompted regardless
  - Grade F → pulled from service, must return to yard
  - No matching drop → return to yard

---

## Data Model

### route_segments (NEW TABLE)
Every leg of a route is a segment. This is the atomic unit of routing.

```
id                  uuid PK
route_id            uuid FK → routes
truck_id            uuid FK → trucks
driver_id           uuid FK → users
sequence_number     integer (1, 2, 3...)
segment_type        enum: 'yard_depart' | 'drop' | 'pickup' | 'dump' | 'yard_return' | 'lunch' | 'reposition'
job_id              uuid nullable FK → jobs (null for yard/dump/lunch legs)
dump_location_id    uuid nullable FK → dump_locations
from_lat            decimal
from_lng            decimal
from_address        text
to_lat              decimal
to_lng              decimal
to_address          text

-- Planning estimates
planned_drive_miles     decimal
planned_drive_minutes   integer
planned_stop_minutes    integer (20 for drop/pickup, 25 for dump, 30 for lunch, 0 for reposition)
planned_depart_time     timestamptz
planned_arrive_time     timestamptz

-- Actuals (filled by driver app)
actual_depart_time      timestamptz nullable
actual_arrive_time      timestamptz nullable
actual_stop_minutes     integer nullable
actual_drive_minutes    integer nullable

-- Scoring (5 buckets)
score_time              decimal  -- minutes total
score_miles             decimal  -- road miles
score_cost              decimal  -- fuel + dump fee + driver wage portion
score_inventory         decimal  -- +1 = freed a box, -1 = used a box, 0 = neutral
score_service_risk      decimal  -- 0-1, likelihood of missing customer window

-- Box tracking
box_id                  uuid nullable FK → dumpsters
box_size                text nullable (10yd, 20yd, 30yd)
box_condition_before    text nullable (A-F, set at pickup)
box_condition_after     text nullable (graded by driver)
box_reused              boolean default false
box_action              enum nullable: 'loaded_from_yard' | 'picked_up' | 'dropped' | 'dumped' | 'returned_to_yard' | 'pulled_from_service'

-- Decision tracking
decision_made           text nullable (e.g. 'reuse_to_next_drop', 'return_to_yard', 'driver_override_skip_dump')
decision_reason         text nullable

status                  enum: 'planned' | 'in_progress' | 'completed' | 'skipped' | 'rerouted'
created_at              timestamptz
```

### route_learning (NEW TABLE)
Stores actual performance data for learning averages.

```
id                  uuid PK
operator_id         uuid FK → operators
segment_type        text (drop, pickup, dump, drive)
entity_id           uuid nullable (customer_id for drop/pickup, dump_location_id for dump)
driver_id           uuid nullable
box_size            text nullable
material_type       text nullable
time_of_day         text nullable ('morning' | 'midday' | 'afternoon' | 'evening')
day_of_week         integer (0-6)

planned_minutes     integer
actual_minutes      integer
variance_minutes    integer (actual - planned)
planned_miles       decimal nullable
actual_miles        decimal nullable

created_at          timestamptz
```

### driver_state (NEW TABLE)
Real-time driver tracking for mid-day adjustments.

```
id                  uuid PK
driver_id           uuid FK → users
truck_id            uuid FK → trucks
operator_id         uuid FK → operators
route_id            uuid nullable FK → routes
current_lat         decimal
current_lng         decimal
current_segment_id  uuid nullable FK → route_segments
status              enum: 'at_yard' | 'driving' | 'at_customer' | 'at_dump' | 'on_break' | 'off_duty'
last_updated        timestamptz
heading             decimal nullable (compass degrees)
speed_mph           decimal nullable
```

### customer access notes (ADD TO customers TABLE)
```
access_restrictions     text nullable (gate code, business hours only, narrow driveway, etc.)
preferred_time          text nullable ('morning' | 'afternoon' | 'anytime')
no_early_am             boolean default false (don't deliver before 8am)
special_instructions    text nullable
```

### box states (UPDATE dumpsters.status)
Add 'ready_for_pickup' status:
```
available       -- in yard, ready to load on truck
assigned        -- assigned to a job, not yet on truck
loaded          -- on the truck heading to customer
deployed        -- at customer site (active job)
ready_pickup    -- customer requested pickup, box flagged
returning       -- on truck coming back from customer
at_dump         -- at transfer station being unloaded
in_yard         -- returned to yard after dump
repair          -- out of service
retired         -- permanently out
```

### weigh_stations (NEW TABLE — build for, populate later)
```
id              uuid PK
name            text
address         text
lat             decimal
lng             decimal
direction       text nullable (NB, SB, EB, WB)
hours           text nullable
is_active       boolean default true
```

---

## Route Scoring Model

Every route option is scored across 5 buckets:

| Bucket | What It Measures | Weight (configurable) |
|--------|-----------------|----------------------|
| Time | Total minutes (drive + stop + dump) | 0.25 |
| Miles | Total road miles (fuel cost proxy) | 0.25 |
| Cost | Fuel + dump fee + wage for this segment | 0.20 |
| Inventory | Box availability impact (+1 freed, -1 used) | 0.15 |
| Service Risk | Chance of missing window (0-1) | 0.15 |

Lower composite score = better route.

### Operating Modes
The weights shift based on the day's objective:

| Mode | Time | Miles | Cost | Inventory | Service |
|------|------|-------|------|-----------|---------|
| Maximize jobs | 0.35 | 0.15 | 0.15 | 0.20 | 0.15 |
| Protect on-time | 0.20 | 0.10 | 0.10 | 0.10 | 0.50 |
| Minimize overtime | 0.40 | 0.20 | 0.20 | 0.10 | 0.10 |
| Reduce dump cost | 0.15 | 0.15 | 0.40 | 0.15 | 0.15 |
| Clear aged boxes | 0.15 | 0.15 | 0.15 | 0.40 | 0.15 |

---

## Real-Time Adjustments

### Triggers for re-route:
1. Driver marks box as Grade D/F at pickup → reroute to yard
2. Driver overrides dump (half-full box to next customer) → skip dump segment
3. Driver falls behind schedule → recalculate remaining segments
4. Traffic incident detected by HERE → recalculate drive times
5. Severe weather override → manager manually triggers schedule push
6. Emergency same-day job inserted → manager adds job, system shows impact

### Weather Override:
- Manager or driver flags "severe weather day"
- All non-critical jobs pushed to next available day
- Auto-notification to affected customers: "Due to weather, your [drop/pickup] has been rescheduled to [date]. We apologize for the inconvenience."
- Schedule recovery logic: spread pushed jobs across next 2-3 days based on capacity

---

## Learning System

After every completed route segment:
1. Log planned vs actual times to route_learning
2. Update rolling averages:
   - Average drop time by customer (some driveways take longer)
   - Average dump time by facility (Bridgewater = 20 min, Newark = 35 min)
   - Average drive time by route + time of day
   - Average pickup time by box size and material type
3. After 30+ data points per category, switch from fixed constants to learned averages
4. Surface anomalies: "Dump time at RSNJ Middlesex averaged 45 min this week (normally 25 min)"

---

## Communication Rules

### Customer messages:
- "We're on the way today" — sent when driver starts route (no specific time)
- "Had to reschedule" — sent if job gets bumped, include new date
- "Your dumpster has been delivered" — sent after driver confirms drop
- "Your dumpster has been picked up" — sent after driver confirms pickup
- No specific time windows, no ETA updates (keep it simple)

### Driver comms:
- Route loaded to driver app each morning
- Mid-day reroute pushes updated sequence to driver
- Driver can flag: "box condition issue", "access problem", "customer not available"
- Each flag triggers appropriate system response

---

## Driver App Interactions

At each stop, driver taps through:
1. ARRIVED (GPS timestamp logged)
2. For drops: DROPPED (photo optional, GPS logged)
3. For pickups: PICKED UP + GRADE BOX (A/B/C/D/F)
   - If F: 3-tap confirm + required note → box pulled from service
   - If D: prompted about next stop suitability
   - If C + residential next: prompted
4. At dump: ARRIVED AT DUMP → DUMP COMPLETE
5. System auto-decides next destination, driver sees updated route

Driver audible: "This box can't be reused" → system reroutes to yard for fresh box, recalculates remaining route, shows driver new ETA for remaining stops.
