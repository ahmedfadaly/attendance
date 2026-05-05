import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDoc, setDoc, nowISO } from '@/lib/firebase-db'

// POST /api/auth/seed
export async function POST(request: NextRequest) {
  try {
    const defaultUsers = [
      {
        id: 'u_super_admin_1',
        email: 'super_admin@hospital.com',
        name: 'Super Admin',
        role: 'super_admin',
      },
      {
        id: 'u_manager_1',
        email: 'manager@hospital.com',
        name: 'مدير النظام',
        role: 'manager',
      },
      {
        id: 'u_worker_1',
        email: 'worker@hospital.com',
        name: 'موظف الاستقبال',
        role: 'worker',
      },
    ]

    const password = 'password123'
    const hashedPassword = await bcrypt.hash(password, 12)

    const results: { email: string; status: string }[] = []
    const timestamp = nowISO()

    for (const userData of defaultUsers) {
      const existing = await getDoc(`/users/${userData.id}`)

      if (existing) {
        // Don't reset password for existing users - only ensure they're active
        results.push({
          email: userData.email,
          status: 'already exists',
        })
      } else {
        await setDoc(`/users/${userData.id}`, {
          email: userData.email,
          name: userData.name,
          password: hashedPassword,
          role: userData.role,
          active: true,
          mustChangePassword: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        results.push({
          email: userData.email,
          status: 'created',
        })
      }
    }

    return NextResponse.json({
      message: 'تم تهيئة المستخدمين الافتراضيين',
      results,
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تهيئة المستخدمين' },
      { status: 500 }
    )
  }
}
