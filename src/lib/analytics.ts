import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { NextRequest } from 'next/server'

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const ANALYTICS_BUCKET = process.env.S3_ANALYTICS_BUCKET!

export interface VisitorData {
  timestamp: string
  ip: string
  // Geo from ip-api.com (free, no key needed for server-side)
  country: string
  countryCode: string
  region: string
  regionName: string
  city: string
  district: string
  zip: string
  lat: number
  lon: number
  timezone: string
  isp: string
  org: string
  // Request info
  page: string
  referrer: string
  userAgent: string
  browser: string
  os: string
  device: string
  language: string
  // Extra
  sessionId: string
}

function parseUA(ua: string): { browser: string; os: string; device: string } {
  const browser =
    /Edg\//.test(ua) ? 'Edge' :
    /OPR\//.test(ua) ? 'Opera' :
    /Chrome\//.test(ua) ? 'Chrome' :
    /Firefox\//.test(ua) ? 'Firefox' :
    /Safari\//.test(ua) ? 'Safari' : 'Unknown'

  const os =
    /Windows NT 10/.test(ua) ? 'Windows 10' :
    /Windows NT 11/.test(ua) ? 'Windows 11' :
    /Windows/.test(ua) ? 'Windows' :
    /Android/.test(ua) ? 'Android' :
    /iPhone|iPad/.test(ua) ? 'iOS' :
    /Mac OS X/.test(ua) ? 'macOS' :
    /Linux/.test(ua) ? 'Linux' : 'Unknown'

  const device =
    /Mobile|Android|iPhone/.test(ua) ? 'Mobile' :
    /iPad|Tablet/.test(ua) ? 'Tablet' : 'Desktop'

  return { browser, os, device }
}

async function getGeoData(ip: string) {
  try {
    // Use ip-api.com — free for non-commercial, server-side only
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,isp,org`,
      { next: { revalidate: 0 } }
    )
    if (!res.ok) throw new Error('geo failed')
    const data = await res.json()
    if (data.status !== 'success') throw new Error('geo status failed')
    return data
  } catch {
    return {
      country: 'Unknown', countryCode: 'XX', region: '', regionName: 'Unknown',
      city: 'Unknown', district: '', zip: '', lat: 0, lon: 0,
      timezone: 'Unknown', isp: 'Unknown', org: 'Unknown',
    }
  }
}

export async function trackVisitor(req: NextRequest, page: string) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '0.0.0.0'

    const ua = req.headers.get('user-agent') ?? ''
    const { browser, os, device } = parseUA(ua)
    const language = req.headers.get('accept-language')?.split(',')[0] ?? 'unknown'
    const referrer = req.headers.get('referer') ?? ''
    const sessionId = req.cookies.get('sid')?.value ?? 'no-session'

    const geo = await getGeoData(ip)

    const visitor: VisitorData = {
      timestamp: new Date().toISOString(),
      ip,
      country: geo.country,
      countryCode: geo.countryCode,
      region: geo.region,
      regionName: geo.regionName,
      city: geo.city,
      district: geo.district ?? '',
      zip: geo.zip ?? '',
      lat: geo.lat,
      lon: geo.lon,
      timezone: geo.timezone,
      isp: geo.isp,
      org: geo.org,
      page,
      referrer,
      userAgent: ua,
      browser,
      os,
      device,
      language,
      sessionId,
    }

    // Store as JSON in S3: analytics/YYYY/MM/DD/<timestamp>-<ip>.json
    const now = new Date()
    const key = `analytics/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${String(now.getUTCDate()).padStart(2, '0')}/${Date.now()}-${ip.replace(/\./g, '_')}.json`

    await s3.send(new PutObjectCommand({
      Bucket: ANALYTICS_BUCKET,
      Key: key,
      Body: JSON.stringify(visitor, null, 2),
      ContentType: 'application/json',
    }))
  } catch (err) {
    // Never let analytics crash the main request
    console.error('[analytics] failed:', err)
  }
}
