import { NextRequest, NextResponse } from 'next/server'
import { getDoc, updateDoc, nowISO } from '@/lib/firebase-db'
import { verifyAuth } from '@/lib/auth'

// GET /api/users/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request)
    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 403 })
    }

    const { id } = await params

    const targetUser = await getDoc(`/users/${id}`)

    if (!targetUser) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      )
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = targetUser

    return NextResponse.json({ user: userWithoutPassword })
  } catch (error) {
    console.error('User GET error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id] (super_admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request)
    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, role, active } = body

    const existing = await getDoc(`/users/${id}`)
    if (!existing) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      )
    }

    // Prevent deactivating self
    if (id === user.id && active === false) {
      return NextResponse.json(
        { error: 'لا يمكنك تعطيل حسابك الخاص' },
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

    const updates: Record<string, any> = { updatedAt: nowISO() }
    if (name !== undefined) updates.name = name.trim()
    if (role !== undefined) updates.role = role
    if (active !== undefined) updates.active = active

    await updateDoc(`/users/${id}`, updates)

    const { password, ...updatedUser } = { ...existing, ...updates }
    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('User PUT error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] (super_admin only - soft delete)
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

    const existing = await getDoc(`/users/${id}`)
    if (!existing) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      )
    }

    // Prevent deleting self
    if (id === user.id) {
      return NextResponse.json(
        { error: 'لا يمكنك حذف حسابك الخاص' },
        { status: 400 }
      )
    }

    // Soft delete
    await updateDoc(`/users/${id}`, {
      active: false,
      updatedAt: nowISO(),
    })

    return NextResponse.json({ message: 'تم حذف المستخدم بنجاح' })
  } catch (error) {
    console.error('User DELETE error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}
