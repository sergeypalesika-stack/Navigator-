import { NextResponse } from "next/server"

// Try to fetch rates from valueplusexchange.com
// Falls back to open.er-api.com if unavailable
const CURRENCIES = ["USD", "EUR", "RUB", "CNY"]

async function fetchValuePlus() {
  // Common API endpoints to try
  const endpoints = [
    "https://www.valueplusexchange.com/api/rates",
    "https://www.valueplusexchange.com/api/exchange-rates",
    "https://www.valueplusexchange.com/rates.json",
    "https://api.valueplusexchange.com/rates",
    "https://www.valueplusexchange.com/api/currencies",
  ]

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json",
        },
        next: { revalidate: 3600 }, // Cache 1 hour
      })
      if (!res.ok) continue
      const data = await res.json()
      
      // Try to extract buy rates — different possible structures
      const rates: Record<string, number> = {}
      
      // Structure 1: { rates: [ { currency: "USD", buy: 33.5 } ] }
      if (Array.isArray(data?.rates)) {
        for (const item of data.rates) {
          const code = item.currency || item.code || item.symbol
          const buy = item.buy || item.buying || item.buyRate || item.buy_rate
          if (CURRENCIES.includes(code) && buy) rates[code] = parseFloat(buy)
        }
      }
      // Structure 2: { USD: { buy: 33.5 }, EUR: { buy: 36.2 } }
      for (const cur of CURRENCIES) {
        if (data?.[cur]?.buy) rates[cur] = parseFloat(data[cur].buy)
        if (data?.[cur]?.buying) rates[cur] = parseFloat(data[cur].buying)
      }
      // Structure 3: flat { USD_buy: 33.5 }
      for (const cur of CURRENCIES) {
        if (data?.[`${cur}_buy`]) rates[cur] = parseFloat(data[`${cur}_buy`])
      }
      
      if (Object.keys(rates).length > 0) {
        return { rates, source: "valueplusexchange.com", url }
      }
    } catch {
      continue
    }
  }
  return null
}

async function fetchFallback() {
  const res = await fetch("https://open.er-api.com/v6/latest/THB", {
    next: { revalidate: 3600 }
  })
  const data = await res.json()
  const rates: Record<string, number> = {}
  for (const cur of CURRENCIES) {
    if (data.rates?.[cur]) {
      // THB→currency, invert to get currency→THB
      rates[cur] = Math.round((1 / data.rates[cur]) * 10000) / 10000
    }
  }
  return { rates, source: "open.er-api.com" }
}

export async function GET() {
  try {
    // Try valueplusexchange first
    const vpResult = await fetchValuePlus()
    if (vpResult) {
      return NextResponse.json({
        success: true,
        ...vpResult,
        updated: new Date().toISOString(),
      }, {
        headers: {
          "Cache-Control": "public, max-age=3600",
        }
      })
    }

    // Fallback to open exchange rates
    const fallback = await fetchFallback()
    return NextResponse.json({
      success: true,
      ...fallback,
      updated: new Date().toISOString(),
    }, {
      headers: {
        "Cache-Control": "public, max-age=3600",
      }
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
