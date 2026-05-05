import { NextRequest, NextResponse } from 'next/server'
import { getDoc, getCollection, updateDoc, nowISO } from '@/lib/firebase-db'
import { verifyAuth, requireRole } from '@/lib/auth'

// GET /api/doctors/[id]
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

    const doctor = await getDoc(`/doctors/${id}`)

    if (!doctor) {
      return NextResponse.json(
        { error: 'الطبيب غير موجود' },
        { status: 404 }
      )
    }

    // Get department info
    let department: any = null
    if (doctor.departmentId) {
      department = await getDoc(`/departments/${doctor.departmentId}`)
    }

    // Get latest schedule with days
    const allSchedules = await getCollection('schedules')
    const doctorSchedules = allSchedules
      .filter((s: any) => s.doctorId === id)
      .sort((a: any, b: any) => (b.month || '').localeCompare(a.month || ''))

    const latestSchedule = doctorSchedules[0] || null

    // Convert nested days to array
    let scheduleDays: any[] = []
    if (latestSchedule && latestSchedule.days) {
      scheduleDays = Object.entries(latestSchedule.days)
        .map(([dayId, dayData]: [string, any]) => ({
          id: dayId,
          ...dayData,
          scheduleId: latestSchedule.id,
          doctorId: id,
        }))
        .sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''))
    }

    return NextResponse.json({
      doctor: {
        ...doctor,
        department,
        monthlySchedules: latestSchedule
          ? [
              {
                ...latestSchedule,
                scheduleDays,
              },
            ]
          : [],
      },
    })
  } catch (error) {
    console.error('Doctor GET error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// PUT /api/doctors/[id]
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
    const { fullName, code, phone, email, departmentId, active } = body

    const existing = await getDoc(`/doctors/${id}`)
    if (!existing) {
      return NextResponse.json(
        { error: 'الطبيب غير موجود' },
        { status: 404 }
      )
    }

    // Check unique code if changing
    if (code && code.trim() !== existing.code) {
      const allDoctors = await getCollection('doctors')
      const existingCode = allDoctors.find(
        (d: any) =>
          d.id !== id &&
          d.code &&
          d.code.toLowerCase() === code.trim().toLowerCase()
      )
      if (existingCode) {
        return NextResponse.json(
          { error: 'رمز الطبيب مسجل مسبقاً' },
          { status: 400 }
        )
      }
    }

    // Validate department exists if provided
    let departmentName = existing.departmentName
    if (departmentId !== undefined) {
      if (departmentId) {
        const dept = await getDoc(`/departments/${departmentId}`)
        if (!dept) {
          return NextResponse.json(
            { error: 'القسم غير موجود' },
            { status: 400 }
          )
        }
        departmentName = dept.name
      } else {
        departmentName = ''
      }
    }

    const updates: Record<string, any> = { updatedAt: nowISO() }
    if (fullName !== undefined) updates.fullName = fullName.trim()
    if (code !== undefined) updates.code = code.trim()
    if (phone !== undefined) updates.phone = phone?.trim() || ''
    if (email !== undefined) updates.email = email?.trim() || ''
    if (departmentId !== undefined) updates.departmentId = departmentId || ''
    if (departmentId !== undefined) updates.departmentName = departmentName || ''
    if (active !== undefined) updates.active = active

    await updateDoc(`/doctors/${id}`, updates)

    const doctor = { ...existing, ...updates }
    return NextResponse.json({ doctor })
  } catch (error) {
    console.error('Doctor PUT error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// DELETE /api/doctors/[id]
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

    const existing = await getDoc(`/doctors/${id}`)
    if (!existing) {
      return NextResponse.json(
        { error: 'الطبيب غير موجود' },
        { status: 404 }
      )
    }

    // Soft delete
    await updateDoc(`/doctors/${id}`, {
      active: false,
      updatedAt: nowISO(),
    })

    return NextResponse.json({ message: 'تم حذف الطبيب بنجاح' })
  } catch (error) {
    console.error('Doctor DELETE error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}
