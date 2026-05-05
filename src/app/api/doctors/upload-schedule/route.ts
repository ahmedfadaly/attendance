import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getCollection, getDoc, createDoc, updateDoc, nowISO, generateId } from '@/lib/firebase-db'
import { verifyAuth, requireRole } from '@/lib/auth'

// POST /api/doctors/upload-schedule
// Upload Excel/CSV file with schedule data
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user || !requireRole(user, ['worker', 'manager', 'super_admin'])) {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'الملف مطلوب' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    })

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'الملف فارغ' },
        { status: 400 }
      )
    }

    const summary = {
      totalDoctors: 0,
      createdSchedules: 0,
      updatedSchedules: 0,
      errors: [] as string[],
    }

    // Get all doctors for lookup
    const allDoctors = await getCollection('doctors')
    const doctorsByCode = new Map<string, any>()
    for (const d of allDoctors) {
      if (d.code) doctorsByCode.set(d.code, d)
    }

    // Detect format based on column headers
    const headers = Object.keys(rows[0])
    const hasDateColumn = headers.some(
      (h) => h.includes('تاريخ') || h.toLowerCase() === 'date'
    )
    const hasShiftColumn = headers.some(
      (h) =>
        h.includes('وردية') ||
        h.toLowerCase() === 'shift'
    )

    // Format 2: Row-per-entry (code, name, date, shift)
    if (hasDateColumn && hasShiftColumn) {
      return await processFormat2(rows, summary, doctorsByCode)
    }

    // Format 1: Row-per-doctor (code, name, days 1-31 with ص/م)
    return await processFormat1(headers, rows, summary, doctorsByCode)
  } catch (error) {
    console.error('Upload schedule error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// Format 1: Column A=code, B=name, C-AG=days 1-31 with ص/م
async function processFormat1(
  headers: string[],
  rows: Record<string, unknown>[],
  summary: { totalDoctors: number; createdSchedules: number; updatedSchedules: number; errors: string[] },
  doctorsByCode: Map<string, any>
) {
  // Get current month
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  // Get all existing schedules for lookup
  const allSchedules = await getCollection('schedules')

  for (const row of rows) {
    const code = String(row[headers[0]] || '').trim()
    const doctorName = String(row[headers[1]] || '').trim()

    if (!code || !doctorName) continue

    // Find doctor by code
    const doctor = doctorsByCode.get(code)
    if (!doctor) {
      summary.errors.push(`الطبيب برمز ${code} غير موجود`)
      continue
    }

    summary.totalDoctors++
    const scheduleDays: { date: string; shift: string; notes?: string }[] = []

    // Process day columns (index 2 onwards, up to daysInMonth)
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const colIndex = dayNum + 1 // +1 because 0=code, 1=name
      const cellValue = String(row[headers[colIndex]] || '').trim()

      if (!cellValue) continue

      let shift: string | null = null
      if (cellValue === 'ص' || cellValue.toLowerCase() === 'morning' || cellValue.includes('صباح')) {
        shift = 'morning'
      } else if (cellValue === 'م' || cellValue.toLowerCase() === 'evening' || cellValue.includes('مسائ')) {
        shift = 'evening'
      }

      if (shift) {
        const dateStr = `${month}-${String(dayNum).padStart(2, '0')}`
        scheduleDays.push({ date: dateStr, shift })
      }
    }

    if (scheduleDays.length === 0) continue

    // Create/update schedule in Firebase
    try {
      const existingSchedule = allSchedules.find(
        (s: any) => s.doctorId === doctor.id && s.month === month
      )

      const timestamp = nowISO()
      const daysObject: Record<string, any> = {}

      for (const d of scheduleDays) {
        const dayId = generateId()
        daysObject[dayId] = {
          date: d.date,
          shift: d.shift,
          departmentId: doctor.departmentId || '',
          departmentName: doctor.departmentName || '',
          status: 'scheduled',
          isCounted: true,
          changeRequestId: '',
          notes: '',
          createdAt: timestamp,
          updatedAt: timestamp,
        }
      }

      if (existingSchedule) {
        await updateDoc(`/schedules/${existingSchedule.id}`, {
          requiredDays: scheduleDays.length,
          days: daysObject,
          updatedAt: timestamp,
        })
        summary.updatedSchedules++
      } else {
        await createDoc('schedules', {
          doctorId: doctor.id,
          month,
          requiredDays: scheduleDays.length,
          days: daysObject,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        summary.createdSchedules++
      }
    } catch (err) {
      summary.errors.push(`خطأ في معالجة جدول الطبيب ${doctorName}: ${String(err)}`)
    }
  }

  return NextResponse.json({
    message: 'تم استيراد الجداول بنجاح',
    summary,
  })
}

// Format 2: Row-per-entry (code, name, date, shift)
async function processFormat2(
  rows: Record<string, unknown>[],
  summary: { totalDoctors: number; createdSchedules: number; updatedSchedules: number; errors: string[] },
  doctorsByCode: Map<string, any>
) {
  // Group entries by doctor and month
  const doctorEntries: Record<string, { doctorName: string; code: string; days: { date: string; shift: string }[] }> = {}

  for (const row of rows) {
    const values = Object.values(row).map(String)
    const code = values[0]?.trim()
    const doctorName = values[1]?.trim()
    const dateRaw = values[2]?.trim()
    const shiftRaw = values[3]?.trim()

    if (!code || !dateRaw || !shiftRaw) continue

    let shift: string | null = null
    if (shiftRaw === 'صباحي' || shiftRaw === 'ص' || shiftRaw.toLowerCase() === 'morning') {
      shift = 'morning'
    } else if (shiftRaw === 'مسائي' || shiftRaw === 'م' || shiftRaw.toLowerCase() === 'evening') {
      shift = 'evening'
    }

    if (!shift) continue

    // Parse date - try YYYY-MM-DD or DD/MM/YYYY
    let dateStr = dateRaw
    if (dateRaw.includes('/')) {
      const parts = dateRaw.split('/')
      if (parts.length === 3) {
        // Try DD/MM/YYYY
        const d = parts[0].padStart(2, '0')
        const m = parts[1].padStart(2, '0')
        const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2]
        dateStr = `${y}-${m}-${d}`
      }
    }

    const month = dateStr.substring(0, 7) // YYYY-MM
    const key = `${code}-${month}`

    if (!doctorEntries[key]) {
      doctorEntries[key] = { code, doctorName, days: [] }
    }

    // Check for duplicate date
    const existingDay = doctorEntries[key].days.find((d) => d.date === dateStr)
    if (!existingDay) {
      doctorEntries[key].days.push({ date: dateStr, shift })
    }
  }

  // Get all existing schedules
  const allSchedules = await getCollection('schedules')

  // Process each doctor's entries
  for (const [key, entries] of Object.entries(doctorEntries)) {
    const { code, doctorName, days } = entries

    const doctor = doctorsByCode.get(code)
    if (!doctor) {
      summary.errors.push(`الطبيب برمز ${code} غير موجود`)
      continue
    }

    summary.totalDoctors++

    if (days.length === 0) continue

    const month = key.split('-').slice(0, 2).join('-')

    try {
      const existingSchedule = allSchedules.find(
        (s: any) => s.doctorId === doctor.id && s.month === month
      )

      const timestamp = nowISO()
      const daysObject: Record<string, any> = {}

      for (const d of days) {
        const dayId = generateId()
        daysObject[dayId] = {
          date: d.date,
          shift: d.shift,
          departmentId: doctor.departmentId || '',
          departmentName: doctor.departmentName || '',
          status: 'scheduled',
          isCounted: true,
          changeRequestId: '',
          notes: '',
          createdAt: timestamp,
          updatedAt: timestamp,
        }
      }

      if (existingSchedule) {
        await updateDoc(`/schedules/${existingSchedule.id}`, {
          requiredDays: days.length,
          days: daysObject,
          updatedAt: timestamp,
        })
        summary.updatedSchedules++
      } else {
        await createDoc('schedules', {
          doctorId: doctor.id,
          month,
          requiredDays: days.length,
          days: daysObject,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        summary.createdSchedules++
      }
    } catch (err) {
      summary.errors.push(`خطأ في معالجة جدول الطبيب ${doctorName}: ${String(err)}`)
    }
  }

  return NextResponse.json({
    message: 'تم استيراد الجداول بنجاح',
    summary,
  })
}
