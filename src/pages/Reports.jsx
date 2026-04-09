import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import { formatCurrency } from '../lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#22c55e', '#16a34a', '#15803d', '#166534', '#0ea5e9', '#d97706', '#dc2626', '#8b5cf6']

export default function Reports() {
  const { business } = useBusiness()
  const [stats, setStats] = useState({ totalJobs: 0, totalRevenue: 0, avgJobValue: 0, completionRate: 0 })
  const [jobsByType, setJobsByType] = useState([])
  const [jobsByWeek, setJobsByWeek] = useState([])

  useEffect(() => {
    if (!business?.id) return
    const fetch = async () => {
      // Get all jobs
      const { data: jobs } = await supabase.from('jobs').select('*').eq('business_id', business.id)
      // Get all invoices
      const { data: invoices } = await supabase.from('invoices').select('*').eq('business_id', business.id)

      const completed = (jobs || []).filter(j => j.status === 'completed')
      const totalRevenue = (invoices || []).filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total || 0), 0)

      setStats({
        totalJobs: (jobs || []).length,
        totalRevenue,
        avgJobValue: completed.length ? totalRevenue / completed.length : 0,
        completionRate: (jobs || []).length ? Math.round((completed.length / (jobs || []).length) * 100) : 0,
      })

      // Jobs by type
      const typeCount = {}
      ;(jobs || []).forEach(j => { typeCount[j.job_type || 'Other'] = (typeCount[j.job_type || 'Other'] || 0) + 1 })
      setJobsByType(Object.entries(typeCount).map(([name, value]) => ({ name, value })))

      // Jobs completed per week (last 8 weeks)
      const weeks = []
      for (let i = 7; i >= 0; i--) {
        const start = new Date()
        start.setDate(start.getDate() - (i * 7) - start.getDay())
        start.setHours(0, 0, 0, 0)
        const end = new Date(start)
        end.setDate(end.getDate() + 7)
        const count = completed.filter(j => {
          const d = new Date(j.completed_at)
          return d >= start && d < end
        }).length
        weeks.push({ week: `W${8 - i}`, jobs: count })
      }
      setJobsByWeek(weeks)
    }
    fetch()
  }, [business?.id])

  return (
    <PageWrapper>
      <Header title="Reports" back="/settings" />

      <div className="px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.totalJobs}</p>
            <p className="text-xs text-gray-500">Total Jobs</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
            <p className="text-xs text-gray-500">Total Revenue</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.avgJobValue)}</p>
            <p className="text-xs text-gray-500">Avg Job Value</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.completionRate}%</p>
            <p className="text-xs text-gray-500">Completion Rate</p>
          </Card>
        </div>

        {/* Jobs Per Week */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Jobs Completed Per Week</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={jobsByWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="jobs" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Job Types */}
        {jobsByType.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Jobs by Type</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={jobsByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {jobsByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </PageWrapper>
  )
}
