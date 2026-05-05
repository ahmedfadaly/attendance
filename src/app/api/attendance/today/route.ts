import { NextRequest, NextResponse } from 'next/server'
import { getCollection, getDoc } from '@/lib/firebase-db'
import { verifyAuth } from '@/lib/auth'

// GET /api/attendance/today
// Returns all doctors scheduled for today with their attendance
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 401 })
    }

    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    // Get all schedules
    const allSchedules = await getCollection('schedules')

    // Get all doctors
    const allDoctors = await getCollection('doctors')

    // Build doctor map for quick lookup
    const doctorMap = new Map<string, any>()
    for (const doctor of allDoctors) {
      doctorMap.set(doctor.id, doctor)
    }

    // Find all schedule days matching today's date
    const morningDoctors: {
      doctorId: string
      doctorName: string
      departmentId?: string
      departmentName?: string
      scheduleDayId: string
      scheduleId: string
      scheduleStatus: string
      isCounted: boolean
      attendance: any | null
    }[] = []

    const eveningDoctors: {
      doctorId: string
      doctorName: string
      departmentId?: string
      departmentName?: string
      scheduleDayId: string
      scheduleId: string
      scheduleStatus: string
      isCounted: boolean
      attendance: any | null
    }[] = []

    // Track doctorId+shift pairs to avoid duplicates from multiple schedules
    const seenKeys = new Set<string>()

    for (const schedule of allSchedules) {
      if (!schedule.days) continue

      // Get doctor info
      const doctor = doctorMap.get(schedule.doctorId)
      if (!doctor || !doctor.active) continue

      // Look through nested days for today
      for (const [dayId, dayData] of Object.entries(schedule.days)) {
        const day = dayData as any
        if (day.date !== todayStr) continue

        const key = `${schedule.doctorId}-${day.shift}`
        if (seenKeys.has(key)) continue
        seenKeys.add(key)

        const deptId = day.departmentId || doctor.departmentId || ''
        const deptName = day.departmentName || doctor.departmentName || ''

        const entry = {
          doctorId: schedule.doctorId,
          doctorName: doctor.fullName,
          departmentId: deptId || undefined,
          departmentName: deptName || undefined,
          scheduleDayId: dayId,
          scheduleId: schedule.id,
          scheduleStatus: day.status || 'scheduled',
          isCounted: day.isCounted !== false,
          attendance: null as any,
        }

        if (day.shift === 'morning') {
          morningDoctors.push(entry)
        } else {
          eveningDoctors.push(entry)
        }
      }
    }

    // Get all attendance records for today
    const allAttendance = await getCollection('attendance')
    const todayAttendance = allAttendance.filter((r: any) => r.date === todayStr)

    // Build a map of attendance records by doctorId+shift
    const attendanceMap = new Map<string, any>()
    for (const record of todayAttendance) {
      const key = `${record.doctorId}-${record.shift}`
      attendanceMap.set(key, record)
    }

    // Attach attendance to entries
    for (const entry of morningDoctors) {
      const key = `${entry.doctorId}-morning`
      entry.attendance = attendanceMap.get(key) || null
    }
    for (const entry of eveningDoctors) {
      const key = `${entry.doctorId}-evening`
      entry.attendance = attendanceMap.get(key) || null
    }

    return NextResponse.json({
      date: todayStr,
      morning: morningDoctors,
      evening: eveningDoctors,
    })
  } catch (error) {
    console.error('Attendance today GET error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}
