import { NextRequest, NextResponse } from 'next/server'
import { getCollection, getDoc, createDoc, updateDoc, nowISO } from '@/lib/firebase-db'
import { verifyAuth, requireRole } from '@/lib/auth'

// GET /api/departments
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active')

    let departments = await getCollection('departments')

    // Sort: active first, then by name
    departments.sort((a, b) => {
      if (a.active !== b.active) return b.active ? 1 : -1
      return (a.name || '').localeCompare(b.name || '', 'ar')
    })

    // Filter active only
    if (activeOnly === 'true') {
      departments = departments.filter((d: any) => d.active === true)
    }

    // Get doctor counts for each department
    const doctors = await getCollection('doctors')
    const activeDoctors = doctors.filter((d: any) => d.active === true)

    departments = departments.map((dept: any) => {
      const deptDoctors = activeDoctors.filter((d: any) => d.departmentId === dept.id)
      return {
        ...dept,
        _count: {
          doctors: deptDoctors.length,
        },
      }
    })

    return NextResponse.json({ departments })
  } catch (error) {
    console.error('Departments GET error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// POST /api/departments
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user || !requireRole(user, ['manager', 'super_admin'])) {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'اسم القسم مطلوب' },
        { status: 400 }
      )
    }

    const timestamp = nowISO()
    const newId = await createDoc('departments', {
      name: name.trim(),
      description: description?.trim() || '',
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    })

    const department = {
      id: newId,
      name: name.trim(),
      description: description?.trim() || '',
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    return NextResponse.json({ department }, { status: 201 })
  } catch (error) {
    console.error('Departments POST error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}
