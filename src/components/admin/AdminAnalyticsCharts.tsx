import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

interface Props {
  repairs: any[];
  claims: any[];
  stats: { technicians: number; repairs: number; claims: number; resolved: number; customers: number };
}

const COLORS = ["hsl(252, 85%, 60%)", "hsl(220, 90%, 56%)", "hsl(152, 60%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)"];

export default function AdminAnalyticsCharts({ repairs, claims, stats }: Props) {
  const monthlyRepairs = useMemo(() => {
    const map: Record<string, { month: string; count: number; revenue: number; fees: number }> = {};
    repairs.forEach((r) => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (!map[key]) map[key] = { month: label, count: 0, revenue: 0, fees: 0 };
      map[key].count++;
      map[key].revenue += Number(r.total_amount || 0);
      map[key].fees += Number(r.fixsure_fee || 0);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [repairs]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    repairs.forEach((r) => {
      const cat = r.category || "Other";
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [repairs]);

  const claimStatusData = useMemo(() => {
    const map: Record<string, number> = {};
    claims.forEach((c: any) => {
      const s = c.status || "unknown";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [claims]);

  const totalRevenue = repairs.reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const totalFees = repairs.reduce((s, r) => s + Number(r.fixsure_fee || 0), 0);

  return (
    <div className="space-y-6">
      {/* Revenue Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-5 shadow-card text-center space-y-1">
          <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Platform Revenue</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card text-center space-y-1">
          <p className="text-2xl font-bold">₹{totalFees.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">FixSure Fees Earned</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card text-center space-y-1">
          <p className="text-2xl font-bold">{stats.customers + stats.technicians}</p>
          <p className="text-xs text-muted-foreground">Total Users</p>
        </div>
      </div>

      {/* Monthly Repairs Bar Chart */}
      <div className="rounded-xl border bg-card p-6 shadow-card space-y-4">
        <p className="text-sm font-semibold">Monthly Repairs</p>
        {monthlyRepairs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No repair data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyRepairs}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 12%, 91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(230, 10%, 45%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(230, 10%, 45%)" />
              <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(240, 12%, 91%)" }} />
              <Bar dataKey="count" fill="hsl(252, 85%, 60%)" radius={[6, 6, 0, 0]} name="Repairs" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Revenue Trend Line Chart */}
      <div className="rounded-xl border bg-card p-6 shadow-card space-y-4">
        <p className="text-sm font-semibold">Monthly Revenue & Fees</p>
        {monthlyRepairs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No revenue data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyRepairs}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 12%, 91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(230, 10%, 45%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(230, 10%, 45%)" />
              <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(240, 12%, 91%)" }} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(252, 85%, 60%)" strokeWidth={2} name="Revenue (₹)" />
              <Line type="monotone" dataKey="fees" stroke="hsl(152, 60%, 45%)" strokeWidth={2} name="Fees (₹)" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Category Pie Chart */}
        <div className="rounded-xl border bg-card p-6 shadow-card space-y-4">
          <p className="text-sm font-semibold">Repairs by Category</p>
          {categoryData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data.</p>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Claim Status Pie Chart */}
        <div className="rounded-xl border bg-card p-6 shadow-card space-y-4">
          <p className="text-sm font-semibold">Claims by Status</p>
          {claimStatusData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No claims.</p>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={claimStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {claimStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
