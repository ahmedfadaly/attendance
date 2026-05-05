import { NextRequest, NextResponse } from 'next/server'
import { getCollection, getDoc, setDoc, nowISO } from '@/lib/firebase-db'
import { verifyAuth, requireRole } from '@/lib/auth'

// GET /api/settings
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 401 })
    }

    const settingsSnapshot = await getCollection('settings')

    // Convert to key-value object
    const settingsObj: Record<string, string> = {}
    for (const setting of settingsSnapshot) {
      settingsObj[setting.key || setting.id] = setting.value || ''
    }

    return NextResponse.json({ settings: settingsObj })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// PUT /api/settings (manager+ only)
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user || !requireRole(user, ['manager', 'super_admin'])) {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 403 })
    }

    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json(
        { error: 'مفتاح الإعداد مطلوب' },
        { status: 400 }
      )
    }

    // Upsert setting - store using key as the document ID
    const timestamp = nowISO()
    const settingPath = `/settings/${key}`

    await setDoc(settingPath, {
      key,
      value: value || '',
      updatedAt: timestamp,
    })

    const setting = {
      key,
      value: value || '',
      updatedAt: timestamp,
    }

    return NextResponse.json({ setting })
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}
