import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/firebase-db'
import { verifyAuth, requireRole } from '@/lib/auth'

// GET /api/reports?month=YYYY-MM&departmentId=xxx&format=csv
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح به' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const departmentId = searchParams.get('departmentId')
    const format = searchParams.get('format')

    if (!month) {
      return NextResponse.json(
        { error: 'معامل الشهر مطلوب (YYYY-MM)' },
        { status: 400 }
      )
    }

    // Get all doctors
    let doctors = await getCollection('doctors')

    // Filter active doctors
    doctors = doctors.filter((d: any) => d.active === true)

    // Filter by department if specified
    if (departmentId) {
      doctors = doctors.filter((d: any) => d.departmentId === departmentId)
    }

    // Sort by name
    doctors.sort((a: any, b: any) => (a.fullName || '').localeCompare(b.fullName || '', 'ar'))

    // Get all schedules for the month
    const allSchedules = await getCollection('schedules')

    // Get all attendance records for the month
    const allAttendance = await getCollection('attendance')
    const monthAttendance = allAttendance.filter(
      (r: any) => r.date && r.date.startsWith(month)
    )

    // Build report data
    const reportData = doctors.map((doctor: any) => {
      // Find schedule for this doctor+month
      const schedule = allSchedules.find(
        (s: any) => s.doctorId === doctor.id && s.month === month
      )

      const requiredDays = schedule?.requiredDays || 0

      // Count scheduled days (isCounted = true)
      let scheduledDays = 0
      if (schedule && schedule.days) {
        scheduledDays = Object.values(schedule.days)
          .filter((d: any) => d.isCounted !== false)
          .length
      }

      // Count attendance for this doctor
      const doctorAttendance = monthAttendance.filter(
        (r: any) => r.doctorId === doctor.id
      )
      const presentDays = doctorAttendance.filter(
        (r: any) => r.status === 'present' || r.status === 'approved_changed_day'
      ).length
      const absentDays = doctorAttendance.filter(
        (r: any) => r.status === 'absent'
      ).length

      const percentage = requiredDays > 0
        ? Math.round((presentDays / requiredDays) * 100)
        : 0

      return {
        doctorId: doctor.id,
        doctorName: doctor.fullName,
        doctorCode: doctor.code,
        departmentId: doctor.departmentId,
        departmentName: doctor.departmentName || 'غير محدد',
        requiredDays,
        scheduledDays,
        presentDays,
        absentDays,
        percentage,
      }
    })

    // Summary stats
    const summary = {
      totalDoctors: reportData.length,
      totalScheduled: reportData.reduce((sum, d) => sum + d.scheduledDays, 0),
      totalPresent: reportData.reduce((sum, d) => sum + d.presentDays, 0),
      totalAbsent: reportData.reduce((sum, d) => sum + d.absentDays, 0),
      averagePercentage:
        reportData.length > 0
          ? Math.round(
              reportData.reduce((sum, d) => sum + d.percentage, 0) /
                reportData.length
            )
          : 0,
    }

    // CSV export
    if (format === 'csv') {
      const BOM = '\uFEFF'
      const csvHeader =
        'رمز الطبيب,اسم الطبيب,القسم,الأيام المطلوبة,الأيام المجدولة,أيام الحضور,أيام الغياب,النسبة المئوية\n'
      const csvRows = reportData
        .map(
          (d) =>
            `${d.doctorCode},${d.doctorName},${d.departmentName},${d.requiredDays},${d.scheduledDays},${d.presentDays},${d.absentDays},${d.percentage}%`
        )
        .join('\n')

      const csvContent = BOM + csvHeader + csvRows

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename=attendance-report-${month}.csv`,
        },
      })
    }

    return NextResponse.json({
      month,
      summary,
      doctors: reportData,
    })
  } catch (error) {
    console.error('Reports GET error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}
