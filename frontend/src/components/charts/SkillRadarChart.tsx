
import React from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip
} from 'recharts';

interface SkillRadarChartProps {
    skills: Record<string, number>;
}

export const SkillRadarChart: React.FC<SkillRadarChartProps> = ({ skills }) => {
    const data = Object.entries(skills).map(([name, level]) => ({
        subject: name,
        A: level,
        fullMark: 100,
    }));

    // If no skills or very few, show placeholder or limit
    if (data.length < 3) {
        // Show placeholder if empty
        if (data.length === 0) return <div className="text-white/30 text-center py-8">No skills analyzed yet</div>;
    }

    // Limit to top 6 skills to avoid crowding
    const displayData = data.slice(0, 6);

    return (
        <div className="w-full h-80 bg-white/5 border border-white/10 rounded-xl p-4">
            <h3 className="text-white/60 text-xs font-bold uppercase mb-4 tracking-wider">Skill Profile</h3>
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={displayData}>
                    <PolarGrid stroke="#ffffff20" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff80', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                        name="Skill Level"
                        dataKey="A"
                        stroke="#d946ef"
                        strokeWidth={2}
                        fill="#d946ef"
                        fillOpacity={0.3}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#ffffff20', borderRadius: '8px' }}
                        itemStyle={{ color: '#d946ef' }}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};
