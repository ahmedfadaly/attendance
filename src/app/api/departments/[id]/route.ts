import { NextRequest, NextResponse } from 'next/server'
import { getDoc, getCollection, updateDoc, nowISO } from '@/lib/firebase-db'
import { verifyAuth, requireRole } from '@/lib/auth'

// GET /api/departments/[id]
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

    const department = await getDoc(`/departments/${id}`)

    if (!department) {
      return NextResponse.json(
        { error: 'القسم غير موجود' },
        { status: 404 }
      )
    }

    // Get active doctors for this department
    const doctors = await getCollection('doctors')
    const deptDoctors = doctors
      .filter((d: any) => d.departmentId === id && d.active === true)
      .sort((a: any, b: any) => (a.fullName || '').localeCompare(b.fullName || '', 'ar'))

    // Get all doctors (including inactive) for count
    const allDeptDoctors = doctors.filter((d: any) => d.departmentId === id)

    // Get all schedule days count (approximate)
    const schedules = await getCollection('schedules')

    return NextResponse.json({
      department: {
        ...department,
        doctors: deptDoctors,
        _count: {
          doctors: allDeptDoctors.length,
        },
      },
    })
  } catch (error) {
    console.error('Department GET error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// PUT /api/departments/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request)
    if (!user || !requireRole(user, ['manager', 'super_admin'])) {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, active } = body

    const existing = await getDoc(`/departments/${id}`)
    if (!existing) {
      return NextResponse.json(
        { error: 'القسم غير موجود' },
        { status: 404 }
      )
    }

    const updates: Record<string, any> = { updatedAt: nowISO() }
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description?.trim() || ''
    if (active !== undefined) updates.active = active

    await updateDoc(`/departments/${id}`, updates)

    const department = { ...existing, ...updates }
    return NextResponse.json({ department })
  } catch (error) {
    console.error('Department PUT error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// DELETE /api/departments/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request)
    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 403 })
    }

    const { id } = await params

    const existing = await getDoc(`/departments/${id}`)
    if (!existing) {
      return NextResponse.json(
        { error: 'القسم غير موجود' },
        { status: 404 }
      )
    }

    // Soft delete
    await updateDoc(`/departments/${id}`, {
      active: false,
      updatedAt: nowISO(),
    })

    return NextResponse.json({ message: 'تم حذف القسم بنجاح' })
  } catch (error) {
    console.error('Department DELETE error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}
