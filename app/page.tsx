"use client"

import { useState, useMemo, useEffect } from "react"
import * as XLSX from "xlsx"

interface Voucher {
  vId: string
  hotel: string
  guide: string
  pickup: string
  flightDate: string
  flightTime: string
  flightNo: string
  tourists: string[]
  phones: string[]
  departureDate: string
}

function formatExcelValue(v: any): string {
  if (v === undefined || v === null || String(v).trim() === "" || String(v).trim() === "0") return ""
  if (typeof v === "number") {
    if (v > 0 && v < 1) {
      const totalSeconds = Math.round(v * 24 * 3600)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
    }
    if (v >= 1 && v < 3) {
      const frac = v % 1
      const totalSeconds = Math.round(frac * 24 * 3600)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
    }
    if (v > 40000) {
      const date = XLSX.SSF.parse_date_code(v)
      return `${String(date.d).padStart(2, "0")}.${String(date.m).padStart(2, "0")}.${date.y}`
    }
  }
  const s = String(v).trim()
  const timeMatch = s.match(/^(\d{1,2}):(\d{2})$/)
  if (timeMatch) return `${String(timeMatch[1]).padStart(2, "0")}:${timeMatch[2]}`
  return s
}

function generateMessage(v: Voucher): string {
  const text = `🛫🛫 ИНФОРМАЦИЯ О ВЫЕЗДЕ В АЭРОПОРТ

🗓 ДАТА ВЫЕЗДА ИЗ ОТЕЛЯ: ${v.departureDate}
⏰ ВРЕМЯ СБОРА (PICK UP): ${v.pickup}

---

✈️ ИНФОРМАЦИЯ О РЕЙСЕ:
🔹 Номер рейса: ${v.flightNo}
🔹 Дата вылета: ${v.flightDate}
🔹 Время вылета: ${v.flightTime}

---

✅ УВАЖАЕМЫЕ ГОСТИ!

Пожалуйста, подготовьтесь к выезду заранее:

1. Подойдите на ресепшн заблаговременно (за 15-20 минут), чтобы:
• сдать номер;
• оплатить все счета за услуги отеля.

Сделайте это до прибытия транспорта, чтобы не задерживать трансфер.

---

☎️ ГОРЯЧАЯ ЛИНИЯ:
📞 +66 92 249 49 49
💬 WhatsApp / Telegram: +66 92 279 09 90

✨ Желаем вам приятного полёта!`
  return encodeURIComponent(text)
}

export default function Page() {
  const [data, setData] = useState<Voucher[]>([])
  const [notifiedVouchers, setNotifiedVouchers] = useState<Record<string, boolean>>({})
  const [touristSearch, setTouristSearch] = useState("")
  const [selectedGuide, setSelectedGuide] = useState("")
  const [dark, setDark] = useState(true)
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({})
  const [fileName, setFileName] = useState("")

  useEffect(() => {
    const savedData = localStorage.getItem("transferData")
    const savedNotified = localStorage.getItem("notifiedVouchers")
    const savedDark = localStorage.getItem("navDark")
    if (savedData) setData(JSON.parse(savedData))
    if (savedNotified) setNotifiedVouchers(JSON.parse(savedNotified))
    if (savedDark !== null) setDark(savedDark === "1")
  }, [])

  useEffect(() => { localStorage.setItem("notifiedVouchers", JSON.stringify(notifiedVouchers)) }, [notifiedVouchers])
  useEffect(() => { localStorage.setItem("navDark", dark ? "1" : "0") }, [dark])

  const guideOptions = useMemo(() => {
    const set = new Set(data.map(v => v.guide).filter(Boolean))
    return Array.from(set).sort()
  }, [data])

  function handleFile(e: any) {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (evt: any) => {
      try {
        const bytes = new Uint8Array(evt.target.result)
        const workbook = XLSX.read(bytes, { type: "array" })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })

        let pickupIdx = 24
        for (const row of rows) {
          let found = false
          row.forEach((cell, idx) => {
            if (String(cell).toLowerCase().replace(/\s+/g, " ").trim() === "dep. time") {
              pickupIdx = idx
              found = true
            }
          })
          if (found) break
        }

        const vouchers: Record<string, Voucher> = {}
        let currentHotel = "Отель не определен"
        let currentGuide = "Гид не указан"

        rows.forEach((row) => {
          if (!row || row.length < 5) return
          const firstCell = String(row[0] || "").trim()

          if (firstCell.includes("Hotel:") || firstCell.includes("Check-out:")) {
            const rowStr = row.join(" ")
            const hMatch = rowStr.match(/Hotel:\s*(.*?)\s*GUIDE:/i)
            const gMatch = rowStr.match(/GUIDE:\s*(.*)/i)
            if (hMatch) currentHotel = hMatch[1].trim()
            if (gMatch) currentGuide = gMatch[1].trim()
            return
          }

          const vId = String(row[2] || "").trim()
          if (!vId || vId.length < 5 || isNaN(Number(vId))) return

          const pickupVal = formatExcelValue(row[pickupIdx])
          const flightDateVal = formatExcelValue(row[29])
          const departureDateVal = formatExcelValue(row[21])

          if (!vouchers[vId]) {
            vouchers[vId] = {
              vId,
              hotel: currentHotel,
              guide: currentGuide,
              pickup: pickupVal || "—",
              flightDate: flightDateVal || "—",
              flightTime: formatExcelValue(row[27]) || "—",
              flightNo: String(row[28] || "").trim() || "—",
              departureDate: departureDateVal || "—",
              tourists: [],
              phones: [],
            }
          }

          if (pickupVal && vouchers[vId].pickup === "—") vouchers[vId].pickup = pickupVal
          if (flightDateVal && vouchers[vId].flightDate === "—") vouchers[vId].flightDate = flightDateVal
          if (departureDateVal && vouchers[vId].departureDate === "—") vouchers[vId].departureDate = departureDateVal

          const fullName = `${row[4]} ${row[5]}`.trim()
          if (fullName && !fullName.toLowerCase().includes("tourist") && !vouchers[vId].tourists.includes(fullName)) {
            vouchers[vId].tourists.push(fullName)
          }

          const ph = String(row[8] || row[25] || "").replace(/[^\d+]/g, "")
          if (ph && !vouchers[vId].phones.includes(ph)) vouchers[vId].phones.push(ph)
        })

        const result = Object.values(vouchers).sort((a, b) => {
          if (a.pickup === "—" && b.pickup !== "—") return 1
          if (a.pickup !== "—" && b.pickup === "—") return -1
          return a.pickup.localeCompare(b.pickup)
        })

        setData(result)
        setNotifiedVouchers({})
        setCollapsedDates({})
        setSelectedGuide("")
        localStorage.setItem("transferData", JSON.stringify(result))
      } catch {
        alert("Ошибка чтения файла")
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function toggleNotify(vId: string) {
    setNotifiedVouchers(prev => ({ ...prev, [vId]: !prev[vId] }))
  }

  const filtered = useMemo(() => {
    const q = touristSearch.toLowerCase().trim()
    return data.filter(v => {
      const matchesGuide = selectedGuide === "" || v.guide === selectedGuide
      if (!matchesGuide) return false
      if (!q) return true
      // Search by voucher ID
      if (v.vId.toLowerCase().includes(q)) return true
      // Search by tourist full name or last name
      if (v.tourists.some(t => t.toLowerCase().includes(q))) return true
      return false
    })
  }, [data, touristSearch, selectedGuide])

  const grouped = useMemo(() => {
    const map: Record<string, Voucher[]> = {}
    filtered.forEach(v => {
      const key = v.flightDate === "—" ? "📅 Дата не указана" : `✈️ ${v.flightDate}`
      if (!map[key]) map[key] = []
      map[key].push(v)
    })
    return Object.entries(map).sort(([a], [b]) => {
      if (a.includes("не указана")) return 1
      if (b.includes("не указана")) return -1
      const parseDate = (s: string) => {
        const m = s.replace("✈️ ", "").match(/(\d{2})\.(\d{2})\.(\d{4})/)
        if (!m) return ""
        return `${m[3]}${m[2]}${m[1]}`
      }
      return parseDate(a).localeCompare(parseDate(b))
    })
  }, [filtered])

  function exportXLSX() {
    const rows = [
      ["Ваучер", "Отель", "Гид", "Дата выезда", "Pick Up", "Дата рейса", "Время рейса", "Рейс", "Туристы", "Телефоны", "Статус"],
      ...filtered.map(v => [
        v.vId, v.hotel, v.guide, v.departureDate, v.pickup,
        v.flightDate, v.flightTime, v.flightNo,
        v.tourists.join("; "), v.phones.join("; "),
        notifiedVouchers[v.vId] ? "✅ Уведомлён" : "⏳ Ожидает",
      ])
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws["!cols"] = [10, 30, 20, 14, 10, 14, 12, 12, 40, 20, 14].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Трансферы")
    XLSX.writeFile(wb, `navigator_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const t = {
    bg:         dark ? "#0b1120" : "#f0f4f8",
    card:       dark ? "#131d2e" : "#ffffff",
    cardBorder: dark ? "#1e2f45" : "#d1dce8",
    text:       dark ? "#e2eaf4" : "#1a2636",
    muted:      dark ? "#5b7a9a" : "#6e8aa8",
    accent:     dark ? "#38bdf8" : "#0369a1",
    header:     dark ? "#0d1929" : "#e2ecf7",
    inputBg:    dark ? "#101c2d" : "#ffffff",
    inputBdr:   dark ? "#1e3450" : "#c5d5e5",
  }

  const done = filtered.filter(v => notifiedVouchers[v.vId]).length
  const pct = filtered.length ? Math.round((done / filtered.length) * 100) : 0

  function badge(v: Voucher) {
    if (v.pickup === "—") return { label: "⚠ УТОЧНИТЬ", bg: "#7f1d1d", color: "#fecaca", border: "#ef4444" }
    if (notifiedVouchers[v.vId]) return { label: "✅ Отправлено", bg: dark ? "#14532d" : "#dcfce7", color: dark ? "#4ade80" : "#15803d", border: "#16a34a" }
    return { label: "⏳ Ожидает", bg: dark ? "#0c2340" : "#e0f0ff", color: dark ? "#38bdf8" : "#0369a1", border: dark ? "#1e3f6a" : "#93c5fd" }
  }

  const selectStyle: React.CSSProperties = {
    flex: 1, padding: "9px 12px", fontSize: "13px", borderRadius: "8px",
    background: t.inputBg, border: `1px solid ${t.inputBdr}`,
    color: selectedGuide ? t.text : t.muted, outline: "none", cursor: "pointer",
    appearance: "none", WebkitAppearance: "none",
  }

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif", transition: "background 0.3s, color 0.3s" }}>

      {/* Header */}
      <header style={{ background: t.header, borderBottom: `1px solid ${t.cardBorder}`, padding: "12px 16px", position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(8px)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px" }}>🚐 Navigator</span>
              {fileName && <span style={{ fontSize: "11px", color: t.muted, maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <label style={{ fontSize: "12px", background: t.accent, color: "#fff", padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}>
                📂 Загрузить
                <input type="file" onChange={handleFile} accept=".xlsx,.xls" style={{ display: "none" }} />
              </label>
              {data.length > 0 && (
                <button onClick={exportXLSX} style={{ fontSize: "12px", background: "#16a34a", color: "#fff", padding: "7px 14px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}>
                  ⬇ Экспорт XLSX
                </button>
              )}
              <button onClick={() => setDark(d => !d)} style={{ fontSize: "18px", background: "transparent", border: `1px solid ${t.cardBorder}`, borderRadius: "8px", padding: "5px 10px", cursor: "pointer" }}>
                {dark ? "☀️" : "🌙"}
              </button>
            </div>
          </div>
          {filtered.length > 0 && (
            <div style={{ marginTop: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: t.muted, marginBottom: "4px" }}>
                <span>Уведомлено: {done} из {filtered.length}</span>
                <span>{pct}%</span>
              </div>
              <div style={{ height: "6px", borderRadius: "99px", background: t.cardBorder, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #22c55e, #16a34a)", borderRadius: "99px", transition: "width 0.4s ease" }} />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Filters */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "12px 16px 0" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            placeholder="🔍 Поиск по туристу, фамилии или ваучеру..."
            value={touristSearch}
            onChange={e => setTouristSearch(e.target.value)}
            style={{ flex: 1, padding: "9px 12px", fontSize: "13px", borderRadius: "8px", background: t.inputBg, border: `1px solid ${t.inputBdr}`, color: t.text, outline: "none" }}
          />
          <div style={{ flex: 1, position: "relative" }}>
            <select value={selectedGuide} onChange={e => setSelectedGuide(e.target.value)} style={selectStyle}>
              <option value="">👤 Все гиды</option>
              {guideOptions.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: t.muted, fontSize: "11px" }}>▼</span>
            {selectedGuide && (
              <button onClick={() => setSelectedGuide("")} style={{ position: "absolute", right: "28px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: t.muted, cursor: "pointer", fontSize: "14px", lineHeight: 1 }}>✕</button>
            )}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {data.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 20px", color: t.muted }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📋</div>
          <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>Файл не загружен</div>
          <div style={{ fontSize: "13px" }}>Нажмите «Загрузить» и выберите Excel-файл с трансферами</div>
        </div>
      )}

      {/* Cards */}
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px" }}>
        {grouped.map(([dateLabel, vouchers]) => {
          const isCollapsed = collapsedDates[dateLabel]
          const groupDone = vouchers.filter(v => notifiedVouchers[v.vId]).length
          return (
            <div key={dateLabel} style={{ marginBottom: "24px" }}>
              <button
                onClick={() => setCollapsedDates(prev => ({ ...prev, [dateLabel]: !prev[dateLabel] }))}
                style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", background: "transparent", border: "none", cursor: "pointer", marginBottom: "10px", padding: "4px 0", color: t.text }}
              >
                <span style={{ fontSize: "15px", fontWeight: 700 }}>{dateLabel}</span>
                <span style={{ fontSize: "12px", color: t.muted, background: t.cardBorder, borderRadius: "99px", padding: "2px 8px" }}>{groupDone}/{vouchers.length} уведомлено</span>
                <span style={{ marginLeft: "auto", fontSize: "12px", color: t.muted, transform: isCollapsed ? "rotate(-90deg)" : "rotate(0)", transition: "transform 0.2s" }}>▼</span>
              </button>

              {!isCollapsed && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "10px" }}>
                  {vouchers.map((v, i) => {
                    const isDone = !!notifiedVouchers[v.vId]
                    const isProblem = v.pickup === "—"
                    const b = badge(v)
                    return (
                      <div key={i} style={{ background: t.card, borderRadius: "14px", border: `1.5px solid ${b.border}`, overflow: "hidden", opacity: isDone ? 0.72 : 1, transition: "opacity 0.3s", display: "flex", flexDirection: "column" }}>

                        {/* Strip */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", background: b.bg, borderBottom: `1px solid ${b.border}` }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "11px", color: b.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                              {isProblem ? "⚠ УТОЧНИТЬ ВРЕМЯ" : "PICK UP"}
                            </div>
                            {!isProblem && (
                              <div style={{ fontSize: "22px", fontWeight: 900, color: b.color, lineHeight: 1.1 }}>{v.pickup}</div>
                            )}
                            {/* ← Номер ваучера */}
                            <div style={{ fontSize: "11px", color: b.color, opacity: 0.75, marginTop: "3px", fontWeight: 600, letterSpacing: "0.3px" }}>
                              🎫 {v.vId}
                            </div>
                          </div>
                          <span style={{ fontSize: "11px", background: "rgba(0,0,0,0.2)", color: b.color, borderRadius: "6px", padding: "3px 8px", fontWeight: 700, whiteSpace: "nowrap" }}>{b.label}</span>
                          {!isProblem && (
                            <input type="checkbox" checked={isDone} onChange={() => toggleNotify(v.vId)} style={{ width: "20px", height: "20px", cursor: "pointer", flexShrink: 0 }} />
                          )}
                        </div>

                        {/* Body */}
                        <div style={{ padding: "12px", flex: 1 }}>
                          <div style={{ color: t.accent, fontWeight: 700, fontSize: "15px", marginBottom: "2px" }}>🏨 {v.hotel}</div>
                          <div style={{ color: "#fbbf24", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>👤 {v.guide}</div>
                          <div style={{ color: t.muted, fontSize: "12px", marginBottom: "8px" }}>🗓 Выезд из отеля: <span style={{ color: t.text, fontWeight: 600 }}>{v.departureDate}</span></div>
                          <ul style={{ margin: "0 0 10px 0", paddingLeft: "16px", fontSize: "13px", color: t.text }}>
                            {v.tourists.map((tt, idx) => <li key={idx} style={{ marginBottom: "2px" }}>{tt}</li>)}
                          </ul>
                        </div>

                        {/* Phones + buttons — always at bottom */}
                        <div style={{ padding: "0 12px 12px", borderTop: `1px solid ${t.cardBorder}`, paddingTop: "10px" }}>
                          {v.phones.length === 0 && <div style={{ fontSize: "12px", color: t.muted }}>📵 Телефон не указан</div>}
                          {v.phones.map((ph, idx) => (
                            <div key={idx} style={{ marginBottom: "8px" }}>
                              <div style={{ fontSize: "12px", color: t.muted, marginBottom: "4px" }}>📱 {ph}</div>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <a
                                  href={isProblem ? undefined : `https://wa.me/${ph.replace(/\D/g, "")}?text=${generateMessage(v)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={() => !isDone && !isProblem && toggleNotify(v.vId)}
                                  style={{ flex: 1, background: isProblem ? t.cardBorder : "#15803d", color: isProblem ? t.muted : "#fff", textAlign: "center", padding: "9px 4px", borderRadius: "8px", textDecoration: "none", fontSize: "12px", fontWeight: 700, pointerEvents: isProblem ? "none" : "auto" }}
                                >
                                  WhatsApp
                                </a>
                                <a
                                  href={`tel:${ph}`}
                                  style={{ flex: 1, background: t.cardBorder, color: t.text, textAlign: "center", padding: "9px 4px", borderRadius: "8px", textDecoration: "none", fontSize: "12px", fontWeight: 700 }}
                                >
                                  Позвонить
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Footer */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", fontWeight: 600, borderTop: `1px solid ${t.cardBorder}` }}>
                          <span style={{ color: dark ? "#7dd3fc" : "#1d4ed8" }}>✈️ {v.flightNo}</span>
                          <span style={{ color: t.muted }}>📅 {v.flightDate} · {v.flightTime}</span>
                        </div>

                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </main>
    </div>
  )
}
