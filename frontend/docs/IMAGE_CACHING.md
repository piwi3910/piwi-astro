# Image Caching System

## Overview

All external target images (planets, comets, DSS sky surveys) are automatically cached in MinIO object storage for faster loading and reduced bandwidth.

## Architecture

```
External Image URL
     ↓
/api/image-proxy?url=...
     ↓
Check MinIO Cache
     ├─ HIT → Redirect to MinIO URL
     └─ MISS → Download → Cache → Redirect to MinIO URL
```

## Components

### 1. MinIO Docker Service

**Location**: `docker-compose.dev.yml`
- **API Port**: 9002 (mapped from internal 9000)
- **Console**: 9003 (http://localhost:9003)
- **Credentials**: minioadmin / minioadmin123

**Buckets**:
- `astroplanner-images`: User-uploaded images
- `astroplanner-cache`: Cached external images

### 2. MinIO Client Library

**Location**: `src/lib/minio.ts`

Key functions:
- `initializeMinIO()` - Creates buckets with public read policy
- `fileExists(key, bucket)` - Check if image is cached
- `getPublicUrl(key, bucket)` - Generate public MinIO URL

### 3. Image Cache Service

**Location**: `src/lib/image-cache.ts`

Key functions:
- `cacheExternalImage(url)` - Downloads and caches image, returns MinIO URL
- `preCacheImages(urls[])` - Bulk pre-cache images (useful for seeding)

Caching logic:
1. Generate MD5 hash of source URL as cache key
2. Check if `cached/{hash}.{ext}` exists in MinIO
3. If not, download from source and upload to MinIO
4. Return MinIO public URL

### 4. Image Proxy API

**Location**: `src/app/api/image-proxy/route.ts`

**Endpoint**: `GET /api/image-proxy?url={externalUrl}`

**Behavior**:
- Validates URL parameter
- Calls `cacheExternalImage()` to ensure image is cached
- Redirects to MinIO cached URL (HTTP 302)
- Falls back to original URL on error

### 5. Frontend Integration

**Location**: `src/app/targets/page.tsx`

All target images use the proxy:
```typescript
const imageUrl = `/api/image-proxy?url=${encodeURIComponent(externalUrl)}`;
```

Image types:
- **Planets/Moon**: Static Wikimedia Commons images
- **Comets**: Placeholder (Comet Hale-Bopp)
- **Deep-sky objects**: Dynamic SkyView/DSS images

## Usage

### Start MinIO

```bash
docker-compose -f docker-compose.dev.yml up -d minio
```

### Initialize Buckets

```bash
npx tsx scripts/init-minio.ts
```

This creates buckets and tests caching with a Mars image.

### View Cached Images

1. **MinIO Console**: http://localhost:9003
   - Username: minioadmin
   - Password: minioadmin123

2. Browse to `astroplanner-cache` bucket
3. See cached images in `cached/` folder

### Access Cached Images

**Public URL Format**:
```
http://localhost:9002/astroplanner-cache/cached/{hash}.{ext}
```

**Via Proxy** (recommended):
```
http://localhost:3000/api/image-proxy?url={externalUrl}
```

## Performance

### Before Caching:
- Planet images: ~500ms (Wikimedia)
- DSS images: ~2-5s (SkyView generation)
- Multiple requests for same image

### After Caching:
- First request: Download + cache (~500ms-5s)
- Subsequent requests: Direct from MinIO (~50ms)
- Images persist across restarts

## Storage Usage

Estimated cache sizes:
- **8 Planet images**: ~400 KB
- **1 Moon image**: ~50 KB
- **1 Comet placeholder**: ~50 KB
- **Messier catalog (110)**: ~3.3 MB
- **NGC bright (1000)**: ~30 MB
- **Total expected**: ~35 MB (very manageable)

## Environment Variables

```env
MINIO_ENDPOINT="localhost"
MINIO_PORT="9002"
MINIO_USE_SSL="false"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin123"
MINIO_BUCKET_IMAGES="astroplanner-images"
MINIO_BUCKET_CACHE="astroplanner-cache"
MINIO_REGION="us-east-1"
```

## Benefits

✅ **Faster Loading**: Images cached locally after first request
✅ **Reduced Bandwidth**: No repeated downloads from external sources
✅ **Reliability**: Works even if external services are slow/down
✅ **Privacy**: No direct connections to external services from users
✅ **Cost**: Free local storage instead of external API costs

## Maintenance

### Clear Cache

```bash
# Via MinIO Console
http://localhost:9003 → astroplanner-cache → Delete

# Via CLI (if mc client installed)
mc rm --recursive --force local/astroplanner-cache/cached/
```

### Monitor Cache

```bash
# View bucket size
docker exec astroplanner-minio du -sh /data/astroplanner-cache
```

## Production Deployment

For production:
1. Use persistent volumes for MinIO data
2. Configure SSL/TLS (`MINIO_USE_SSL="true"`)
3. Change default credentials
4. Use CDN in front of MinIO for global distribution
5. Consider S3/Backblaze as alternative storage backend
