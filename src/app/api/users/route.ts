import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getCollection, getDoc, createDoc, updateDoc, nowISO } from '@/lib/firebase-db'
import { verifyAuth } from '@/lib/auth'

// GET /api/users
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const roleFilter = searchParams.get('role')

    let users = await getCollection('users')

    // Filter by role if specified
    if (roleFilter) {
      users = users.filter((u: any) => u.role === roleFilter)
    }

    // Sort by createdAt desc
    users.sort((a: any, b: any) => {
      const aTime = a.createdAt || ''
      const bTime = b.createdAt || ''
      return bTime.localeCompare(aTime)
    })

    // Remove password field from response
    users = users.map((u: any) => {
      const { password, ...rest } = u
      return rest
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Users GET error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// POST /api/users (super_admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة' },
        { status: 400 }
      )
    }

    const validRoles = ['super_admin', 'manager', 'worker']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'دور غير صالح' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const allUsers = await getCollection('users')
    const existingUser = allUsers.find(
      (u: any) => u.email && u.email.toLowerCase() === email.trim().toLowerCase()
    )
    if (existingUser) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني مسجل مسبقاً' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const timestamp = nowISO()

    const newId = await createDoc('users', {
      name: name.trim(),
      email: email.trim(),
      password: hashedPassword,
      role: role || 'worker',
      active: true,
      mustChangePassword: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    })

    const newUser = {
      id: newId,
      name: name.trim(),
      email: email.trim(),
      role: role || 'worker',
      active: true,
      mustChangePassword: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error) {
    console.error('Users POST error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}
