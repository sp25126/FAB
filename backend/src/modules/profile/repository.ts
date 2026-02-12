
import { DB } from '../../db/database';
import { Logger } from '../logger';
import { ReportRepository } from '../../repositories/report-repository';

export interface UserProfile {
    id?: number;
    username: string;
    bio: string;
    goals?: string[]; // Stored as JSON string in DB if we want, currently not in schema but can be added
    experienceLevel: 'Junior' | 'Mid' | 'Senior' | 'Lead';
    targetRole: string;
    completedProjects?: string[];
    skills: Record<string, number>;
    stats?: {
        projects: number;
        commits?: number;
    };
    lastActive: string;
    avatarUrl?: string;
    githubUrl?: string;
    name?: string;
    resume?: {
        experience: any[];
        education: any[];
        skills: string[];
        summary: string;
    };
    analysis?: {
        strengths: string[];
        gaps: string[];
        recommendations: string[];
    };
    projects: any[]; // [NEW] Added to match return type
}

export class ProfileRepository {

    async getUser(username: string): Promise<UserProfile | null> {
        // Reduced noise: only debug log for internal repo calls
        Logger.debug(`[Repo] Getting user: ${username}`);
        const db = await DB.getInstance();
        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);

        if (!user) {
            Logger.warn(`[Repo] User not found: ${username}`);
            return null;
        }

        // Fetch skills
        const skills = await db.all('SELECT name, level FROM skills WHERE user_id = ?', [user.id]);
        const skillsMap: Record<string, number> = {};
        skills.forEach(s => skillsMap[s.name] = s.level);
        // Logger.debug(`[Repo] Found ${skills.length} skills for ${username}`);

        // Fetch latest project count from growth history
        const projectStat = await db.get(
            `SELECT value FROM growth_history 
             WHERE user_id = ? AND metric = 'github_projects_analyzed' 
             ORDER BY date DESC LIMIT 1`,
            [user.id]
        );
        // Logger.debug(`[Repo] Project stat for ${username}:`, projectStat);

        // [NEW] Merge with Unified Analysis Report
        const reportRepo = new ReportRepository();
        const latestReport = await reportRepo.getLatestReportForUser(username);

        let resumeData = undefined;
        let analysisData = undefined;
        let richProjects: any[] = [];

        if (latestReport) {
            resumeData = {
                experience: latestReport.resume?.claims || [], // safe access
                education: [],
                skills: latestReport.resume?.skills || [],     // safe access
                summary: latestReport.resume?.summary || ''    // safe access
            };
            analysisData = {
                strengths: latestReport.insights?.strengths?.map(s => `${s.title}: ${s.description}`) || [],
                gaps: latestReport.insights?.gaps?.map(g => `${g.title}: ${g.description}`) || [],
                recommendations: latestReport.insights?.recommendations?.map(r => `${r.title}: ${r.description}`) || []
            };

            // Merge GitHub analysis projects
            if (latestReport.github?.projects) {
                richProjects = latestReport.github.projects.map(p => ({
                    name: p.name,
                    description: p.description,
                    techStack: p.techStack,
                    stars: p.stars,
                    forks: p.forks,
                    lastUpdate: p.lastUpdated,
                    language: p.techStack?.[0], // Approximation
                    complexity: p.complexity,
                    architecture: p.architecture
                }));
            }
        }

        // Combine DB projects (assessments) with Analysis projects
        // Prefer Analysis projects for GitHub data as they are fresher
        // But keep DB projects if they are "Assessed" ones (which might be in 'completedProjects' logic, but here we just have growth_history based ones)

        // Actually, getProjects() above returns growth_history derived ones. 
        // We generally want to SHOW the detailed analysis ones in the dossier.

        return {
            id: user.id,
            username: user.username,
            bio: user.bio,
            experienceLevel: user.experience_level as any,
            targetRole: user.target_role,
            lastActive: user.last_active,
            avatarUrl: user.avatar_url,
            githubUrl: user.github_url,
            name: user.name,
            skills: skillsMap,
            goals: [],
            completedProjects: [],
            stats: {
                projects: projectStat ? projectStat.value : 0
            },
            resume: resumeData,
            analysis: analysisData,
            // If we have rich projects from analysis, use them. Otherwise, we might want to fetch from DB if implemented differently later.
            // For now, let's attach them to a new field or merge? 
            // The frontend uses 'projects' from the hook?
            // Wait, the interface has `completedProjects` which is string[].
            // But the frontend `Profile.tsx` uses `profile.projects`.
            // The `getUser` return type in `repository.ts` doesn't strictly define `projects` array, 
            // but `endpoints.ts` does.
            // Let's add `projects` to the return object.
            projects: richProjects.length > 0 ? richProjects : []
        };
    }

    async updateUser(username: string, profile: Partial<UserProfile>): Promise<void> {
        Logger.info(`[Repo] Updating user profile: ${username}`);
        const db = await DB.getInstance();

        // Build dynamic UPDATE query
        const fields = [];
        const values = [];

        if (profile.bio !== undefined) { fields.push('bio = ?'); values.push(profile.bio); }
        if (profile.experienceLevel !== undefined) { fields.push('experience_level = ?'); values.push(profile.experienceLevel); }
        if (profile.targetRole !== undefined) { fields.push('target_role = ?'); values.push(profile.targetRole); }
        if (profile.avatarUrl !== undefined) { fields.push('avatar_url = ?'); values.push(profile.avatarUrl); }
        if (profile.githubUrl !== undefined) { fields.push('github_url = ?'); values.push(profile.githubUrl); }
        if (profile.name !== undefined) { fields.push('name = ?'); values.push(profile.name); }

        fields.push('last_active = ?');
        values.push(new Date().toISOString());

        if (fields.length === 0) return;

        values.push(username);
        await db.run(
            `UPDATE users SET ${fields.join(', ')} WHERE username = ?`,
            values
        );

        if (profile.skills) {
            await this.updateSkills(username, profile.skills);
        }
    }

    async createUser(profile: UserProfile): Promise<void> {
        const db = await DB.getInstance();
        const result = await db.run(
            `INSERT INTO users (username, bio, experience_level, target_role, last_active, avatar_url, github_url, name) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                profile.username,
                profile.bio,
                profile.experienceLevel,
                profile.targetRole,
                new Date().toISOString(),
                profile.avatarUrl,
                profile.githubUrl,
                profile.name
            ]
        );

        if (profile.skills) {
            const userId = result.lastID;
            for (const [skill, level] of Object.entries(profile.skills)) {
                await db.run('INSERT INTO skills (user_id, name, level, category) VALUES (?, ?, ?, ?)',
                    [userId, skill, level, 'General']);
            }
        }
    }

    async updateSkills(username: string, skills: Record<string, number>): Promise<void> {
        Logger.info(`[Repo] Updating skills for ${username}`, { count: Object.keys(skills).length });
        const db = await DB.getInstance();
        let user = await this.getUser(username);

        if (!user) {
            Logger.info(`[Repo] User ${username} not found, creating shell profile.`);
            await this.createUser({
                username,
                bio: 'Candidate',
                experienceLevel: 'Mid',
                targetRole: 'Software Engineer',
                skills: {},
                lastActive: new Date().toISOString(),
                projects: []
            });
            user = await this.getUser(username);
        }

        if (!user || !user.id) {
            console.error(`[Repo] Failed to create/find user: ${username}`);
            return;
        }

        // Clear existing skills
        await db.run('DELETE FROM skills WHERE user_id = ?', [user.id]);

        for (const [skill, level] of Object.entries(skills)) {
            await db.run('INSERT INTO skills (user_id, name, level, category) VALUES (?, ?, ?, ?)',
                [user.id, skill, level, 'General']);
        }
        Logger.info(`[Repo] Skills updated for ${username}`);
    }

    async mergeSkills(username: string, newSkills: Record<string, number>): Promise<void> {
        Logger.info(`[Repo] Merging ${Object.keys(newSkills).length} new skills for ${username}`);
        const db = await DB.getInstance();
        let user = await this.getUser(username);

        if (!user || !user.id) {
            // Create if likely doesn't exist, though usually we expect user to exist by now
            await this.updateSkills(username, newSkills);
            return;
        }

        // Fetch existing to merge in memory (or do upserts)
        // Upsert logic: IF EXISTS update level (if higher), ELSE insert
        for (const [skill, level] of Object.entries(newSkills)) {
            const existing = await db.get('SELECT level FROM skills WHERE user_id = ? AND name = ?', [user.id, skill]);

            if (existing) {
                // Only upgrade, never downgrade
                if (level > existing.level) {
                    await db.run('UPDATE skills SET level = ? WHERE user_id = ? AND name = ?', [level, user.id, skill]);
                }
            } else {
                await db.run('INSERT INTO skills (user_id, name, level, category) VALUES (?, ?, ?, ?)',
                    [user.id, skill, level, 'GitHub Derived']);
            }
        }
    }

    async updateGrowthHistory(username: string, metric: string, value: number, details: any, overwrite: boolean = false): Promise<void> {
        Logger.info(`[Repo] Growth history: ${username} -> ${metric} (${value})`);
        const db = await DB.getInstance();
        let user = await this.getUser(username);

        if (!user) {
            Logger.info(`[Repo] User ${username} not found, creating shell profile for growth history.`);
            await this.createUser({
                username,
                bio: 'Candidate',
                experienceLevel: 'Junior',
                targetRole: 'Software Engineer',
                skills: {},
                lastActive: new Date().toISOString(),
                projects: []
            });
            user = await this.getUser(username);
        }

        if (user && user.id) {
            if (overwrite) {
                // Delete existing entries for this metric
                await db.run('DELETE FROM growth_history WHERE user_id = ? AND metric = ?', [user.id, metric]);
            }

            await db.run(
                'INSERT INTO growth_history (user_id, date, metric, value, details) VALUES (?, ?, ?, ?, ?)',
                [user.id, new Date().toISOString(), metric, value, JSON.stringify(details)]
            );
        } else {
            Logger.error(`[Repo] Failed to create/find user for growth history: ${username}`);
        }
    }

    async getGrowthHistory(username: string): Promise<any[]> {
        const db = await DB.getInstance();
        const user = await this.getUser(username);

        if (!user || !user.id) return [];

        const history = await db.all(
            'SELECT date, metric, value, details FROM growth_history WHERE user_id = ? ORDER BY date ASC',
            [user.id]
        );

        return history.map(h => ({
            ...h,
            details: JSON.parse(h.details || '{}')
        }));
    }

    async touchUser(username: string): Promise<void> {
        const db = await DB.getInstance();
        await db.run('UPDATE users SET last_active = ? WHERE username = ?', [new Date().toISOString(), username]);
    }
    async getProjects(username: string): Promise<any[]> {
        const db = await DB.getInstance();
        const user = await this.getUser(username);
        if (!user || !user.id) return [];

        // Fetch completed projects AND technical assessments
        const results = await db.all(
            `SELECT date, metric, value, details FROM growth_history 
             WHERE user_id = ? AND metric IN('project_completed', 'interview_score') 
             ORDER BY date DESC`,
            [user.id]
        );

        return results.map(r => {
            const details = JSON.parse(r.details || '{}');
            if (r.metric === 'interview_score') {
                return {
                    name: details.name || 'Technical Interrogation',
                    description: details.description || `Scored ${r.value}% in a technical interrogation session.`,
                    completedAt: r.date,
                    score: r.value,
                    type: 'ASSESSMENT'
                };
            }
            return {
                ...details,
                completedAt: r.date,
                score: r.value,
                type: 'PROJECT'
            };
        });
    }

    async getGitHubProjects(username: string): Promise<any[]> {
        const db = await DB.getInstance();
        const user = await this.getUser(username);
        if (!user || !user.id) return [];

        const projects = await db.all(
            `SELECT * FROM projects WHERE user_id = ? AND status IN ('IMPORTED', 'ACCEPTED') ORDER BY started_at DESC`,
            [user.id]
        );

        return projects.map(p => ({
            name: p.title,
            description: p.description,
            techStack: JSON.parse(p.tech_stack || '[]'),
            ...JSON.parse(p.roadmap || '{}') // details stored here
        }));
    }

    async getNextAction(username: string): Promise<any> {
        const user = await this.getUser(username);
        if (!user) return null;

        const skillsCount = Object.keys(user.skills).length;
        if (skillsCount === 0) {
            return {
                type: 'VERIFY_RESUME',
                label: 'Verify Resume',
                description: 'Upload your resume to extract skills and verify claims.',
                link: '/verify'
            };
        }

        const growth = await this.getGrowthHistory(username);
        const lastInterview = growth.filter(g => g.metric === 'interview_score').pop();

        if (!lastInterview) {
            return {
                type: 'INTERVIEW',
                label: 'Take First Interview',
                description: 'Baseline your skills with an AI interview.',
                link: '/interview'
            };
        }

        return {
            type: 'PROJECT',
            label: 'Start New Project',
            description: 'Apply your skills in a generated project challenge.',
            link: '/coaching'
        };
    }

    // --- New Methods for Project/Coaching ---

    async getProfile(username: string): Promise<UserProfile | null> {
        return this.getUser(username);
    }

    async addProject(username: string, project: any): Promise<number | null> {
        const db = await DB.getInstance();
        const user = await this.getUser(username);
        if (!user || !user.id) return null;

        const result = await db.run(
            `INSERT INTO projects(user_id, title, description, status, tech_stack, started_at, roadmap)
VALUES(?, ?, ?, ?, ?, ?, ?)`,
            [
                user.id,
                project.name || project.title,
                project.description,
                project.status || 'ACCEPTED',
                JSON.stringify(project.techStack || []),
                project.startedAt || new Date().toISOString(),
                JSON.stringify(project.roadmap || {})
            ]
        );
        return result.lastID || null;
    }

    async importProject(username: string, project: any): Promise<void> {
        const db = await DB.getInstance();
        const user = await this.getUser(username);
        if (!user || !user.id) return;

        // Check if exists to avoid duplicates (based on title/name)
        const existing = await db.get(
            `SELECT id FROM projects WHERE user_id = ? AND title = ? `,
            [user.id, project.name]
        );

        const techStack = JSON.stringify(project.techStack || []);
        const details = JSON.stringify({
            learnedSkills: project.learnedSkills || [],
            complexity: project.complexity,
            architecture: project.architecture,
            stars: project.stars
        });

        if (existing) {
            // Update existing
            await db.run(
                `UPDATE projects SET description = ?, tech_stack = ?, roadmap = ? WHERE id = ? `,
                [project.description, techStack, details, existing.id]
            );
            Logger.info(`[Repo] Updated imported project: ${project.name} `);
        } else {
            // Insert new
            await db.run(
                `INSERT INTO projects (user_id, title, description, status, tech_stack, started_at, roadmap)
                 VALUES (?, ?, ?, 'IMPORTED', ?, ?, ?)`,
                [
                    user.id,
                    project.name,
                    project.description,
                    techStack,
                    project.createdAt || new Date().toISOString(),
                    details
                ]
            );
            Logger.info(`[Repo] Imported project: ${project.name}`);
        }
    }

    async getInterviewHistory(username: string): Promise<any[]> {
        const db = await DB.getInstance();
        const user = await this.getUser(username);
        if (!user || !user.id) return [];

        // Fetch detailed interview logs from growth_history
        const history = await db.all(
            `SELECT date, value, details FROM growth_history 
             WHERE user_id = ? AND metric = 'interview_score' 
             ORDER BY date DESC`,
            [user.id]
        );

        return history.map(h => ({
            date: h.date,
            score: h.value,
            ...JSON.parse(h.details || '{}')
        }));
    }

    async getActiveChallenges(username: string): Promise<any[]> {
        const db = await DB.getInstance();
        const user = await this.getUser(username);
        if (!user || !user.id) return [];

        // Fetch active "GapCrusher" challenges (status = STARTED)
        const projects = await db.all(
            `SELECT * FROM projects WHERE user_id = ? AND status = 'STARTED' ORDER BY started_at DESC`,
            [user.id]
        );

        return projects.map(p => ({
            id: p.id,
            name: p.title,
            description: p.description,
            techStack: JSON.parse(p.tech_stack || '[]'),
            startedAt: p.started_at,
            roadmap: JSON.parse(p.roadmap || '{}')
        }));
    }

    async updateProjectRoadmap(projectId: number, roadmap: any): Promise<void> {
        const db = await DB.getInstance();
        await db.run(
            'UPDATE projects SET roadmap = ? WHERE id = ?',
            [JSON.stringify(roadmap), projectId]
        );
    }

    async completeProject(username: string, projectId: number): Promise<void> {
        const db = await DB.getInstance();
        const user = await this.getUser(username);
        if (!user || !user.id) return;

        // Verify ownership
        const project = await db.get('SELECT id FROM projects WHERE id = ? AND user_id = ?', [projectId, user.id]);
        if (!project) throw new Error("Project not found or not owned by user");

        await db.run(
            "UPDATE projects SET status = 'COMPLETED', value = 100 WHERE id = ?",
            [projectId]
        );

        // Log completion in growth history
        await this.updateGrowthHistory(username, 'project_completed', 100, { projectId });
    }

    async getProject(username: string, projectName: string): Promise<any> {
        const db = await DB.getInstance();
        const user = await this.getUser(username);
        if (!user || !user.id) return null;

        return db.get(
            `SELECT * FROM projects WHERE user_id = ? AND title = ?`,
            [user.id, projectName]
        );
    }

    async saveProjectAnalysis(username: string, projectName: string, analysisType: string, data: any): Promise<void> {
        const db = await DB.getInstance();
        const project = await this.getProject(username, projectName);

        if (project) {
            // Merge into existing roadmap
            const roadmap = JSON.parse(project.roadmap || '{}');
            roadmap[analysisType] = data;

            await db.run(
                'UPDATE projects SET roadmap = ? WHERE id = ?',
                [JSON.stringify(roadmap), project.id]
            );
            Logger.info(`[Repo] Saved ${analysisType} for ${projectName}`);
        } else {
            // Create mostly empty project if not exists
            const user = await this.getUser(username);
            if (!user || !user.id) return;

            const roadmap = { [analysisType]: data };

            await db.run(
                `INSERT INTO projects(user_id, title, description, status, tech_stack, started_at, roadmap)
                 VALUES(?, ?, ?, ?, ?, ?, ?)`,
                [
                    user.id,
                    projectName,
                    'Auto-created during analysis',
                    'IMPORTED',
                    '[]',
                    new Date().toISOString(),
                    JSON.stringify(roadmap)
                ]
            );
            Logger.info(`[Repo] Created project ${projectName} with ${analysisType}`);
        }
    }

    async saveResumeData(username: string, data: any): Promise<void> {
        const db = await DB.getInstance();
        const id = `resume_${username}`;
        await db.run(
            `INSERT INTO analysis_reports (id, username, timestamp, report_data, status)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET 
                report_data = excluded.report_data,
                timestamp = excluded.timestamp`,
            [id, username, new Date().toISOString(), JSON.stringify(data), 'completed']
        );
        Logger.info(`[Repo] Saved resume data for ${username}`);
    }

    async getResumeData(username: string): Promise<any | null> {
        const db = await DB.getInstance();
        const row = await db.get(
            `SELECT report_data FROM analysis_reports WHERE id = ? AND username = ?`,
            [`resume_${username}`, username]
        );
        if (row && row.report_data) {
            return JSON.parse(row.report_data);
        }
        return null;
    }

    async saveCandidateIntelligence(username: string, data: any): Promise<void> {
        const db = await DB.getInstance();
        const id = `intelligence_${username}`;
        await db.run(
            `INSERT INTO analysis_reports (id, username, timestamp, report_data, status)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET 
                report_data = excluded.report_data,
                timestamp = excluded.timestamp`,
            [id, username, new Date().toISOString(), JSON.stringify(data), 'completed']
        );
        Logger.info(`[Repo] Saved Candidate Intelligence for ${username}`);
    }

    async getCandidateIntelligence(username: string): Promise<any | null> {
        const db = await DB.getInstance();
        const row = await db.get(
            `SELECT report_data FROM analysis_reports WHERE id = ? AND username = ?`,
            [`intelligence_${username}`, username]
        );
        if (row && row.report_data) {
            return JSON.parse(row.report_data);
        }
        return null;
    }
}
