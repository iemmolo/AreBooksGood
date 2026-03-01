#!/usr/bin/env bash
#
# Fetch upcoming events near Fremantle from Eventfinda API v2
# and write data/gigs.json for Hugo.
#
# Requires: EVENTFINDA_USER, EVENTFINDA_PASS environment variables
# Usage:    bash scripts/fetch-gigs.sh
#

set -euo pipefail

# --- Config ---
LAT="-32.0569"
LNG="115.7439"
RADIUS=10
ROWS=20
MAX_PAGES=5
OUT="data/gigs.json"

if [ -z "${EVENTFINDA_USER:-}" ] || [ -z "${EVENTFINDA_PASS:-}" ]; then
  echo "Error: EVENTFINDA_USER and EVENTFINDA_PASS must be set" >&2
  exit 1
fi

AUTH="${EVENTFINDA_USER}:${EVENTFINDA_PASS}"
BASE="https://api.eventfinda.com.au/v2"

DATE_START=$(date -u +"%Y-%m-%dT00:00:00")
DATE_END=$(date -u -v+14d +"%Y-%m-%dT23:59:59" 2>/dev/null || date -u -d "+14 days" +"%Y-%m-%dT23:59:59")

echo "Fetching events: ${LAT},${LNG} radius=${RADIUS}km"
echo "Date range: ${DATE_START} to ${DATE_END}"

# --- Fetch events with pagination ---
ALL_EVENTS="[]"
OFFSET=0

for PAGE in $(seq 1 $MAX_PAGES); do
  echo "Page ${PAGE} (offset ${OFFSET})..."

  RESPONSE=$(curl -sf -u "${AUTH}" \
    "${BASE}/events.json?point=${LAT},${LNG}&radius=${RADIUS}&start_date=${DATE_START}&end_date=${DATE_END}&rows=${ROWS}&offset=${OFFSET}&order=date&fields=event:(id,name,description,url,datetime_start,datetime_end,is_free,restrictions,location_summary,point,sessions,category)" \
    2>/dev/null) || { echo "API request failed on page ${PAGE}" >&2; break; }

  PAGE_EVENTS=$(echo "${RESPONSE}" | python3 -c "
import sys, json
data = json.load(sys.stdin)
events = data.get('events', [])
print(json.dumps(events))
")

  COUNT=$(echo "${PAGE_EVENTS}" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
  echo "  Got ${COUNT} events"

  if [ "$COUNT" -eq 0 ]; then
    break
  fi

  ALL_EVENTS=$(python3 -c "
import sys, json
a = json.loads(sys.argv[1])
b = json.loads(sys.argv[2])
print(json.dumps(a + b))
" "${ALL_EVENTS}" "${PAGE_EVENTS}")

  if [ "$COUNT" -lt "$ROWS" ]; then
    break
  fi

  OFFSET=$((OFFSET + ROWS))
  sleep 1
done

# --- Fetch categories ---
echo "Fetching categories..."
CATS_RESPONSE=$(curl -sf -u "${AUTH}" \
  "${BASE}/categories.json?rows=50&fields=category:(id,name)" \
  2>/dev/null) || CATS_RESPONSE='{"categories":[]}'

# --- Normalize into our schema ---
echo "Normalizing data..."
FETCHED_AT=$(date -u +"%Y-%m-%dT%H:%M:%S+00:00")

python3 -c "
import json, sys

events_raw = json.loads(sys.argv[1])
cats_raw = json.loads(sys.argv[2])
fetched_at = sys.argv[3]

events = []
for e in events_raw:
    cat = e.get('category', {})
    cat_id = ''
    if isinstance(cat, dict):
        cat_id = cat.get('slug', cat.get('name', ''))
    elif isinstance(cat, list) and len(cat) > 0:
        cat_id = cat[0].get('slug', cat[0].get('name', ''))

    restrictions = e.get('restrictions', '')
    price = 'Free' if e.get('is_free') else ''
    sessions = e.get('sessions', {})
    if isinstance(sessions, dict) and not e.get('is_free'):
        price_range = sessions.get('price_range', '')
        if price_range:
            price = price_range

    events.append({
        'id': e.get('id', 0),
        'name': e.get('name', ''),
        'description': e.get('description', ''),
        'venue': e.get('location_summary', ''),
        'address': '',
        'category': cat_id,
        'datetime_start': e.get('datetime_start', ''),
        'datetime_end': e.get('datetime_end', ''),
        'is_free': bool(e.get('is_free')),
        'price': price,
        'age_restriction': restrictions if restrictions else 'All ages',
        'url': e.get('url', ''),
        'status': 'active'
    })

categories = []
cats_data = json.loads(cats_raw) if isinstance(cats_raw, str) else cats_raw
for c in cats_data.get('categories', []):
    categories.append({
        'id': c.get('slug', c.get('name', '')),
        'name': c.get('name', '')
    })

output = {
    'fetched_at': fetched_at,
    'location': 'Fremantle, WA',
    'radius_km': 10,
    'events': events,
    'categories': categories
}

print(json.dumps(output, indent=2))
" "${ALL_EVENTS}" "${CATS_RESPONSE}" "${FETCHED_AT}" > "${OUT}"

TOTAL=$(python3 -c "import json; print(len(json.load(open('${OUT}'))['events']))")
echo "Done! Wrote ${TOTAL} events to ${OUT}"
