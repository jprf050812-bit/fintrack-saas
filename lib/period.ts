// Period helpers for the dashboard. Dates are handled in UTC using the
// Brazilian calendar day (UTC-3), matching how transaction dates are stored
// (the form saves a plain date, i.e. midnight UTC).

export type RangeKey = "today" | "week" | "month" | "3months" | "year" | "custom"
export type Bucket = "day" | "month"

export interface Period {
  range: RangeKey
  start: Date
  end: Date // exclusive
  prevStart: Date
  prevEnd: Date // exclusive
  bucket: Bucket
  label: string
}

const DAY = 86_400_000
const BR_OFFSET = 3 * 3_600_000
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
const MONTHS_LONG = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

const utc = (y: number, m: number, d = 1) => new Date(Date.UTC(y, m, d))
const fmtBr = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`

function parseDay(s?: string | null) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const t = Date.parse(`${s}T00:00:00Z`)
  return Number.isNaN(t) ? null : new Date(t)
}

export function resolvePeriod(
  rangeParam?: string | null,
  from?: string | null,
  to?: string | null,
  nowMs = Date.now()
): Period {
  const br = new Date(nowMs - BR_OFFSET)
  const y = br.getUTCFullYear()
  const m = br.getUTCMonth()
  const today = utc(y, m, br.getUTCDate())

  switch (rangeParam) {
    case "today":
      return {
        range: "today", start: today, end: new Date(+today + DAY),
        prevStart: new Date(+today - DAY), prevEnd: today, bucket: "day", label: "Hoje",
      }
    case "week": {
      const start = new Date(+today - 6 * DAY)
      return {
        range: "week", start, end: new Date(+today + DAY),
        prevStart: new Date(+start - 7 * DAY), prevEnd: start, bucket: "day", label: "Últimos 7 dias",
      }
    }
    case "3months": {
      const start = utc(y, m - 2)
      return {
        range: "3months", start, end: utc(y, m + 1),
        prevStart: utc(y, m - 5), prevEnd: start, bucket: "month", label: "Últimos 3 meses",
      }
    }
    case "year": {
      const start = utc(y, 0)
      return {
        range: "year", start, end: utc(y + 1, 0),
        prevStart: utc(y - 1, 0), prevEnd: start, bucket: "month", label: `Ano de ${y}`,
      }
    }
    case "custom": {
      const f = parseDay(from)
      const t = parseDay(to)
      if (f && t && +t >= +f && (+t - +f) / DAY < 3660) {
        const end = new Date(+t + DAY)
        const days = (+end - +f) / DAY
        return {
          range: "custom", start: f, end,
          prevStart: new Date(+f - (+end - +f)), prevEnd: f,
          bucket: days <= 62 ? "day" : "month",
          label: `${fmtBr(f)} a ${fmtBr(t)}`,
        }
      }
      break // invalid custom range: fall back to the current month
    }
  }

  const start = utc(y, m)
  return {
    range: "month", start, end: utc(y, m + 1),
    prevStart: utc(y, m - 1), prevEnd: start, bucket: "day",
    label: `${MONTHS_LONG[m]} de ${y}`,
  }
}

export interface BucketDef {
  key: string
  label: string
}

export function buildBuckets(start: Date, end: Date, bucket: Bucket): BucketDef[] {
  const out: BucketDef[] = []
  if (bucket === "day") {
    for (let t = +start; t < +end && out.length < 400; t += DAY) {
      const d = new Date(t)
      out.push({
        key: d.toISOString().slice(0, 10),
        label: `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      })
    }
  } else {
    let d = utc(start.getUTCFullYear(), start.getUTCMonth())
    while (+d < +end && out.length < 130) {
      out.push({
        key: d.toISOString().slice(0, 7),
        label: `${MONTHS[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`,
      })
      d = utc(d.getUTCFullYear(), d.getUTCMonth() + 1)
    }
  }
  return out
}

export function bucketKey(date: Date, bucket: Bucket) {
  const iso = date.toISOString()
  return bucket === "day" ? iso.slice(0, 10) : iso.slice(0, 7)
}
