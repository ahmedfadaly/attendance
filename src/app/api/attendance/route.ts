import { NextRequest, NextResponse } from 'next/server'
import { getCollection, getDoc, createDoc, updateDoc, deleteDoc, nowISO } from '@/lib/firebase-db'
import { verifyAuth, requireRole } from '@/lib/auth'

// GET /api/attendance
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const month = searchParams.get('month')
    const doctorId = searchParams.get('doctorId')
    const departmentId = searchParams.get('departmentId')
    const status = searchParams.get('status')

    let records = await getCollection('attendance')

    // Client-side filtering
    if (date) {
      records = records.filter((r: any) => r.date === date)
    } else if (month) {
      records = records.filter((r: any) => r.date && r.date.startsWith(month))
    }

    if (doctorId) {
      records = records.filter((r: any) => r.doctorId === doctorId)
    }

    if (departmentId) {
      records = records.filter((r: any) => r.departmentId === departmentId)
    }

    if (status) {
      records = records.filter((r: any) => r.status === status)
    }

    // Sort by date desc, then shift asc
    records.sort((a: any, b: any) => {
      const dateCompare = (b.date || '').localeCompare(a.date || '')
      if (dateCompare !== 0) return dateCompare
      return (a.shift || '').localeCompare(b.shift || '')
    })

    return NextResponse.json({ records })
  } catch (error) {
    console.error('Attendance GET error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// POST /api/attendance
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user || !requireRole(user, ['worker', 'manager', 'super_admin'])) {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 403 })
    }

    const body = await request.json()
    const {
      doctorId,
      doctorName,
      departmentId,
      departmentName,
      date,
      shift,
      checkInTime,
      checkOutTime,
      status: attendanceStatus,
      isOfficialAttendance,
      scheduleDayId,
      changeRequestId,
      notes,
    } = body

    if (!doctorId || !doctorName || !date) {
      return NextResponse.json(
        { error: 'بيانات الطبيب والتاريخ مطلوبة' },
        { status: 400 }
      )
    }

    // Validate doctor exists
    const doctor = await getDoc(`/doctors/${doctorId}`)
    if (!doctor) {
      return NextResponse.json(
        { error: 'الطبيب غير موجود' },
        { status: 400 }
      )
    }

    // Check for duplicate attendance record (client-side filtering)
    const allAttendance = await getCollection('attendance')
    const existing = allAttendance.find(
      (r: any) =>
        r.doctorId === doctorId &&
        r.date === date &&
        r.shift === (shift || 'morning')
    )

    if (existing) {
      return NextResponse.json(
        { error: 'سجل حضور موجود مسبقاً لهذا الطبيب في هذا اليوم والوردية' },
        { status: 400 }
      )
    }

    const timestamp = nowISO()
    const newId = await createDoc('attendance', {
      doctorId,
      doctorName: doctorName || doctor.fullName,
      departmentId: departmentId || '',
      departmentName: departmentName || '',
      date,
      shift: shift || 'morning',
      checkInTime: checkInTime || '',
      checkOutTime: checkOutTime || '',
      status: attendanceStatus || 'present',
      isOfficialAttendance: isOfficialAttendance ?? true,
      scheduleDayId: scheduleDayId || '',
      changeRequestId: changeRequestId || '',
      createdBy: user.id,
      createdByRole: user.role,
      createdAt: timestamp,
      updatedAt: timestamp,
      notes: notes || '',
    })

    const record = {
      id: newId,
      doctorId,
      doctorName: doctorName || doctor.fullName,
      departmentId: departmentId || '',
      departmentName: departmentName || '',
      date,
      shift: shift || 'morning',
      checkInTime: checkInTime || '',
      checkOutTime: checkOutTime || '',
      status: attendanceStatus || 'present',
      isOfficialAttendance: isOfficialAttendance ?? true,
      scheduleDayId: scheduleDayId || '',
      changeRequestId: changeRequestId || '',
      createdBy: user.id,
      createdByRole: user.role,
      createdAt: timestamp,
      updatedAt: timestamp,
      notes: notes || '',
    }

    return NextResponse.json({ record }, { status: 201 })
  } catch (error) {
    console.error('Attendance POST error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}
