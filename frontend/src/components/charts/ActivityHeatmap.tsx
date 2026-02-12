import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GrowthHistoryItem } from '../../api/endpoints';

interface ActivityHeatmapProps {
    data: GrowthHistoryItem[];
}

interface DayData {
    date: Date;
    count: number;
    intensity: number; // 0-4
    activities: string[];
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ data }) => {
    const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const calendarData = useMemo(() => {
        const today = new Date();
        const days: DayData[] = [];
        const endDate = today;
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 364); // Last 365 days (approx 52 weeks)

        // 1. Map history to dates
        const historyMap = new Map<string, string[]>();
        data.forEach(item => {
            const dateStr = new Date(item.date).toDateString();
            const existing = historyMap.get(dateStr) || [];

            // Format activity name
            if (!item.metric) return;
            let name = item.metric.replace(/_/g, ' ');
            if (item.metric === 'github_projects_analyzed') name = 'GitHub Scan';
            if (item.metric === 'interview_score') name = 'Interview';
            if (item.metric === 'project_completed') name = 'Project';

            existing.push(`${name} (+${item.value})`);
            historyMap.set(dateStr, existing);
        });

        // 2. Generate calendar grid
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toDateString();
            const activities = historyMap.get(dateStr) || [];
            const count = activities.length;

            let intensity = 0;
            if (count > 0) intensity = 1;
            if (count > 2) intensity = 2;
            if (count > 4) intensity = 3;
            if (count > 6) intensity = 4;

            days.push({
                date: new Date(d),
                count,
                intensity,
                activities
            });
        }

        return days;
    }, [data]);

    // Group by weeks for vertical rendering (GitHub style)
    // GitHub renders columns (weeks), rows (days 0-6).
    const weeks = useMemo(() => {
        const weeksArray: DayData[][] = [];
        let currentWeek: DayData[] = [];

        calendarData.forEach((day, _) => {
            // If first day, align to correct day of week?
            // Actually, simplest is just chunk by 7, but that drifts if start isn't Sunday.
            // GitHub always starts rows at Sunday.
            // Let's just do a naive chunk if we want 52 columns.
            // Better: Align to Sunday.

            if (currentWeek.length === 0 && weeksArray.length === 0) {
                // Pad first week if generic start
                const dayOfWeek = day.date.getDay(); // 0 = Sun
                for (let i = 0; i < dayOfWeek; i++) {
                    currentWeek.push({ date: new Date(0), count: 0, intensity: -1, activities: [] }); // Placeholder
                }
            }

            currentWeek.push(day);

            if (currentWeek.length === 7) {
                weeksArray.push(currentWeek);
                currentWeek = [];
            }
        });
        if (currentWeek.length > 0) weeksArray.push(currentWeek);
        return weeksArray;
    }, [calendarData]);

    const getColor = (intensity: number) => {
        switch (intensity) {
            case -1: return 'bg-transparent'; // Placeholder
            case 0: return 'bg-white/5 border border-white/5 hover:border-white/20';
            case 1: return 'bg-emerald-900/40 border border-emerald-900/60 hover:bg-emerald-900';
            case 2: return 'bg-emerald-700/60 border border-emerald-600/50 hover:bg-emerald-600';
            case 3: return 'bg-emerald-500/80 border border-emerald-400/50 hover:bg-emerald-400';
            case 4: return 'bg-neon-teal border border-emerald-200 shadow-[0_0_10px_rgba(45,212,191,0.5)]';
            default: return 'bg-white/5';
        }
    };

    return (
        <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10">
            <div className="min-w-[700px]">
                <div className="flex gap-1.5 h-[140px]">
                    {weeks.map((week, idx) => (
                        <div key={idx} className="flex flex-col gap-1.5 pt-6"> {/* Top padding for month labels if we added them */}
                            {week.map((day, dIdx) => (
                                <div
                                    key={dIdx}
                                    className={`w-3.5 h-3.5 rounded-sm transition-all duration-200 ${getColor(day.intensity)}`}
                                    onMouseEnter={(e) => {
                                        if (day.intensity !== -1) {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
                                            setHoveredDay(day);
                                        }
                                    }}
                                    onMouseLeave={() => setHoveredDay(null)}
                                />
                            ))}
                        </div>
                    ))}
                </div>
                <div className="flex justify-end items-center gap-2 mt-2 text-[10px] text-white/40">
                    <span>Less</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-sm bg-white/5" />
                        <div className="w-3 h-3 rounded-sm bg-emerald-900/50" />
                        <div className="w-3 h-3 rounded-sm bg-emerald-500/60" />
                        <div className="w-3 h-3 rounded-sm bg-neon-teal" />
                    </div>
                    <span>More</span>
                </div>
            </div>

            {/* Tooltip Portal or Fixed Overlay */}
            <AnimatePresence>
                {hoveredDay && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            left: tooltipPos.x,
                            top: tooltipPos.y,
                            translateX: '-50%',
                            translateY: '-120%',
                            zIndex: 50
                        }}
                        className="pointer-events-none"
                    >
                        <div className="bg-obsidian-900 border border-white/10 rounded-lg p-3 shadow-xl backdrop-blur-md min-w-[200px]">
                            <div className="text-xs font-bold text-white/70 mb-2 border-b border-white/10 pb-1">
                                {hoveredDay.date.toDateString()}
                            </div>
                            {hoveredDay.count === 0 ? (
                                <div className="text-white/30 text-xs italic">No activity recorded</div>
                            ) : (
                                <ul className="space-y-1">
                                    {hoveredDay.activities.map((act, i) => (
                                        <li key={i} className="text-xs text-neon-teal flex items-center gap-1">
                                            <div className="w-1 h-1 rounded-full bg-neon-teal" />
                                            {act}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        {/* Arrow */}
                        <div className="w-3 h-3 bg-obsidian-900 border-r border-b border-white/10 transform rotate-45 absolute left-1/2 -bottom-1.5 -translate-x-1/2"></div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
