
import React from 'react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';

interface ScoreHistoryChartProps {
    data: { date: string; score: number; type?: string }[];
}

export const ScoreHistoryChart: React.FC<ScoreHistoryChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="text-white/30 text-center py-8">No history data available</div>;
    }

    const formattedData = data.map(item => ({
        ...item,
        displayDate: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }));

    return (
        <div className="w-full h-80 bg-white/5 border border-white/10 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-teal/5 to-transparent pointer-events-none" />

            <div className="flex justify-between items-center mb-6">
                <h3 className="text-white/60 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-neon-teal animate-pulse" />
                    Interview Performance Logic
                </h3>
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gridGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                        </linearGradient>
                    </defs>
                    <CartesianGrid stroke="url(#gridGradient)" vertical={false} strokeDasharray="3 3" />
                    <XAxis
                        dataKey="displayDate"
                        stroke="#ffffff40"
                        tick={{ fill: '#ffffff40', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                    />
                    <YAxis
                        stroke="#ffffff40"
                        tick={{ fill: '#ffffff40', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#09090b',
                            borderColor: 'rgba(0, 240, 255, 0.3)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                        }}
                        itemStyle={{ color: '#00f0ff' }}
                        labelStyle={{ color: '#ffffff80', marginBottom: '4px', fontSize: '12px' }}
                        cursor={{ stroke: '#00f0ff', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#00f0ff"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorScore)"
                        animationDuration={1500}
                        dot={{ fill: '#09090b', stroke: '#00f0ff', strokeWidth: 2, r: 4 }}
                        activeDot={{ fill: '#00f0ff', stroke: '#fff', strokeWidth: 2, r: 6, opacity: 1 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
