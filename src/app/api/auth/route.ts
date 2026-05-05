import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { findByField, getDoc, createDoc, updateDoc, nowISO } from '@/lib/firebase-db'
import { verifyAuth, createToken, requireRole } from '@/lib/auth'

// POST /api/auth
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    // --- LOGIN ---
    if (action === 'login') {
      const { email, password } = body

      if (!email || !password) {
        return NextResponse.json(
          { error: 'البريد الإلكتروني وكلمة المرور مطلوبان' },
          { status: 400 }
        )
      }

      // Query Firebase for user by email
      const users = await findByField('users', 'email', email)
      if (users.length === 0) {
        return NextResponse.json(
          { error: 'بيانات الدخول غير صحيحة' },
          { status: 401 }
        )
      }

      const user = users[0]

      if (!user.active) {
        return NextResponse.json(
          { error: 'تم تعطيل هذا الحساب' },
          { status: 401 }
        )
      }

      const validPassword = await bcrypt.compare(password, user.password)
      if (!validPassword) {
        return NextResponse.json(
          { error: 'بيانات الدخول غير صحيحة' },
          { status: 401 }
        )
      }

      const token = await createToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      })

      const response = NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        },
        token,
      })

      response.cookies.set('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })

      return response
    }

    // --- REGISTER (super_admin only) ---
    if (action === 'register') {
      const user = await verifyAuth(request)
      if (!user || !requireRole(user, ['super_admin'])) {
        return NextResponse.json({ error: 'غير مصرح به' }, { status: 403 })
      }

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
      const existingUsers = await findByField('users', 'email', email)
      if (existingUsers.length > 0) {
        return NextResponse.json(
          { error: 'البريد الإلكتروني مسجل مسبقاً' },
          { status: 400 }
        )
      }

      const hashedPassword = await bcrypt.hash(password, 12)
      const timestamp = nowISO()

      const newId = await createDoc('users', {
        name,
        email,
        password: hashedPassword,
        role: role || 'worker',
        active: true,
        mustChangePassword: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      })

      const newUser = {
        id: newId,
        name,
        email,
        role: role || 'worker',
        active: true,
        mustChangePassword: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      return NextResponse.json(
        { user: newUser, message: 'تم إنشاء المستخدم بنجاح' },
        { status: 201 }
      )
    }

    // --- CHANGE PASSWORD ---
    if (action === 'change-password') {
      const user = await verifyAuth(request)
      if (!user) {
        return NextResponse.json({ error: 'غير مصرح به' }, { status: 401 })
      }

      const { oldPassword, newPassword } = body

      if (!oldPassword || !newPassword) {
        return NextResponse.json(
          { error: 'كلمة المرور القديمة والجديدة مطلوبتان' },
          { status: 400 }
        )
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
          { status: 400 }
        )
      }

      const dbUser = await getDoc(`/users/${user.id}`)
      if (!dbUser) {
        return NextResponse.json(
          { error: 'المستخدم غير موجود' },
          { status: 404 }
        )
      }

      const validOldPassword = await bcrypt.compare(oldPassword, dbUser.password)
      if (!validOldPassword) {
        return NextResponse.json(
          { error: 'كلمة المرور القديمة غير صحيحة' },
          { status: 400 }
        )
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 12)

      await updateDoc(`/users/${user.id}`, {
        password: hashedNewPassword,
        mustChangePassword: false,
        updatedAt: nowISO(),
      })

      // Create new token with updated mustChangePassword
      const newToken = await createToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: false,
      })

      const response = NextResponse.json({ message: 'تم تغيير كلمة المرور بنجاح', token: newToken })
      response.cookies.set('token', newToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })

      return response
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 })
  } catch (error) {
    console.error('Auth POST error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// GET /api/auth/me
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 401 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Auth GET error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// DELETE /api/auth - Logout (clear cookie)
export async function DELETE() {
  try {
    const response = NextResponse.json({ message: 'تم تسجيل الخروج' })
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
    return response
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
