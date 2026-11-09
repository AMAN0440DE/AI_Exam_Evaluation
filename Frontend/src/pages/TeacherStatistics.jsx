import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';

const barData = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 500 },
  { name: 'Apr', value: 280 },
  { name: 'May', value: 390 },
  { name: 'Jun', value: 320 },
];

const pieData = [
  { name: 'Completed', value: 65, color: '#527b68' },
  { name: 'In Progress', value: 25, color: '#d6a65d' },
  { name: 'Pending', value: 10, color: '#c77d70' },
];

const TeacherStatistics = () => (
  <section className="space-y-6">
    <header className="mb-8">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-800/70">Your workspace</p>
      <h1 className="mt-2 text-3xl font-bold text-gray-800">Statistics</h1>
      <p className="mt-1 text-gray-500">A clear view of activity and evaluation progress.</p>
    </header>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
      <section className="min-w-0 bg-white p-6 rounded-xl border">
        <h2 className="text-lg font-semibold mb-1 text-gray-800">Monthly performance</h2>
        <p className="mb-5 text-sm text-gray-500">Activity across the first half of the year</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8eeea" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#788780', fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#788780', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ borderRadius: 12, borderColor: '#e4eae6', boxShadow: '0 8px 24px rgba(32, 54, 45, 0.08)' }}
              cursor={{ fill: '#f1f5f2' }}
            />
            <Bar dataKey="value" fill="#527b68" radius={[6, 6, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </section>
      <section className="min-w-0 bg-white p-6 rounded-xl border">
        <h2 className="text-lg font-semibold mb-1 text-gray-800">Evaluation distribution</h2>
        <p className="mb-5 text-sm text-gray-500">Current status of assigned work</p>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={86}
              dataKey="value"
              labelLine={false}
              label={({ value }) => `${value}%`}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 12, borderColor: '#e4eae6', boxShadow: '0 8px 24px rgba(32, 54, 45, 0.08)' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-2">
          {pieData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span>{entry.name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  </section>
);

export default TeacherStatistics;