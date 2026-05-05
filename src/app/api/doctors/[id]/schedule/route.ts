import { NextRequest, NextResponse } from 'next/server'
import { getDoc, getCollection, createDoc, updateDoc, setDoc, nowISO, generateId } from '@/lib/firebase-db'
import { verifyAuth, requireRole } from '@/lib/auth'

// GET /api/doctors/[id]/schedule?month=YYYY-MM
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')

    if (!month) {
      return NextResponse.json(
        { error: 'معامل الشهر مطلوب (YYYY-MM)' },
        { status: 400 }
      )
    }

    const doctor = await getDoc(`/doctors/${id}`)
    if (!doctor) {
      return NextResponse.json(
        { error: 'الطبيب غير موجود' },
        { status: 404 }
      )
    }

    // Find schedule for this doctor+month
    const allSchedules = await getCollection('schedules')
    const schedule = allSchedules.find(
      (s: any) => s.doctorId === id && s.month === month
    ) || null

    if (schedule && schedule.days) {
      // Convert nested days to array
      const days = Object.entries(schedule.days)
        .map(([dayId, dayData]: [string, any]) => ({
          id: dayId,
          ...dayData,
          scheduleId: schedule.id,
          doctorId: id,
        }))
        .sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''))

      return NextResponse.json({
        schedule: {
          ...schedule,
          scheduleDays: days,
        },
      })
    }

    return NextResponse.json({ schedule: null })
  } catch (error) {
    console.error('Doctor schedule GET error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// POST /api/doctors/[id]/schedule
// Body: { month, requiredDays?, days: [{date, shift, departmentId?, notes?}] }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request)
    if (!user || !requireRole(user, ['worker', 'manager', 'super_admin'])) {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { month, requiredDays, days } = body

    if (!month) {
      return NextResponse.json(
        { error: 'الشهر مطلوب' },
        { status: 400 }
      )
    }

    if (!days || !Array.isArray(days)) {
      return NextResponse.json(
        { error: 'أيام الجدول مطلوبة' },
        { status: 400 }
      )
    }

    // Validate each day
    for (const day of days) {
      if (!day.date || !day.shift) {
        return NextResponse.json(
          { error: 'كل يوم يجب أن يحتوي على تاريخ ووردية' },
          { status: 400 }
        )
      }
      if (!['morning', 'evening'].includes(day.shift)) {
        return NextResponse.json(
          { error: 'الوردية يجب أن تكون صباحية أو مسائية' },
          { status: 400 }
        )
      }
    }

    const doctor = await getDoc(`/doctors/${id}`)
    if (!doctor) {
      return NextResponse.json(
        { error: 'الطبيب غير موجود' },
        { status: 404 }
      )
    }

    // Validate department IDs if provided and build days object
    const departments = await getCollection('departments')
    const deptMap = new Map<string, any>()
    for (const dept of departments) {
      deptMap.set(dept.id, dept)
    }

    const daysObject: Record<string, any> = {}
    for (const day of days) {
      let deptName = doctor.departmentName || ''
      if (day.departmentId) {
        const dept = deptMap.get(day.departmentId)
        if (!dept) {
          return NextResponse.json(
            { error: `القسم غير موجود لليوم ${day.date}` },
            { status: 400 }
          )
        }
        deptName = dept.name
      }

      const dayId = generateId()
      daysObject[dayId] = {
        date: day.date,
        shift: day.shift,
        departmentId: day.departmentId || doctor.departmentId || '',
        departmentName: deptName,
        status: 'scheduled',
        isCounted: true,
        changeRequestId: '',
        notes: day.notes || '',
        createdAt: nowISO(),
        updatedAt: nowISO(),
      }
    }

    const timestamp = nowISO()

    // Check if schedule exists for this doctor+month
    const allSchedules = await getCollection('schedules')
    const existingSchedule = allSchedules.find(
      (s: any) => s.doctorId === id && s.month === month
    )

    let scheduleId: string
    let resultSchedule: any

    if (existingSchedule) {
      // Update existing schedule - replace days
      scheduleId = existingSchedule.id
      await updateDoc(`/schedules/${scheduleId}`, {
        requiredDays: requiredDays ?? days.length,
        days: daysObject,
        updatedAt: timestamp,
      })

      resultSchedule = {
        id: scheduleId,
        doctorId: id,
        month,
        requiredDays: requiredDays ?? days.length,
        days: daysObject,
        createdAt: existingSchedule.createdAt,
        updatedAt: timestamp,
      }
    } else {
      // Create new schedule
      scheduleId = await createDoc('schedules', {
        doctorId: id,
        month,
        requiredDays: requiredDays ?? days.length,
        days: daysObject,
        createdAt: timestamp,
        updatedAt: timestamp,
      })

      resultSchedule = {
        id: scheduleId,
        doctorId: id,
        month,
        requiredDays: requiredDays ?? days.length,
        days: daysObject,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
    }

    // Convert days to array for response
    const scheduleDays = Object.entries(daysObject)
      .map(([dayId, dayData]) => ({
        id: dayId,
        ...dayData,
        scheduleId,
        doctorId: id,
      }))
      .sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''))

    return NextResponse.json(
      {
        schedule: {
          ...resultSchedule,
          scheduleDays,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Doctor schedule POST error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}
