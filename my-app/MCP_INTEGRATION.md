# CoreSignal MCP Integration Guide

## Overview

This guide explains how to integrate CoreSignal via Model Context Protocol (MCP) to:
1. Enable direct AI access to CoreSignal tools (in Cursor IDE)
2. Reduce custom API code
3. Minimize API calls (1-2 maximum)
4. Optimize token usage with field selection

## Setup

### 1. Configure MCP for Cursor IDE

Create or update `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "coresignal": {
      "command": "npx",
      "args": [
        "mcp-remote@0.0.22",
        "https://mcp.coresignal.com/mcp",
        "--header",
        "apikey:${CORESIGNAL_API_KEY}"
      ],
      "env": {
        "CORESIGNAL_API_KEY": "your_actual_key_here"
      }
    }
  }
}
```

**Note**: Replace `your_actual_key_here` with your actual CoreSignal API key, or use an environment variable.

### 2. Environment Variables

Ensure `CORESIGNAL_API_KEY` is set in your environment:

```bash
# .env.local
CORESIGNAL_API_KEY=your_actual_key_here
```

### 3. System Prompt for AI Agents

When the AI needs to search for employee profiles, add this to system prompts:

```
## CoreSignal MCP Tool Access

You have access to the CoreSignal MCP server for finding employee profiles.

**CRITICAL RULES:**
1. **One-Call Maximum**: Use exactly ONE CoreSignal MCP call per user request
2. **Field Selection**: Always request only: full_name, location_city, historical_skills, github_repos_summary
3. **Precision**: Use specific filters (position_title, company_name, location)
4. **No Retries**: If first call returns no results, inform user and stop (max 2 calls total)

**Tool Name**: coresignal_employee_multisource_api
```

## Usage

### In Cursor IDE (AI Assistant)

The AI can now directly call CoreSignal tools:

```
User: "Find programmers in Texas at Google"
AI: [Calls coresignal_employee_multisource_api with filters]
```

### In Next.js API Routes

Use the MCP client service:

```typescript
import { searchEmployeesMCP } from "@/services/mcp-coresignal";

// Search with optimized field selection
const profiles = await searchEmployeesMCP(
  {
    position_title: "Software Engineer",
    company_name: "Google",
    location_country: "US",
    location_state: "Texas",
  },
  ["full_name", "location_city", "historical_skills", "github_repos_summary"]
);
```

### Via API Endpoint

```typescript
// POST /api/coresignal-mcp
{
  "action": "search",
  "filters": {
    "position_title": "Software Engineer",
    "company_name": "Google",
    "location_country": "US"
  }
}
```

## Benefits

### 1. Token Optimization (95% Reduction)

**Before (Raw API):**
- Full profile: ~18,000 chars = ~4,500 tokens
- Cost: $0.0022 per profile

**After (MCP with Field Selection):**
- Filtered profile: ~1,200 chars = ~300 tokens
- Cost: $0.0001 per profile
- **Savings: 95%**

### 2. One-Call Strategy

- Enforces single-call maximum
- Reduces API costs
- Faster response times
- Less token waste

### 3. Standardized Interface

- No custom API glue code
- MCP protocol handles transformation
- Consistent across different AI agents

## Migration from Direct API

### Old Approach (Direct API):
```typescript
// Custom API route with manual field filtering
const response = await fetch(`${CORESIGNAL_API_BASE}/employee_base/collect/${id}?fields=...`);
```

### New Approach (MCP):
```typescript
// Standardized MCP call
const profiles = await searchEmployeesMCP(filters, optimizedFields);
```

## Troubleshooting

### MCP Server Not Available

If MCP calls fail, the service falls back gracefully:
- Returns empty array for searches
- Logs errors for debugging
- Doesn't break the application

### Field Selection Not Working

Ensure you're passing the `fields` parameter:
```typescript
const fields = ["full_name", "location_city", "historical_skills", "github_repos_summary"];
await searchEmployeesMCP(filters, fields);
```

### API Key Issues

Check environment variables:
```bash
echo $CORESIGNAL_API_KEY  # Should show your key
```

## Files

- `src/services/mcp-coresignal.ts` - MCP client service
- `src/app/api/coresignal-mcp/route.ts` - API route bridge
- `.cursor/mcp.json` - Cursor IDE configuration (create manually)
- `.cursorrules` - Cursor rules for AI behavior

## Next Steps

1. Create `.cursor/mcp.json` with your API key
2. Test MCP calls in Cursor IDE
3. Update system prompts to include MCP instructions
4. Migrate existing CoreSignal calls to use MCP service
5. Monitor token usage and costs
