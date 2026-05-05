import { NextRequest, NextResponse } from 'next/server'
import { getCollection, getDoc, createDoc, updateDoc, nowISO } from '@/lib/firebase-db'
import { verifyAuth, requireRole } from '@/lib/auth'

// GET /api/doctors
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get('departmentId')
    const search = searchParams.get('search')
    const activeFilter = searchParams.get('active')

    let doctors = await getCollection('doctors')

    // Get departments for lookup
    const departments = await getCollection('departments')
    const deptMap = new Map<string, any>()
    for (const dept of departments) {
      deptMap.set(dept.id, { id: dept.id, name: dept.name })
    }

    // Client-side filtering since RTDB doesn't support complex queries
    if (departmentId) {
      doctors = doctors.filter((d: any) => d.departmentId === departmentId)
    }

    if (activeFilter !== null) {
      const isActive = activeFilter === 'true'
      doctors = doctors.filter((d: any) => d.active === isActive)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      doctors = doctors.filter(
        (d: any) =>
          (d.fullName && d.fullName.toLowerCase().includes(searchLower)) ||
          (d.code && d.code.toLowerCase().includes(searchLower))
      )
    }

    // Sort: active first, then by name
    doctors.sort((a: any, b: any) => {
      if (a.active !== b.active) return a.active ? -1 : 1
      return (a.fullName || '').localeCompare(b.fullName || '', 'ar')
    })

    // Attach department info
    doctors = doctors.map((d: any) => ({
      ...d,
      department: d.departmentId ? deptMap.get(d.departmentId) || null : null,
    }))

    return NextResponse.json({ doctors })
  } catch (error) {
    console.error('Doctors GET error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// POST /api/doctors
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user || !requireRole(user, ['worker', 'manager', 'super_admin'])) {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 403 })
    }

    const body = await request.json()
    const { fullName, code, phone, email, departmentId } = body

    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        { error: 'اسم الطبيب مطلوب' },
        { status: 400 }
      )
    }

    if (!code || !code.trim()) {
      return NextResponse.json(
        { error: 'رمز الطبيب مطلوب' },
        { status: 400 }
      )
    }

    // Check unique code - query all doctors and filter
    const allDoctors = await getCollection('doctors')
    const existingCode = allDoctors.find(
      (d: any) => d.code && d.code.toLowerCase() === code.trim().toLowerCase()
    )
    if (existingCode) {
      return NextResponse.json(
        { error: 'رمز الطبيب مسجل مسبقاً' },
        { status: 400 }
      )
    }

    // Validate department exists if provided
    let departmentName: string | null = null
    if (departmentId) {
      const dept = await getDoc(`/departments/${departmentId}`)
      if (!dept) {
        return NextResponse.json(
          { error: 'القسم غير موجود' },
          { status: 400 }
        )
      }
      departmentName = dept.name
    }

    const timestamp = nowISO()
    const newId = await createDoc('doctors', {
      fullName: fullName.trim(),
      code: code.trim(),
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      departmentId: departmentId || '',
      departmentName: departmentName || '',
      active: true,
      requiredDaysPerMonth: 12,
      createdAt: timestamp,
      updatedAt: timestamp,
    })

    const doctor = {
      id: newId,
      fullName: fullName.trim(),
      code: code.trim(),
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      departmentId: departmentId || '',
      departmentName: departmentName || '',
      active: true,
      requiredDaysPerMonth: 12,
      createdAt: timestamp,
      updatedAt: timestamp,
      department: departmentId ? { id: departmentId, name: departmentName } : null,
    }

    return NextResponse.json({ doctor }, { status: 201 })
  } catch (error) {
    console.error('Doctors POST error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}
