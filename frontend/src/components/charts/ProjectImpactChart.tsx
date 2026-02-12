
import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface ProjectImpactChartProps {
    projects: { name: string; scoreImpact: number; verdict: string }[];
}

export const ProjectImpactChart: React.FC<ProjectImpactChartProps> = ({ projects }) => {
    if (!projects || projects.length === 0) {
        return <div className="text-white/30 text-center py-8">No project impact data</div>;
    }

    return (
        <div className="w-full h-64 bg-white/5 border border-white/10 rounded-xl p-4">
            <h3 className="text-white/60 text-xs font-bold uppercase mb-4 tracking-wider">Project Impact (Points Added)</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={projects}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff10" />
                    <XAxis type="number" stroke="#ffffff40" tick={{ fill: '#ffffff40', fontSize: 10 }} />
                    <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        stroke="#ffffff40"
                        tick={{ fill: '#ffffff80', fontSize: 10 }}
                    />
                    <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#ffffff20', borderRadius: '8px' }}
                    />
                    <Bar dataKey="scoreImpact" barSize={20} radius={[0, 4, 4, 0]}>
                        {projects.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.scoreImpact > 15 ? '#10b981' : entry.scoreImpact > 5 ? '#f59e0b' : '#3b82f6'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
