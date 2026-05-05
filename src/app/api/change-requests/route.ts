import { NextRequest, NextResponse } from 'next/server'
import { getCollection, getDoc, createDoc, nowISO } from '@/lib/firebase-db'
import { verifyAuth } from '@/lib/auth'

// GET /api/change-requests
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const month = searchParams.get('month')
    const doctorId = searchParams.get('doctorId')

    let changeRequests = await getCollection('changeRequests')

    // Client-side filtering
    if (status) {
      changeRequests = changeRequests.filter((r: any) => r.status === status)
    }

    if (month) {
      changeRequests = changeRequests.filter((r: any) => r.month === month)
    }

    if (doctorId) {
      changeRequests = changeRequests.filter((r: any) => r.doctorId === doctorId)
    }

    // Sort by createdAt desc
    changeRequests.sort((a: any, b: any) => {
      const aTime = a.createdAt || ''
      const bTime = b.createdAt || ''
      return bTime.localeCompare(aTime)
    })

    return NextResponse.json({ changeRequests })
  } catch (error) {
    console.error('Change requests GET error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// POST /api/change-requests (public - no auth required)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      doctorId,
      doctorName,
      departmentId,
      departmentName,
      originalDate,
      originalShift,
      requestedDate,
      requestedShift,
      reason,
      contactPhone,
    } = body

    if (!doctorId || !doctorName || !originalDate || !requestedDate || !reason) {
      return NextResponse.json(
        { error: 'جميع الحقول المطلوبة يجب أن تُملأ' },
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

    // Validate shifts
    if (originalShift && !['morning', 'evening'].includes(originalShift)) {
      return NextResponse.json(
        { error: 'الوردية الأصلية غير صالحة' },
        { status: 400 }
      )
    }

    if (requestedShift && !['morning', 'evening'].includes(requestedShift)) {
      return NextResponse.json(
        { error: 'الوردية المطلوبة غير صالحة' },
        { status: 400 }
      )
    }

    // Derive month from original date
    const month = originalDate.substring(0, 7)

    const timestamp = nowISO()
    const newId = await createDoc('changeRequests', {
      doctorId,
      doctorName: doctorName || doctor.fullName,
      departmentId: departmentId || '',
      departmentName: departmentName || '',
      month,
      originalDate,
      originalShift: originalShift || 'morning',
      requestedDate,
      requestedShift: requestedShift || 'morning',
      reason,
      contactPhone: contactPhone || '',
      status: 'pending',
      managerNote: '',
      reviewedBy: '',
      reviewedAt: '',
      createdAt: timestamp,
    })

    const changeRequest = {
      id: newId,
      doctorId,
      doctorName: doctorName || doctor.fullName,
      departmentId: departmentId || '',
      departmentName: departmentName || '',
      month,
      originalDate,
      originalShift: originalShift || 'morning',
      requestedDate,
      requestedShift: requestedShift || 'morning',
      reason,
      contactPhone: contactPhone || '',
      status: 'pending',
      managerNote: '',
      reviewedBy: '',
      reviewedAt: '',
      createdAt: timestamp,
    }

    return NextResponse.json({ changeRequest }, { status: 201 })
  } catch (error) {
    console.error('Change requests POST error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}
