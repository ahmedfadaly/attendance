import { NextRequest, NextResponse } from 'next/server'
import { getDoc, updateDoc, deleteDoc, nowISO } from '@/lib/firebase-db'
import { verifyAuth, requireRole } from '@/lib/auth'

// GET /api/attendance/[id]
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

    const record = await getDoc(`/attendance/${id}`)

    if (!record) {
      return NextResponse.json(
        { error: 'سجل الحضور غير موجود' },
        { status: 404 }
      )
    }

    return NextResponse.json({ record })
  } catch (error) {
    console.error('Attendance record GET error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// PUT /api/attendance/[id]
export async function PUT(
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
    const {
      status: attendanceStatus,
      checkInTime,
      checkOutTime,
      notes,
    } = body

    const existing = await getDoc(`/attendance/${id}`)
    if (!existing) {
      return NextResponse.json(
        { error: 'سجل الحضور غير موجود' },
        { status: 404 }
      )
    }

    const updates: Record<string, any> = { updatedAt: nowISO() }
    if (attendanceStatus !== undefined) updates.status = attendanceStatus
    if (checkInTime !== undefined) updates.checkInTime = checkInTime || ''
    if (checkOutTime !== undefined) updates.checkOutTime = checkOutTime || ''
    if (notes !== undefined) updates.notes = notes || ''

    await updateDoc(`/attendance/${id}`, updates)

    const record = { ...existing, ...updates }
    return NextResponse.json({ record })
  } catch (error) {
    console.error('Attendance record PUT error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// DELETE /api/attendance/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request)
    if (!user || !requireRole(user, ['manager', 'super_admin'])) {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 403 })
    }

    const { id } = await params

    const existing = await getDoc(`/attendance/${id}`)
    if (!existing) {
      return NextResponse.json(
        { error: 'سجل الحضور غير موجود' },
        { status: 404 }
      )
    }

    await deleteDoc(`/attendance/${id}`)

    return NextResponse.json({ message: 'تم حذف سجل الحضور بنجاح' })
  } catch (error) {
    console.error('Attendance record DELETE error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}
