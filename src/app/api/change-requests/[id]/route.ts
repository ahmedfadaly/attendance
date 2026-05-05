import { NextRequest, NextResponse } from 'next/server'
import { getDoc, getCollection, updateDoc, multiUpdate, nowISO, generateId } from '@/lib/firebase-db'
import { verifyAuth, requireRole } from '@/lib/auth'

// GET /api/change-requests/[id]
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

    const changeRequest = await getDoc(`/changeRequests/${id}`)

    if (!changeRequest) {
      return NextResponse.json(
        { error: 'طلب التغيير غير موجود' },
        { status: 404 }
      )
    }

    return NextResponse.json({ changeRequest })
  } catch (error) {
    console.error('Change request GET error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// PUT /api/change-requests/[id] (review: approve/reject - manager+ only)
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
    const { status: reviewStatus, managerNote } = body

    if (!reviewStatus || !['approved', 'rejected'].includes(reviewStatus)) {
      return NextResponse.json(
        { error: 'الحالة يجب أن تكون معتمدة أو مرفوضة' },
        { status: 400 }
      )
    }

    const existingRequest = await getDoc(`/changeRequests/${id}`)

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'طلب التغيير غير موجود' },
        { status: 404 }
      )
    }

    if (existingRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'تم مراجعة هذا الطلب مسبقاً' },
        { status: 400 }
      )
    }

    const timestamp = nowISO()

    // Update change request
    const requestUpdates: Record<string, any> = {
      status: reviewStatus,
      managerNote: managerNote || '',
      reviewedBy: user.id,
      reviewedAt: timestamp,
    }

    if (reviewStatus === 'approved') {
      // Find the schedule for this doctor+month and update days
      const allSchedules = await getCollection('schedules')
      const schedule = allSchedules.find(
        (s: any) =>
          s.doctorId === existingRequest.doctorId &&
          s.month === existingRequest.month
      )

      if (schedule && schedule.days) {
        const updates: Record<string, any> = {}
        updates[`/changeRequests/${id}`] = { ...existingRequest, ...requestUpdates }

        let foundOriginal = false

        // Find original day and mark as changed_from
        for (const [dayId, dayData] of Object.entries(schedule.days)) {
          const day = dayData as any
          if (
            day.date === existingRequest.originalDate &&
            day.shift === existingRequest.originalShift &&
            day.status === 'scheduled'
          ) {
            updates[`/schedules/${schedule.id}/days/${dayId}/status`] = 'changed_from'
            updates[`/schedules/${schedule.id}/days/${dayId}/isCounted`] = false
            updates[`/schedules/${schedule.id}/days/${dayId}/changeRequestId`] = id
            updates[`/schedules/${schedule.id}/days/${dayId}/updatedAt`] = timestamp
            foundOriginal = true

            // Create new day for requested date
            const newDayId = generateId()
            updates[`/schedules/${schedule.id}/days/${newDayId}`] = {
              date: existingRequest.requestedDate,
              shift: existingRequest.requestedShift,
              departmentId: existingRequest.departmentId || '',
              departmentName: existingRequest.departmentName || '',
              status: 'changed_to',
              isCounted: true,
              changeRequestId: id,
              notes: '',
              createdAt: timestamp,
              updatedAt: timestamp,
            }
            break
          }
        }

        // Atomic multi-path update
        await multiUpdate(updates)
      } else {
        // No schedule found, just update the request
        await updateDoc(`/changeRequests/${id}`, requestUpdates)
      }
    } else {
      // Rejected - just update the request
      await updateDoc(`/changeRequests/${id}`, requestUpdates)
    }

    const changeRequest = { ...existingRequest, ...requestUpdates }
    return NextResponse.json({ changeRequest })
  } catch (error) {
    console.error('Change request PUT error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}
