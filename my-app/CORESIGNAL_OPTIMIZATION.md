# CoreSignal API Optimization Guide

## Problem: Token Waste in Multi-Source Employee API

The CoreSignal Multi-Source Employee API returns rich data, but **80% of it is noise** for CV/Roadmap generation:

### Token Drainers:
1. **Activity Feeds**: 14+ "Liked by" entries (~1,500 tokens wasted)
2. **Metadata Bloat**: `updated_at`, `checked_at`, `location_country_iso3`, `historical_ids`
3. **Empty Arrays**: `experience: []`, `education: []`, `certifications: []`
4. **Non-Career Signals**: Profile change summaries, follower counts, etc.

### Example:
- **Raw JSON**: 647 lines, ~18,000 characters, ~4,500 tokens
- **Actual Career Signal**: Name, skills, GitHub repos (~1,200 chars, ~300 tokens)
- **Waste**: ~95% of tokens

## Solution: Two-Tier Optimization

### Tier 1: API-Level Field Selection (95% Reduction)

**Use CoreSignal's field selection parameter** to prevent noise from reaching your server:

```typescript
// Only request high-value fields
const fieldParams = [
  'full_name',
  'location_city',
  'historical_skills',  // Key field for multi-source API
  'github_repos_summary',
].map(field => `fields=${encodeURIComponent(field)}`).join('&');

const response = await fetch(
  `${CORESIGNAL_API_BASE}/employee_base/collect/${employeeId}?${fieldParams}`
);
```

**Result**: Reduces JSON from ~20,000 chars to ~800 chars (95% reduction)

### Tier 2: Local Data Cleaning (80% Reduction)

If you must process raw JSON, use the `cleanCoreSignalProfile()` function:

```typescript
import { cleanCoreSignalProfile } from "@/utils/coresignal-optimizer";

const cleaned = cleanCoreSignalProfile(rawEmployeeData);
```

**What it removes:**
- Activity feeds (all "Liked by" entries)
- Empty arrays
- Metadata fields
- HTML tags from descriptions
- GitHub repos with 0 contributions
- Limits arrays to top N items

## Implementation

### Updated CoreSignal Route

The `/api/coresignal/route.ts` now:

1. **Uses field selection** in API calls
2. **Cleans data immediately** after receiving it
3. **Filters empty arrays** before transformation
4. **Logs token savings** for monitoring

### Optimizer Functions

#### `cleanCoreSignalProfile(raw)`
Cleans a single profile, handles both `employee_base` and `multi_source` formats.

#### `distillMultiSourceData(raw)`
Most aggressive optimization - extracts only:
- Name
- Location
- Skills (historical_skills)
- GitHub repos (with contributions > 0)

#### `compressCoreSignalProfiles(profiles[])`
Creates condensed summaries for prompt injection.

## Field Selection Best Practices

### High-Value Fields (Always Request):
- `full_name` - Essential
- `location_city` or `location_full` - Useful context
- `historical_skills` - **Key field** for multi-source API
- `github_repos_summary` - Technical signal

### Conditional Fields:
- `experience` - Only if needed (can be large)
- `education` - Only if needed
- `certifications` - Only if needed
- `headline` - Useful but not critical
- `summary` - Useful but can be long

### Never Request:
- `activity` - Pure noise for CV/Roadmap
- `updated_at`, `checked_at` - Metadata
- `historical_ids` - Internal tracking
- `profile_root_field_changes_summary` - Change tracking
- Empty arrays - Filter client-side

## Cost Comparison

### Before Optimization:
```
Raw Profile: ~18,000 chars = ~4,500 tokens
Cost per profile (Gemini 3 Flash input): $0.0022
```

### After Field Selection:
```
Filtered Profile: ~1,200 chars = ~300 tokens
Cost per profile: $0.0001
Savings: 95%
```

### With Local Cleaning (if field selection unavailable):
```
Cleaned Profile: ~3,600 chars = ~900 tokens
Cost per profile: $0.0004
Savings: 80%
```

## Multi-Source vs Employee Base API

### Multi-Source Employee API (`employee_multi_source`)
- **Key Skills Field**: `historical_skills` (not `skills`)
- **More Data**: Includes GitHub, activity feeds, etc.
- **More Noise**: Requires aggressive filtering

### Employee Base API (`employee_base`)
- **Key Skills Field**: `skills` or `member_skills`
- **Less Data**: Focused on LinkedIn profile
- **Less Noise**: Still benefits from field selection

## Example: Distilled Output

**Input** (Raw Multi-Source JSON - 647 lines):
```json
{
  "id": 396191057,
  "activity": [14 entries of "Liked by"],
  "experience": [],
  "education": [],
  "historical_skills": ["unix", "soa", "agile", ...],
  "github_repos_summary": [35 repos, many with 0 contributions],
  ...
}
```

**Output** (Distilled - ~50 lines):
```json
{
  "name": "Mudit Jain",
  "location": "Edinburgh, Scotland, United Kingdom",
  "skills": ["unix", "soa", "agile methodologies", ...],
  "github": [
    {"repo": "smassh", "contributions": 855},
    {"repo": "kilo-go", "contributions": 28},
    ...
  ]
}
```

**Token Reduction**: 4,500 → 300 tokens (93% reduction)

## Monitoring

The optimizer logs token savings:
```
[CoreSignal] Employee 396191057 - Data cleaned, original size: 18000 chars, cleaned: 1200 chars
```

Use this to track optimization effectiveness.
